# your_app_name/tasks.py
from celery import shared_task


@shared_task(name='fileapp.tasks.purge_expired_records')
def purge_expired_records():
    # Import what we need inside the task to avoid circular imports
    from django.db.models import Q
    from django.utils import timezone
    from datetime import timedelta
    from .models import FileShare, UserFile

    now = timezone.now()
    
    # 1. Purge FileShare records
    # Logic: Delete if (it is expired) OR (it is revoked)
    # We use a 1-minute grace period for testing so you can see it happen
    link_cutoff = now - timedelta(days=7) 
    
    deleted_links, _ = FileShare.objects.filter(
        Q(expires_at__lte=now) | Q(is_revoked=True),
        created_at__lte=link_cutoff
    ).delete()

    # 2. Purge trashed files (older than 30 days for testing)
    file_cutoff = now - timedelta(days=30)
    expired_files = UserFile.objects.filter(is_deleted=True, deleted_at__lte=file_cutoff)
    
    file_count = expired_files.count()
    for f in expired_files:
        # We loop and call delete() so that if you have custom logic 
        # (like deleting the actual file from disk), it runs.
        f.delete() 

    return f"Purged {deleted_links} shares and {file_count} files."


@shared_task(name='fileapp.tasks.send_weekly_space_digest')
def send_weekly_space_digest():
    """
    Weekly email digest per user:
    - new file versions uploaded in the last 7 days
    - open tasks (todo + in_progress)
    - unresolved threads
    Honors SpaceMember.mute_weekly_digest.
    """
    from django.contrib.auth import get_user_model
    from django.conf import settings
    from django.core.mail import send_mail
    from django.db.models import Q
    from django.utils import timezone
    from datetime import timedelta

    from .models import SpaceMember, SpaceFileVersion, SpaceTask, SpaceThread, SpaceFile

    User = get_user_model()
    now = timezone.now()
    cutoff = now - timedelta(days=7)

    user_ids = (
      SpaceMember.objects.filter(mute_weekly_digest=False)
      .values_list("user_id", flat=True)
      .distinct()
    )

    for uid in user_ids:
      user = User.objects.filter(id=uid).first()
      if not user or not getattr(user, "email", None):
        continue

      memberships = SpaceMember.objects.filter(user_id=uid, mute_weekly_digest=False).select_related("space")
      if not memberships.exists():
        continue

      lines = []
      spaces_used = set()

      for m in memberships:
        space = m.space
        spaces_used.add(space.id)

        upload_versions_count = SpaceFileVersion.objects.filter(
          space_file__space=space,
          created_at__gte=cutoff,
        ).count()

        open_tasks_count = SpaceTask.objects.filter(
          space=space
        ).exclude(status=SpaceTask.STATUS_DONE).count()

        unresolved_threads_count = SpaceThread.objects.filter(
          space=space,
          is_resolved=False,
        ).count()

        if upload_versions_count == 0 and open_tasks_count == 0 and unresolved_threads_count == 0:
          continue

        lines.append(
          f"- {space.name}: {upload_versions_count} new file version(s), "
          f"{open_tasks_count} open task(s), {unresolved_threads_count} unresolved thread(s)."
        )

      if not lines:
        continue

      subject = f"CloudShare weekly Space digest ({now.strftime('%Y-%m-%d')})"
      body = "Here is your weekly update from CloudShare:\n\n" + "\n".join(lines) + "\n\n" + (
        "Tip: open your Spaces to view tasks and resolve threads."
      )

      # If no SMTP configured, this will still hit the console backend.
      send_mail(
        subject=subject,
        message=body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cloudshare.local"),
        recipient_list=[user.email],
        fail_silently=False,
      )

    return f"Weekly digest sent to {len(user_ids)} user(s)."