from django.contrib.auth import authenticate,get_user_model
from .utils import get_user_tokens
import uuid
import os
from django.core.mail import send_mail        # 👈 add this
from django.conf import settings 
from datetime import date, timedelta
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import hashlib
from django.utils import timezone

User= get_user_model()

def register_user(data):
    email = (data.get("email") or "").strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        raise ValueError("A user with this email is already registered.")

    user = User.objects.create_user(
        email=email,
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        dob=data.get("dob"),
        password=data.get("password"),
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
        return False, "Invalid or expired token"

    if user.check_password(new_password):
        return False, "New password cannot be the same as old password"

    user.set_password(new_password)
    user.reset_token = None
    user.save()

    return True, "Password reset successful"

import mimetypes
from django.db.models import Sum, Q
from .models import UserFile


def get_user_storage_usage(user):
    """Return total bytes used by the user."""
    result = UserFile.objects.filter(user=user).aggregate(total=Sum("file_size"))
    return result["total"] or 0


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


# service.py

def toggle_file_star(user, file_id):
    """
    Toggles the is_starred status of a file.
    Returns the file object if successful, None otherwise.
    """
    try:
        user_file = UserFile.objects.get(id=file_id, user=user, is_deleted=False)
        user_file.is_starred = not user_file.is_starred
        user_file.save()
        return user_file
    except UserFile.DoesNotExist:
        return None

def restore_all_user_trash(user):
    """
    Restores all files from trash for a specific user.
    """
    trashed_files = UserFile.objects.filter(user=user, is_deleted=True)
    count = trashed_files.count()
    if count > 0:
        trashed_files.update(is_deleted=False)
    return count

def empty_user_trash(user):
    """
    Permanently deletes all files in trash (Disk + DB).
    """
    trashed_files = UserFile.objects.filter(user=user, is_deleted=True)
    count = trashed_files.count()
    for user_file in trashed_files:
        if user_file.file:
            user_file.file.delete(save=False)
        user_file.delete()
    return count




import hashlib
import mimetypes
from django.db.models import Sum
from django.utils import timezone
from .models import UserFile


def get_file_hash(file):
    md5 = hashlib.md5()
    for chunk in file.chunks():
        md5.update(chunk)
    file.seek(0)
    return md5.hexdigest()


def _unique_copy_name(user, name):
    base, ext = os.path.splitext(name)
    candidate = f"{base} (copy){ext}"
    counter = 2
    while UserFile.objects.filter(user=user, original_name=candidate, is_deleted=False).exists():
        candidate = f"{base} (copy {counter}){ext}"
        counter += 1
    return candidate


def check_upload_conflicts(user, files):
    """Return list of files that conflict with existing active uploads."""
    conflicts = []
    for f in files:
        file_hash = get_file_hash(f)
        existing = UserFile.objects.filter(
            user=user, file_hash=file_hash, is_deleted=False
        ).first()
        if existing:
            conflicts.append({
                "name": f.name,
                "hash": file_hash,
                "existing_file_id": existing.id,
                "existing_name": existing.original_name,
                "existing_size": existing.file_size,
                "uploaded_at": existing.uploaded_at.isoformat(),
            })
    return conflicts


def upload_files(user, files, resolutions=None):
    """
    Upload files with optional per-file resolution for duplicates.
    resolutions: dict mapping filename -> 'replace' | 'keep_both' | 'discard'
    """
    import os as _os

    resolutions = resolutions or {}
    created = []
    skipped = []

    for f in files:
        file_hash = get_file_hash(f)
        existing = UserFile.objects.filter(
            user=user, file_hash=file_hash, is_deleted=False
        ).first()
        resolution = resolutions.get(f.name, "discard" if existing else "upload")

        if existing:
            if resolution == "replace":
                if existing.file and _os.path.isfile(existing.file.path):
                    _os.remove(existing.file.path)
                mime_type, _ = mimetypes.guess_type(f.name)
                existing.file = f
                existing.original_name = f.name
                existing.file_size = f.size
                existing.mime_type = mime_type or "application/octet-stream"
                existing.file_hash = file_hash
                existing.save()
                created.append(existing)
                continue
            if resolution == "keep_both":
                new_name = _unique_copy_name(user, f.name)
                mime_type, _ = mimetypes.guess_type(f.name)
                user_file = UserFile.objects.create(
                    user=user,
                    file=f,
                    original_name=new_name,
                    file_size=f.size,
                    mime_type=mime_type or "application/octet-stream",
                    file_hash=file_hash,
                )
                created.append(user_file)
                continue
            skipped.append({
                "name": f.name,
                "reason": "discarded",
                "existing_file_id": existing.id,
                "existing_name": existing.original_name,
            })
            continue

        mime_type, _ = mimetypes.guess_type(f.name)
        user_file = UserFile.objects.create(
            user=user,
            file=f,
            original_name=f.name,
            file_size=f.size,
            mime_type=mime_type or "application/octet-stream",
            file_hash=file_hash,
        )
        created.append(user_file)

    return created, skipped


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
        share_url = f"{settings.FRONTEND_APP_URL}/s/{share.token}/"


    print("FRONTEND_APP_URL:", settings.FRONTEND_APP_URL)   # 👈 ADD
    print("GENERATED SHARE URL:", share_url)      

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


def _send_app_email(*, subject, body, recipient_list):
    """Send email via configured backend (SMTP, file+console in dev, etc.)."""
    import logging
    logger = logging.getLogger(__name__)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@cloudshare.local"
    recipients = [r.strip().lower() for r in recipient_list if r and str(r).strip()]
    if not recipients:
        return False
    try:
        sent = send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=recipients,
            fail_silently=False,
        )
        if sent:
            logger.info("Email sent to %s: %s", recipients, subject)
            return True
        logger.warning("send_mail returned 0 for %s", recipients)
        return False
    except Exception as exc:
        logger.exception("Email send failed: %s", exc)
        return False


def _send_file_share_email(*, owner_email, recipient_email, message, share_url, expires_at):
    body = (
        f"You have received a file share link from {owner_email or 'a user'}.\n\n"
        f"Message:\n{message}\n\n"
        f"Link: {share_url}\n"
        f"Expires at: {expires_at.isoformat()}\n"
    )
    _send_app_email(
        subject="File shared with you",
        body=body,
        recipient_list=[recipient_email],
    )


# ─── Private file sharing ───────────────────────────────────────────────────

from django.contrib.auth.hashers import make_password, check_password
from .models import (
    PrivateShare,
    PrivateShareRecipient,
    ShareAccessLog,
    ShareComment,
    FileVersion,
)


def _log_share_access(share, actor, action, request=None, metadata=None):
    ip = None
    ua = ""
    if request:
        ip = request.META.get("REMOTE_ADDR")
        ua = request.META.get("HTTP_USER_AGENT", "")[:512]
    ShareAccessLog.objects.create(
        private_share=share,
        actor=actor,
        action=action,
        ip_address=ip,
        user_agent=ua,
        metadata=metadata or {},
    )


def _is_within_time_windows(time_windows):
    if not time_windows:
        return True
    now = timezone.localtime()
    weekday = now.weekday()
    current_time = now.time()
    for window in time_windows:
        days = window.get("days", [])
        if weekday not in days:
            continue
        start = window.get("start", "00:00")
        end = window.get("end", "23:59")
        from datetime import datetime as dt
        start_t = dt.strptime(start, "%H:%M").time()
        end_t = dt.strptime(end, "%H:%M").time()
        if start_t <= current_time <= end_t:
            return True
    return False


def _share_is_accessible(share, grant=None):
    if share.is_revoked:
        return False, "Share has been revoked."
    if share.is_expired:
        return False, "Share has expired."
    if share.one_time_access and share.download_count > 0:
        return False, "One-time access link has already been used."
    if share.max_downloads and share.download_count >= share.max_downloads:
        return False, "Maximum download limit reached."
    if share.inactivity_revoke_days and share.last_accessed_at:
        cutoff = share.last_accessed_at + timedelta(days=share.inactivity_revoke_days)
        if timezone.now() > cutoff:
            return False, "Share revoked due to inactivity."
    if not _is_within_time_windows(share.time_windows):
        return False, "File is not accessible outside the allowed time window."
    if grant:
        if grant.is_revoked:
            return False, "Your access has been revoked."
        if grant.individual_expires_at and timezone.now() >= grant.individual_expires_at:
            return False, "Your access has expired."
        if grant.max_downloads and grant.download_count >= grant.max_downloads:
            return False, "Your download limit has been reached."
    return True, None


def create_private_share(
    *,
    owner,
    file_id,
    recipient_emails,
    recipient_permissions,
    message="",
    expires_at=None,
    password=None,
    one_time_access=False,
    max_downloads=None,
    inactivity_revoke_days=None,
    time_windows=None,
    request=None,
    parent_share_id=None,
):
    if parent_share_id:
        try:
            parent_share = PrivateShare.objects.get(id=parent_share_id)
            grant = PrivateShareRecipient.objects.get(private_share=parent_share, recipient=owner, is_revoked=False)
            if not grant.can_reshare:
                return None, "Re-sharing not permitted."
            
            # Additional validation against parent permissions
            for raw_email, perms in recipient_permissions.items():
                if perms.get("can_download") and not grant.can_download:
                    return None, "Cannot grant download permission."
                if perms.get("can_reshare") and not grant.can_reshare:
                    return None, "Cannot grant reshare permission."
                if perms.get("can_comment") and not grant.can_comment:
                    return None, "Cannot grant comment permission."
            
            if expires_at and parent_share.expires_at and expires_at > parent_share.expires_at:
                return None, "Expiry cannot exceed parent share expiry."
            
            user_file = parent_share.user_file
        except (PrivateShare.DoesNotExist, PrivateShareRecipient.DoesNotExist):
            return None, "Invalid parent share or no access."
    else:
        try:
            user_file = UserFile.objects.get(id=file_id, user=owner, is_deleted=False)
            parent_share = None
        except UserFile.DoesNotExist:
            return None, "File not found."

    password_hash = make_password(password) if password else ""

    resolved = []
    unregistered = []
    skipped_self = []

    for raw_email in recipient_emails:
        email = raw_email.strip().lower()
        recipient = User.objects.filter(email__iexact=email).first()
        if not recipient:
            unregistered.append(email)
            continue
        if recipient.id == owner.id:
            skipped_self.append(email)
            continue
        resolved.append((email, recipient))

    if not resolved:
        msg = "No valid registered recipients."
        if unregistered:
            msg += f" Not registered on CloudShare: {', '.join(unregistered)}."
        if skipped_self:
            msg += f" Cannot share to yourself: {', '.join(skipped_self)}."
        return None, msg

    with transaction.atomic():
        share = PrivateShare.objects.create(
            owner=owner,
            user_file=user_file,
            message=message,
            expires_at=expires_at,
            password_hash=password_hash,
            one_time_access=one_time_access,
            max_downloads=max_downloads,
            inactivity_revoke_days=inactivity_revoke_days,
            time_windows=time_windows or [],
            parent_share=parent_share,
        )
        created_recipients = []
        emails_sent = 0
        for email, recipient in resolved:
            perms = recipient_permissions.get(email, {})
            grant = PrivateShareRecipient.objects.create(
                private_share=share,
                recipient=recipient,
                can_view=perms.get("can_view", True),
                can_download=perms.get("can_download", True),
                can_reshare=perms.get("can_reshare", False),
                can_comment=perms.get("can_comment", False),
                individual_expires_at=perms.get("individual_expires_at"),
                max_downloads=perms.get("max_downloads"),
            )
            created_recipients.append(grant)
            if _send_private_share_email(owner=owner, recipient=recipient, share=share, message=message):
                emails_sent += 1
        _log_share_access(share, owner, ShareAccessLog.ACTION_CREATE, request)

    return share, {
        "recipients": created_recipients,
        "emails_sent": emails_sent,
        "unregistered": unregistered,
        "skipped_self": skipped_self,
    }


def _send_private_share_email(*, owner, recipient, share, message):
    frontend = getattr(settings, "FRONTEND_APP_URL", "http://localhost:5173")
    subject = f"{owner.first_name} shared a file with you on CloudShare"
    body = (
        f"Hi {recipient.first_name},\n\n"
        f"{owner.first_name} {owner.last_name} ({owner.email}) has privately shared "
        f'"{share.user_file.original_name}" with you.\n\n'
        f"Message: {message or '(no message)'}\n\n"
        f"Log in to CloudShare and visit Shared With Me to access the file:\n"
        f"{frontend}/private-shares/inbox\n"
    )
    if share.expires_at:
        body += f"\nExpires: {share.expires_at.isoformat()}\n"
    return _send_app_email(
        subject=subject,
        body=body,
        recipient_list=[recipient.email],
    )


def list_private_shares_by_owner(user, status_filter=None):
    qs = PrivateShare.objects.select_related("user_file").prefetch_related("recipients__recipient").filter(owner=user)
    if status_filter == "active":
        qs = qs.filter(is_revoked=False).exclude(expires_at__lt=timezone.now())
    elif status_filter == "expired":
        qs = qs.filter(expires_at__lt=timezone.now(), is_revoked=False)
    elif status_filter == "revoked":
        qs = qs.filter(is_revoked=True)
    return qs


def list_private_shares_for_recipient(user):
    return PrivateShareRecipient.objects.select_related(
        "private_share", "private_share__user_file", "private_share__owner"
    ).filter(recipient=user)


def get_recipient_grant(user, share_id):
    try:
        return PrivateShareRecipient.objects.select_related(
            "private_share", "private_share__user_file"
        ).get(recipient=user, private_share_id=share_id, is_revoked=False)
    except PrivateShareRecipient.DoesNotExist:
        return None


def verify_private_share_password(share, password):
    if not share.password_hash:
        return True
    return check_password(password, share.password_hash)


def record_private_share_view(grant, request=None):
    share = grant.private_share
    ok, err = _share_is_accessible(share, grant)
    if not ok:
        return False, err
    grant.view_count += 1
    grant.last_accessed_at = timezone.now()
    grant.save(update_fields=["view_count", "last_accessed_at"])
    share.last_accessed_at = timezone.now()
    share.save(update_fields=["last_accessed_at"])
    _log_share_access(share, grant.recipient, ShareAccessLog.ACTION_VIEW, request)
    _notify_owner_read_receipt(share, grant.recipient, "viewed")
    return True, None


def record_private_share_download(grant, request=None):
    share = grant.private_share
    if not grant.can_download:
        return False, "Download not permitted."
    ok, err = _share_is_accessible(share, grant)
    if not ok:
        return False, err
    grant.download_count += 1
    grant.last_accessed_at = timezone.now()
    grant.save(update_fields=["download_count", "last_accessed_at"])
    share.download_count += 1
    share.last_accessed_at = timezone.now()
    share.save(update_fields=["download_count", "last_accessed_at"])
    _log_share_access(share, grant.recipient, ShareAccessLog.ACTION_DOWNLOAD, request)
    _notify_owner_read_receipt(share, grant.recipient, "downloaded")
    return True, None


def _notify_owner_read_receipt(share, recipient, action):
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    send_mail(
        subject=f"Read receipt: {recipient.email} {action} your file",
        message=(
            f'"{share.user_file.original_name}" was {action} by {recipient.first_name} '
            f"{recipient.last_name} ({recipient.email}) at {timezone.now().isoformat()}."
        ),
        from_email=from_email,
        recipient_list=[share.owner.email],
        fail_silently=True,
    )


def cascade_revoke_share(share, request_user=None):
    share.is_revoked = True
    share.revoked_at = timezone.now()
    share.save(update_fields=["is_revoked", "revoked_at"])
    
    # Revoke all direct recipients of this share
    share.recipients.filter(is_revoked=False).update(is_revoked=True, revoked_at=timezone.now())
    
    if request_user:
        _log_share_access(share, request_user, ShareAccessLog.ACTION_REVOKE, metadata={"cascade": True})

    # Find all child shares and revoke them recursively
    child_shares = share.child_shares.filter(is_revoked=False)
    for child in child_shares:
        cascade_revoke_share(child, request_user)


def revoke_private_share(owner, share_id):
    try:
        share = PrivateShare.objects.get(id=share_id, owner=owner)
    except PrivateShare.DoesNotExist:
        return False
    
    cascade_revoke_share(share, owner)
    _log_share_access(share, owner, ShareAccessLog.ACTION_REVOKE)
    return True


def revoke_private_share_recipient(owner, share_id, recipient_id):
    try:
        grant = PrivateShareRecipient.objects.select_related("private_share").get(
            id=recipient_id, private_share_id=share_id, private_share__owner=owner
        )
    except PrivateShareRecipient.DoesNotExist:
        return False

    grant.is_revoked = True
    grant.revoked_at = timezone.now()
    grant.save(update_fields=["is_revoked", "revoked_at"])
    
    _log_share_access(grant.private_share, owner, ShareAccessLog.ACTION_REVOKE, metadata={"recipient": grant.recipient.email})
    
    # Cascade to all child shares created by this recipient based on this parent share
    child_shares = PrivateShare.objects.filter(parent_share=grant.private_share, owner=grant.recipient, is_revoked=False)
    for cs in child_shares:
        cascade_revoke_share(cs, owner)

    return True


def transfer_file_ownership(owner, file_id, new_owner_email):
    new_owner = User.objects.filter(email=new_owner_email.strip().lower()).first()
    if not new_owner:
        return False, "Recipient not found."
    try:
        user_file = UserFile.objects.get(id=file_id, user=owner, is_deleted=False)
    except UserFile.DoesNotExist:
        return False, "File not found."
    user_file.user = new_owner
    user_file.save(update_fields=["user"])
    return True, "Ownership transferred."


def add_share_comment(grant, content, page_number=None, highlight_text="", parent_id=None):
    if not grant.can_comment:
        return None, "Commenting not permitted."
    share = grant.private_share
    ok, err = _share_is_accessible(share, grant)
    if not ok:
        return None, err
    parent = None
    if parent_id:
        parent = ShareComment.objects.filter(id=parent_id, private_share=share).first()
    comment = ShareComment.objects.create(
        private_share=share,
        author=grant.recipient,
        content=content,
        page_number=page_number,
        highlight_text=highlight_text,
        parent=parent,
    )
    _log_share_access(share, grant.recipient, ShareAccessLog.ACTION_COMMENT)
    return comment, None


def get_share_access_logs(share, user):
    if share.owner_id == user.id:
        return share.access_logs.select_related("actor").all()
    grant = get_recipient_grant(user, share.id)
    if grant:
        return share.access_logs.filter(actor=user)
    return ShareAccessLog.objects.none()


def get_share_analytics(share):
    logs = share.access_logs.all()
    viewers = logs.filter(action=ShareAccessLog.ACTION_VIEW).values("actor").distinct().count()
    downloads = logs.filter(action=ShareAccessLog.ACTION_DOWNLOAD).count()
    last = logs.first()
    return {
        "unique_viewers": viewers,
        "total_downloads": downloads,
        "last_accessed": last.created_at.isoformat() if last else None,
        "recipient_count": share.recipients.count(),
    }


def upload_file_version(owner, file_id, new_file, change_note=""):
    try:
        user_file = UserFile.objects.get(id=file_id, user=owner, is_deleted=False)
    except UserFile.DoesNotExist:
        return None, "File not found."
    last_version = user_file.versions.order_by("-version_number").first()
    next_num = (last_version.version_number + 1) if last_version else 1
    FileVersion.objects.create(
        user_file=user_file,
        version_number=next_num,
        file=user_file.file,
        file_size=user_file.file_size,
        file_hash=user_file.file_hash,
        uploaded_by=owner,
        change_note=change_note or f"Version {next_num}",
    )
    file_hash = get_file_hash(new_file)
    mime_type, _ = mimetypes.guess_type(new_file.name)
    if user_file.file and os.path.isfile(user_file.file.path):
        os.remove(user_file.file.path)
    user_file.file = new_file
    user_file.original_name = new_file.name
    user_file.file_size = new_file.size
    user_file.mime_type = mime_type or "application/octet-stream"
    user_file.file_hash = file_hash
    user_file.save()
    return user_file, None


def apply_watermark_to_file(user_file, recipient):
    """Stamp recipient info onto downloadable file (images/PDF when possible)."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        path = user_file.file.path
        if user_file.mime_type and user_file.mime_type.startswith("image/"):
            img = Image.open(path).convert("RGBA")
            overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)
            text = f"{recipient.first_name} {recipient.last_name} | {recipient.email}"
            draw.text((20, img.height - 40), text, fill=(255, 0, 0, 128))
            combined = Image.alpha_composite(img, overlay)
            out_path = path + ".wm.png"
            combined.convert("RGB").save(out_path, "PNG")
            return out_path
    except Exception:
        pass
    return user_file.file.path


def lookup_users_by_email(emails):
    results = []
    for email in emails:
        email = email.strip().lower()
        u = User.objects.filter(email__iexact=email).first()
        results.append({
            "email": email,
            "registered": u is not None,
            "id": u.id if u else None,
            "display_name": f"{u.first_name} {u.last_name}".strip() if u else None,
        })
    return results