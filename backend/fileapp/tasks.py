# your_app_name/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import UserFile

@shared_task
def purge_expired_trash():
    """
    Finds files marked as deleted more than 30 days ago 
    and removes them from the DB and the physical storage.
    """
    # Calculate 30 days ago
    cutoff_date = timezone.now() - timedelta(days=1)
    
    # Filter files: must be in trash AND deleted_at must be older than 30 days
    expired_files = UserFile.objects.filter(
        is_deleted=True, 
        deleted_at__lte=cutoff_date
    )
    
    count = expired_files.count()
    
    for user_file in expired_files:
        # This calls your model's delete() which handles os.remove()
        user_file.delete() 
        
    return f"Purged {count} expired files from trash."