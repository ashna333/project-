from django.contrib.auth import authenticate,get_user_model
from .utils import get_user_tokens
import uuid
from django.core.mail import send_mail        # 👈 add this
from django.conf import settings 
from datetime import date, timedelta
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
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


def build_google_auth_url():
    query = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    })
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"


def login_with_google_code(code):
    token_data = _google_exchange_code_for_tokens(code)
    id_token = token_data.get("id_token")
    if not id_token:
        raise ValueError("Google login failed: missing id_token.")

    user_info = _google_fetch_userinfo(token_data["access_token"])
    email = (user_info.get("email") or "").strip().lower()
    if not email:
        raise ValueError("Google account did not return an email address.")

    user = _get_or_create_google_user(user_info)
    tokens = get_user_tokens(user)
    return {"user": user, "tokens": tokens}
   

def change_user_password(user,old_password,new_password):
    if not user.check_password(old_password):
        return False
    
    user.set_password(new_password)
    user.save()
    return True


def _google_exchange_code_for_tokens(code):
    payload = urlencode({
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }).encode("utf-8")

    request = Request(
        "https://oauth2.googleapis.com/token",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise ValueError("Google token exchange failed.") from error


def _google_fetch_userinfo(access_token):
    request = Request(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise ValueError("Failed to fetch Google profile.") from error


def _get_or_create_google_user(user_info):
    email = user_info["email"].strip().lower()
    user = User.objects.filter(email=email).first()
    if user:
        if not user.first_name:
            user.first_name = user_info.get("given_name") or email.split("@")[0][:50]
        if not user.last_name:
            user.last_name = user_info.get("family_name") or "Google"
        user.auth_provider = "google"
        user.save(update_fields=["first_name", "last_name", "auth_provider"])
        return user

    default_dob = date.today() - timedelta(days=365 * 18)
    user = User.objects.create_user(
        email=email,
        first_name=(user_info.get("given_name") or email.split("@")[0])[:50],
        last_name=(user_info.get("family_name") or "Google User")[:50],
        dob=default_dob,
        password=uuid.uuid4().hex,
        auth_provider="google",
    )
    return user


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


def list_user_trash(user, search=None):
    qs = UserFile.objects.filter(user=user, is_deleted=True)
    if search:
        qs = qs.filter(original_name__icontains=search)
    return qs.order_by("-deleted_at", "-uploaded_at")



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


def restore_user_file(user, file_id):
    try:
        user_file = UserFile.objects.get(id=file_id, user=user, is_deleted=True)
        user_file.is_deleted = False
        user_file.deleted_at = None
        user_file.save(update_fields=["is_deleted", "deleted_at"])
        return user_file
    except UserFile.DoesNotExist:
        return None


def permanently_delete_user_file(user, file_id):
    try:
        user_file = UserFile.objects.get(id=file_id, user=user, is_deleted=True)
        user_file.delete()
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


from django.db import transaction
from datetime import timedelta
from django.core.mail import send_mail
from .models import FileShare, UserFile


def create_file_share(*, owner, file_id, recipient_email, expires_in_hours, message, request=None):
    """
    Create a public share link for a user's own file and email it to recipient.
    Returns the created FileShare instance and the share URL (string).
    """
    try:
        user_file = UserFile.objects.get(id=file_id, user=owner, is_deleted=False)
    except UserFile.DoesNotExist:
        return None, None

    expires_at = timezone.now() + timedelta(hours=expires_in_hours)

    with transaction.atomic():
        share = FileShare.objects.create(
            owner=owner,
            user_file=user_file,
            recipient_email=recipient_email,
            message=message,
            expires_at=expires_at,
        )

    share_url = None
    if request is not None:
        share_url = request.build_absolute_uri(f"/api/public/shares/{share.token}/")

    _send_file_share_email(
        owner_email=getattr(owner, "email", ""),
        recipient_email=recipient_email,
        message=message,
        share_url=share_url or f"/api/public/shares/{share.token}/",
        expires_at=expires_at,
    )

    return share, share_url


def list_user_shares(user, search=None):
    qs = FileShare.objects.select_related("user_file").filter(owner=user)
    if search:
        qs = qs.filter(user_file__original_name__icontains=search)
    return qs


def get_valid_share_by_token(token):
    """
    Return FileShare if it exists and is not expired and file not deleted.
    """
    try:
        share = FileShare.objects.select_related("user_file", "owner").get(token=token)
    except FileShare.DoesNotExist:
        return None

    if share.user_file.is_deleted:
        return None

    if share.is_expired:
        return None

    return share


def mark_share_accessed(share):
    if share.accessed_at is None:
        share.accessed_at = timezone.now()
        share.save(update_fields=["accessed_at"])


def _send_file_share_email(*, owner_email, recipient_email, message, share_url, expires_at):
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    subject = "File shared with you"
    body = (
        f"You have received a file share link from {owner_email or 'a user'}.\n\n"
        f"Message:\n{message}\n\n"
        f"Link: {share_url}\n"
        f"Expires at: {expires_at.isoformat()}\n"
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=from_email,
        recipient_list=[recipient_email],
        fail_silently=True,
    )