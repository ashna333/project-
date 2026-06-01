"""
storage_service.py  —  drop into your existing app alongside service.py
Uses your existing UserFile model (file_hash, file_size, original_name, etc.)
"""

import os
import hashlib
from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone

from .models import UserFile

LARGE_FILE_THRESHOLD_BYTES = 60 * 1024 * 1024   # 60 MB
STALE_DAYS = 90                                   # files older than 90 days
DEFAULT_QUOTA_BYTES = 1 * 1024 * 1024 * 1024     # 1 GB — adjust or pull from user profile


# ─── Hashing ─────────────────────────────────────────────────────────────────

def compute_sha256(file_path: str, chunk_size: int = 65536) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as fh:
        while chunk := fh.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()


def backfill_missing_hashes(user):
    """
    Compute and save file_hash for any UserFile that is missing it.
    Call this lazily from the storage summary endpoint if needed.
    """
    qs = UserFile.objects.filter(user=user, is_deleted=False, file_hash__isnull=True)
    updated = 0
    for uf in qs:
        try:
            if uf.file and os.path.isfile(uf.file.path):
                uf.file_hash = compute_sha256(uf.file.path)
                uf.save(update_fields=["file_hash"])
                updated += 1
        except Exception:
            pass
    return updated


# ─── Duplicate detection ──────────────────────────────────────────────────────

def get_duplicate_groups(user) -> list[dict]:
    """
    Return groups of files sharing the same SHA-256 hash.
    Each group dict is ready to serialize directly.
    Sorted by recoverable_size descending.
    """
    dup_hashes = (
        UserFile.objects.filter(user=user, is_deleted=False)
        .exclude(file_hash__isnull=True)
        .exclude(file_hash="")
        .values("file_hash")
        .annotate(count=Count("id"))
        .filter(count__gt=1)
        .values_list("file_hash", flat=True)
    )

    groups = []
    for fhash in dup_hashes:
        files = list(
            UserFile.objects.filter(
                user=user, file_hash=fhash, is_deleted=False
            ).order_by("uploaded_at")  # oldest = original
        )
        if len(files) < 2:
            continue

        total_size = sum(f.file_size for f in files)
        recoverable = total_size - files[0].file_size  # keep original, delete rest

        groups.append(
            {
                "file_hash": fhash,
                "total_size": total_size,
                "recoverable_size": recoverable,
                "count": len(files),
                "files": files,
            }
        )

    groups.sort(key=lambda g: g["recoverable_size"], reverse=True)
    return groups


def delete_duplicate_extras(user, file_hash: str) -> dict:
    """Keep the oldest file for this hash, permanently delete the rest from disk + DB."""
    files = list(
        UserFile.objects.filter(
            user=user, file_hash=file_hash, is_deleted=False
        ).order_by("uploaded_at")
    )
    if len(files) <= 1:
        return {"deleted": 0, "failed": 0, "freed_bytes": 0}

    extras = files[1:]
    return _bulk_delete(extras)


# ─── Large files ──────────────────────────────────────────────────────────────

def get_large_files(user, threshold_bytes: int = LARGE_FILE_THRESHOLD_BYTES):
    return UserFile.objects.filter(
        user=user, is_deleted=False, file_size__gte=threshold_bytes
    ).order_by("-file_size")


# ─── Stale files ──────────────────────────────────────────────────────────────

# ✅ Fixed — actually filters by age
def get_stale_downloads(user, days: int = STALE_DAYS):
    cutoff = timezone.now() - timedelta(days=days)
    return (
        UserFile.objects.filter(
            user=user,
            is_deleted=False,
            is_starred=False,
            uploaded_at__lte=cutoff,   # ← this was the missing line
        ).order_by("-file_size")
    )


# ─── Storage summary ──────────────────────────────────────────────────────────

def get_storage_manager_summary(user) -> dict:
    qs = UserFile.objects.filter(user=user, is_deleted=False)
    used_bytes = qs.aggregate(total=Sum("file_size"))["total"] or 0

    dup_groups = get_duplicate_groups(user)
    recoverable_dup = sum(g["recoverable_size"] for g in dup_groups)

    large_count = get_large_files(user).count()
    stale_count = get_stale_downloads(user).count()

    # recoverable_bytes = duplicates only.
    # Large + stale are opt-in; their bytes are added on the frontend
    # only when the user explicitly selects them.
    return {
        "total_bytes": DEFAULT_QUOTA_BYTES,
        "used_bytes": used_bytes,
        "used_percent": round(used_bytes / DEFAULT_QUOTA_BYTES * 100, 1),
        "recoverable_bytes": recoverable_dup,
        "duplicate_groups": len(dup_groups),
        "large_file_count": large_count,
        "stale_download_count": stale_count,
    }


# ─── Deletion helpers ─────────────────────────────────────────────────────────

def delete_files_by_ids(user, file_ids: list[int]) -> dict:
    """Hard-delete files from disk + DB (not soft-delete)."""
    files = UserFile.objects.filter(user=user, id__in=file_ids, is_deleted=False)
    return _bulk_delete(list(files))


def clean_all_suggestions(user) -> dict:
    """Delete all duplicate extras + all stale files."""
    dup_groups = get_duplicate_groups(user)
    extras = []
    for g in dup_groups:
        files = list(
            UserFile.objects.filter(
                user=user, file_hash=g["file_hash"], is_deleted=False
            ).order_by("uploaded_at")
        )
        extras.extend(files[1:])

    stale = list(get_stale_downloads(user))
    all_files = list({f.id: f for f in extras + stale}.values())  # deduplicate
    return _bulk_delete(all_files)


def _bulk_delete(files: list) -> dict:
    deleted, failed, freed = 0, 0, 0
    for f in files:
        try:
            freed += f.file_size
            f.delete()
            deleted += 1
        except Exception:
            failed += 1
    return {"deleted": deleted, "failed": failed, "freed_bytes": freed}