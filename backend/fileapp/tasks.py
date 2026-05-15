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