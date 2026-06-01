from celery import shared_task


@shared_task(name='fileapp.tasks.purge_expired_records')
def purge_expired_records():
    from django.db.models import Q, F
    from django.utils import timezone
    from datetime import timedelta
    from .models import FileShare, PrivateShare, PrivateShareRecipient, UserFile
    import logging

    logger = logging.getLogger(__name__)
    now = timezone.now()
    cutoff = now - timedelta(days=90)  # change to days=30 in production

    # 1. Public shares — delete expired/revoked after cutoff
    deleted_public, _ = FileShare.objects.filter(
        Q(expires_at__lte=cutoff) | Q(is_revoked=True),
        created_at__lte=cutoff,
    ).delete()

    # 2. Private share recipient grants — delete if:
    #    - share expired > cutoff ago
    #    - individually expired > cutoff ago
    #    - revoked > cutoff ago
    #    - one-time access already used > cutoff ago
    #    - max downloads reached > cutoff ago
    deleted_grants, _ = PrivateShareRecipient.objects.filter(
        Q(
            private_share__expires_at__isnull=False,
            private_share__expires_at__lte=cutoff,
        ) |
        Q(
            individual_expires_at__isnull=False,
            individual_expires_at__lte=cutoff,
        ) |
        Q(is_revoked=True, revoked_at__lte=cutoff) |
        Q(
            # one-time access share used, share was created before cutoff
            private_share__one_time_access=True,
            private_share__download_count__gte=1,
            private_share__created_at__lte=cutoff,
        ) |
        Q(
            # share-level max downloads reached
            private_share__max_downloads__isnull=False,
            private_share__download_count__gte=F('private_share__max_downloads'),
            private_share__created_at__lte=cutoff,
        ) |
        Q(
            # recipient-level max downloads reached
            max_downloads__isnull=False,
            download_count__gte=F('max_downloads'),
            created_at__lte=cutoff,
        )
    ).delete()

    # 3. Private shares with no recipients left — delete if expired/revoked/one-time-used
    deleted_private, _ = PrivateShare.objects.filter(
        Q(expires_at__isnull=False, expires_at__lte=cutoff) |
        Q(is_revoked=True, revoked_at__lte=cutoff) |
        Q(one_time_access=True, download_count__gte=1, created_at__lte=cutoff) |
        Q(
            max_downloads__isnull=False,
            download_count__gte=F('max_downloads'),
            created_at__lte=cutoff,
        ),
        recipients__isnull=True,
    ).delete()

    # 4. Trashed files — permanently delete after cutoff if no active shares
    expired_files = UserFile.objects.filter(
        is_deleted=True,
        deleted_at__lte=cutoff,
    )
    file_count = 0
    for f in expired_files:
        active_shares = PrivateShareRecipient.objects.filter(
            private_share__user_file=f,
            private_share__is_revoked=False,
            is_revoked=False,
        ).filter(
            Q(private_share__expires_at__isnull=True) |
            Q(private_share__expires_at__gt=now)
        ).filter(
            Q(individual_expires_at__isnull=True) |
            Q(individual_expires_at__gt=now)
        ).exclude(
            private_share__one_time_access=True,
            private_share__download_count__gte=1,
        ).exclude(
            private_share__max_downloads__isnull=False,
            private_share__download_count__gte=F('private_share__max_downloads'),
        )
        if not active_shares.exists():
            f.delete()
            file_count += 1

    logger.info(
        f'[purge_expired_records] public={deleted_public}, '
        f'grants={deleted_grants}, private={deleted_private}, files={file_count}'
    )

    return (
        f"Purged {deleted_public} public shares, "
        f"{deleted_grants} recipient grants, "
        f"{deleted_private} private shares, "
        f"and {file_count} trashed files."
    )