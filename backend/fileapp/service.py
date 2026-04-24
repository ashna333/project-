from django.contrib.auth import authenticate,get_user_model
from .utils import get_user_tokens
import uuid
from django.core.mail import send_mail        # 👈 add this
from django.conf import settings 
User= get_user_model()

from django.utils import timezone


def register_user(data):
    user = User.objects.create_user(
        email=data.get("email"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        dob=data.get("dob"),
        password=data.get("password")
    )

    return user


def login_user(email,password):
   user = authenticate(username=email,password=password)

   if not user:
       return None
   
   tokens = get_user_tokens(user)
   
   return {
       "user": user,
       "tokens":tokens
    }
   

def change_user_password(user,old_password,new_password):
    if not user.check_password(old_password):
        return False
    
    user.set_password(new_password)
    user.save()
    return True


def send_password_reset_email(email):
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return True

    token = str(uuid.uuid4())

    user.reset_token = token
    user.save()

    reset_link = f"{settings.FRONTEND_URL}/reset-password/?token={token}"

    send_mail(
        subject="Password Reset Request",
        message=(
            f"Hi {user.first_name},\n\n"
            f"Click the link below to reset your password:\n{reset_link}\n\n"
            f"If you did not request this, please ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )

    return True


def reset_user_password(token, new_password):
    try:
        user = User.objects.get(reset_token=token)
    except User.DoesNotExist:
        return False

    user.set_password(new_password)
    user.reset_token = None   # clear token after use — one time use only
    user.save()
    return True

import mimetypes
from django.db.models import Sum, Q
from .models import UserFile


def get_user_storage_usage(user):
    """Return total bytes used by the user."""
    result = UserFile.objects.filter(user=user).aggregate(total=Sum("file_size"))
    return result["total"] or 0


def upload_files(user, files):
    """
    Save a list of InMemoryUploadedFile objects for a user.
    Returns list of created UserFile instances.
    """
    created = []
    for f in files:
        mime_type, _ = mimetypes.guess_type(f.name)
        user_file = UserFile.objects.create(
            user=user,
            file=f,
            original_name=f.name,
            file_size=f.size,
            mime_type=mime_type or "application/octet-stream",
        )
        created.append(user_file)
    return created


def list_user_files(user, search=None):
    qs = UserFile.objects.filter(user=user, is_deleted=False)  # 👈 add is_deleted=False
    if search:
        qs = qs.filter(original_name__icontains=search)
    return qs



def rename_user_file(user, file_id, new_name):
    try:
        user_file = UserFile.objects.get(id=file_id, user=user, is_deleted=False)
        user_file.original_name = new_name
        user_file.save()
        return user_file
    except UserFile.DoesNotExist:
        return None

def delete_user_file(user, file_id):
    try:
        user_file = UserFile.objects.get(id=file_id, user=user, is_deleted=False)
        user_file.is_deleted = True
        user_file.deleted_at = timezone.now()
        user_file.save()
        return True
    except UserFile.DoesNotExist:
        return False


def get_user_file(user, file_id):
    try:
        return UserFile.objects.get(id=file_id, user=user, is_deleted=False)  # 👈
    except UserFile.DoesNotExist:
        return None


def get_storage_summary(user):
    MAX_STORAGE = 1 * 1024 * 1024 * 1024
    used = UserFile.objects.filter(user=user, is_deleted=False).aggregate(  # 👈
        total=Sum("file_size"))["total"] or 0
    return {
        "used_bytes": used,
        "max_bytes": MAX_STORAGE,
        "used_percent": round((used / MAX_STORAGE) * 100, 2),
        "remaining_bytes": MAX_STORAGE - used,
    }





import hashlib
import mimetypes
from django.db.models import Sum
from django.utils import timezone
from .models import UserFile


def get_file_hash(file):
    md5 = hashlib.md5()
    for chunk in file.chunks():
        md5.update(chunk)
    return md5.hexdigest()


def upload_files(user, files):
    created = []
    skipped = []

    for f in files:
        file_hash = get_file_hash(f)

        # Check if same file already exists for this user
        if UserFile.objects.filter(user=user, file_hash=file_hash, is_deleted=False).exists():
            skipped.append(f.name)  # track skipped duplicates
            continue

        mime_type, _ = mimetypes.guess_type(f.name)
        user_file = UserFile.objects.create(
            user=user,
            file=f,
            original_name=f.name,
            file_size=f.size,
            mime_type=mime_type or "application/octet-stream",
            file_hash=file_hash,  # 👈 save the hash
        )
        created.append(user_file)

    return created, skipped  # 👈 now returns both