from django.contrib.auth import authenticate,get_user_model
from .utils import get_user_tokens
import uuid
import os
from django.core.mail import send_mail        
from django.conf import settings 
from datetime import date, timedelta
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from django.db import models as db_models
import hashlib
import mimetypes
from django.utils import timezone
import logging
from django.db import transaction
from django.core.mail import send_mail
from .models import FileShare, UserFile
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from .tokens import token_generator
from django.db.models import Sum, Q
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str




logger = logging.getLogger(__name__)

User= get_user_model()

_PLACEHOLDER_LAST_NAMES = frozenset({"google", "google user", "user"})


def _is_placeholder_last_name(last_name):
    return (last_name or "").strip().lower() in _PLACEHOLDER_LAST_NAMES


def get_user_display_name(user):
    """Human-friendly name; never shows 'Google User' placeholders."""
    if not user:
        return ""
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    if _is_placeholder_last_name(last):
        last = ""
    parts = [p for p in (first, last) if p]
    if parts:
        return " ".join(parts)
    if user.email:
        return user.email.split("@")[0]
    return "User"


def _parse_google_profile(user_info):
    email = (user_info.get("email") or "").strip().lower()
    given = (user_info.get("given_name") or "").strip()
    family = (user_info.get("family_name") or "").strip()
    full = (user_info.get("name") or "").strip()

    if not given and full:
        parts = full.split(None, 1)
        given = parts[0] if parts else ""
        family = parts[1] if len(parts) > 1 else ""

    if not given:
        given = email.split("@")[0] if email else "User"

    return given[:50], family[:50]


def register_user(data):
    email = (data.get("email") or "").strip().lower()
    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        if existing.auth_provider == "google":
            raise ValueError(
                "This email is already linked to Google sign-in. "
                "Use Continue with Google on the login page instead of registering again."
            )
        raise ValueError(
            "A user with this email is already registered. Please sign in instead."
        )

    user = User.objects.create_user(
        email=email,
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        dob=data.get("dob"),
        password=data.get("password"),
    )
    return user


def login_user(email, password):
    user = authenticate(username=email, password=password)

    if not user:
        return None

    tokens = get_user_tokens(user)

    return {
        "user": user,
        "tokens": tokens
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


def change_user_password(user, old_password, new_password):
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
    first_name, last_name = _parse_google_profile(user_info)
    user = User.objects.filter(email=email).first()
    if user:
        update_fields = []
        if not (user.first_name or "").strip():
            user.first_name = first_name
            update_fields.append("first_name")
        if _is_placeholder_last_name(user.last_name):
            user.last_name = last_name
            update_fields.append("last_name")
        elif not (user.last_name or "").strip() and last_name:
            user.last_name = last_name
            update_fields.append("last_name")
        if user.auth_provider != "password":
            user.auth_provider = "google"
            update_fields.append("auth_provider")
        if update_fields:
            user.save(update_fields=list(dict.fromkeys(update_fields)))
        return user

    default_dob = date.today() - timedelta(days=365 * 18)
    user = User.objects.create_user(
        email=email,
        first_name=first_name,
        last_name=last_name,
        dob=default_dob,
        password=uuid.uuid4().hex,
        auth_provider="google",
    )
    return user


# ─── Password Reset ───────────────────────────────────────────────────────────

def send_password_reset_email(email):
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return  # silently do nothing (security)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)
    

    reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

    subject = "Reset your CloudShare password"
    message = (
        f"Hi {user.first_name},\n\n"
        f"We received a request to reset the password for your CloudShare account "
        f"associated with this email address.\n\n"
        f"To reset your password, click the link below:\n"
        f"{reset_link}\n\n"
        f"This link is valid for a limited time. If you did not request a password reset, "
        f"you can safely ignore this email — your account remains secure and no changes "
        f"have been made.\n\n"
        f"For security reasons, please do not share this link with anyone.\n\n"
        f"Best regards,\n"
        f"The CloudShare Team\n\n"
        f"---\n"
        f"This is an automated message. Please do not reply to this email."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )

    return True



def reset_user_password(uid, token, new_password):
    # Decode uid to get user
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (User.DoesNotExist, ValueError):
        return False, "Invalid or expired token"

    # Validate token (expiry + single use)
    if not token_generator.check_token(user, token):
        return False, "Invalid or expired token"

    # Check new password is not same as old
    if user.check_password(new_password):
        return False, "New password cannot be the same as old password"

    user.set_password(new_password)
    user.save()  # token auto-invalidates here!

    return True, "Password reset successful"



def get_user_storage_usage(user):
    """Return total bytes used by the user."""
    result = UserFile.objects.filter(user=user).aggregate(total=Sum("file_size"))
    return result["total"] or 0

from django.db.models.functions import Lower


def list_user_files(user, search=None, ordering='-uploaded_at'):
    qs = UserFile.objects.filter(user=user, is_deleted=False)
    if search:
        qs = qs.filter(original_name__icontains=search)

    if ordering in ('original_name', '-original_name'):
        qs = qs.annotate(name_lower=Lower('original_name'))
        if ordering == 'original_name':
            qs = qs.order_by('name_lower')
        else:
            qs = qs.order_by('-name_lower')
    else:
        qs = qs.order_by(ordering)

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


from django.db.models import Exists, OuterRef

from django.db.models import Exists, OuterRef

def permanently_delete_user_file(user, file_id):
    try:
        user_file = UserFile.objects.get(id=file_id, user=user, is_deleted=True)
    except UserFile.DoesNotExist:
        return "not_found"

    user_file.delete()  # just delete, no share checks
    return "deleted"


def empty_user_trash(user):
    trashed_files = UserFile.objects.filter(user=user, is_deleted=True)
    deleted = 0
    deferred = 0
    for user_file in trashed_files:
        active_recipient_exists = PrivateShareRecipient.objects.filter(
            private_share__user_file=user_file,
            private_share__is_revoked=False,
            is_revoked=False,
        ).filter(
            db_models.Q(private_share__expires_at__isnull=True) |
            db_models.Q(private_share__expires_at__gt=timezone.now())
        ).filter(
            db_models.Q(individual_expires_at__isnull=True) |
            db_models.Q(individual_expires_at__gt=timezone.now())
        )
        if active_recipient_exists.exists():
            deferred += 1
            continue
        if user_file.file:
            user_file.file.delete(save=False)
        user_file.delete()
        deleted += 1
    return deleted, deferred

        
   


def get_user_file(user, file_id):
    try:
        return UserFile.objects.get(id=file_id, user=user, is_deleted=False)
    except UserFile.DoesNotExist:
        return None


def get_storage_summary(user):
    MAX_STORAGE = 1 * 1024 * 1024 * 1024
    used = UserFile.objects.filter(user=user, is_deleted=False).aggregate(
        total=Sum("file_size"))["total"] or 0
    return {
        "used_bytes": used,
        "max_bytes": MAX_STORAGE,
        "used_percent": round((used / MAX_STORAGE) * 100, 2),
        "remaining_bytes": MAX_STORAGE - used,
    }


def toggle_file_star(user, file_id):
    try:
        user_file = UserFile.objects.get(id=file_id, user=user, is_deleted=False)
        user_file.is_starred = not user_file.is_starred
        user_file.save()
        return user_file
    except UserFile.DoesNotExist:
        return None

def restore_all_user_trash(user):
    trashed_files = UserFile.objects.filter(user=user, is_deleted=True)
    count = trashed_files.count()
    if count > 0:
        trashed_files.update(is_deleted=False)
    return count



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



# ─── Public File Share ────────────────────────────────────────────────────────

def create_file_share(*, owner, file_id, recipient_email, expires_in_hours, message, request=None):
   
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

    _send_file_share_email(
        owner_email=getattr(owner, "email", ""),
        owner_name=get_user_display_name(owner),
        recipient_email=recipient_email,
        message=message,
        share_url=share_url or f"/api/public/shares/{share.token}/",
        file_name=share.user_file.original_name,
        expires_at=expires_at,
    )

    return share, share_url


def _cleanup_soft_deleted_file(user_file):
    """Hard-deletes a file the owner soft-deleted, once no active recipients remain."""
    if not user_file.is_deleted:
        return

    still_active = PrivateShare.objects.filter(
        user_file=user_file,
        is_revoked=False,
    ).filter(
        db_models.Q(expires_at__isnull=True) | db_models.Q(expires_at__gt=timezone.now())
    ).filter(
        recipients__is_revoked=False,
    ).filter(
        db_models.Q(recipients__individual_expires_at__isnull=True) |
        db_models.Q(recipients__individual_expires_at__gt=timezone.now())
    ).exists()

    if not still_active:
        if user_file.file and os.path.isfile(user_file.file.path):
            os.remove(user_file.file.path)
        UserFile.objects.filter(pk=user_file.pk).delete()

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


def _send_app_email(*, subject, body, recipient_list, html_body=None):
    from django.core.mail import EmailMultiAlternatives

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@cloudshare.local"
    recipients = [r.strip().lower() for r in recipient_list if r and str(r).strip()]
    if not recipients:
        return False
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=from_email,
            to=recipients,
        )
        if html_body:
            email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=False)
        logger.info("Email sent to %s: %s", recipients, subject)
        return True
    except Exception as exc:
        logger.exception("Email send failed: %s", exc)
        return False


# ─── Private File Share ───────────────────────────────────────────────────────

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


def _share_is_accessible(share, grant=None, ignore_download_limit=False):
    if share.one_time_access and share.download_count > 0:
        return False, "One time access."
    if share.is_revoked:
        return False, "Revoked."
    if share.is_expired:
        return False, "Expired."
    if not ignore_download_limit:
        if share.max_downloads and share.download_count >= share.max_downloads:
            return False, "Maximum download limit reached."
    if not _is_within_time_windows(share.time_windows):
        return False, "Time window expired."
    if grant:
        if grant.is_revoked:
            return False, "Revoked."
        if grant.individual_expires_at and timezone.now() >= grant.individual_expires_at:
            return False, "Expired."
        if not ignore_download_limit:
            if grant.max_downloads and grant.download_count >= grant.max_downloads:
                return False, "Download limit reached."
    return True, None


def _get_upstream_owner_emails(parent_share):
    """Emails of owners in the share chain — cannot be re-shared back to them."""
    emails = set()
    current = parent_share
    while current:
        if current.owner_id and current.owner.email:
            emails.add(current.owner.email.strip().lower())
        current = current.parent_share
    return emails


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
    blocked_upstream = []
    upstream_blocked = _get_upstream_owner_emails(parent_share) if parent_share else set()

    for raw_email in recipient_emails:
        email = raw_email.strip().lower()
        if parent_share and email in upstream_blocked:
            blocked_upstream.append(email)
            continue
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
        if blocked_upstream:
            msg += f" Cannot share back to the original sender(s): {', '.join(blocked_upstream)}."
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
        log_action = ShareAccessLog.ACTION_RESHARE if parent_share else ShareAccessLog.ACTION_CREATE
        _log_share_access(share, owner, log_action, request)

    return share, {
        "recipients": created_recipients,
        "emails_sent": emails_sent,
        "unregistered": unregistered,
        "skipped_self": skipped_self,
    }


def _send_private_share_email(*, owner, recipient, share, message):
    frontend = getattr(settings, "FRONTEND_APP_URL", "http://localhost:5173")
    inbox_url = f"{frontend}/private-shares/inbox"
    owner_display = get_user_display_name(owner)
    file_name = share.user_file.original_name

    subject = f"{owner_display} has privately shared a file with you on CloudShare"

    body = (
        f"Hi {recipient.first_name},\n\n"
        f"{owner_display} ({owner.email}) has privately shared the file "
        f'"{file_name}" with you on CloudShare.\n\n'
        + (f"Message from {owner_display}:\n\"{message}\"\n\n" if message else "")
        + f"To access this file, log in to your CloudShare account and visit your inbox:\n"
        f"{inbox_url}\n\n"
        + (
            f"Please note this share will expire on "
            f"{share.expires_at.strftime('%B %d, %Y at %I:%M %p UTC')}.\n\n"
            if share.expires_at else ""
        )
        + f"If you believe this file was shared with you in error or have any concerns, "
        f"please disregard this notification.\n\n"
        f"Best regards,\n"
        f"The CloudShare Team\n\n"
        f"---\n"
        f"This is an automated message. Please do not reply to this email.\n"
        f"Powered by CloudShare"
    )

    return _send_app_email(
        subject=subject,
        body=body,
        recipient_list=[recipient.email],
    )


# ─── Read Receipt Notification ────────────────────────────────────────────────

def _notify_owner_read_receipt(share, recipient, action):
    """Notify the file owner when a recipient views or downloads their shared file."""
    recipient_display = get_user_display_name(recipient)
    file_name = share.user_file.original_name
    actioned_at = timezone.now().strftime("%B %d, %Y at %I:%M %p UTC")

    action_label = "viewed" if action == "viewed" else "downloaded"
    subject = f"{recipient_display} has {action_label} your shared file — {file_name}"

    message = (
        f"Hi {share.owner.first_name},\n\n"
        f"This is a read receipt to let you know that {recipient_display} ({recipient.email}) "
        f"has {action_label} the file you shared:\n\n"
        f"  File: {file_name}\n"
        f"  Action: {action_label.capitalize()}\n"
        f"  Date & Time: {actioned_at}\n\n"
        f"No action is required on your part. This notification was sent because "
        f"read receipts are enabled for your shared files.\n\n"
        f"You can manage your shared files and view access activity from your CloudShare dashboard.\n\n"
        f"Best regards,\n"
        f"The CloudShare Team\n\n"
        f"---\n"
        f"This is an automated message. Please do not reply to this email.\n"
        f"Powered by CloudShare"
    )

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[share.owner.email],
        fail_silently=True,
    )


def list_private_shares_by_owner(user, status_filter=None):
    qs = PrivateShare.objects.select_related("user_file").prefetch_related(
        "recipients__recipient"
    ).filter(owner=user)

    if status_filter == "active":
        qs = qs.filter(is_revoked=False).filter(
            db_models.Q(expires_at__isnull=True) |
            db_models.Q(expires_at__gt=timezone.now())
        ).exclude(
            one_time_access=True, download_count__gte=1
        )

    elif status_filter == "expired":
        qs = qs.filter(is_revoked=False).filter(
            db_models.Q(expires_at__isnull=False, expires_at__lt=timezone.now()) |
            db_models.Q(one_time_access=True, download_count__gte=1)
        )

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


def _user_owns_ancestor_share(user, share):
    """True if user created any share in the parent chain (e.g. A can revoke B→C)."""
    current = share.parent_share
    while current:
        if current.owner_id == user.id:
            return True
        current = current.parent_share
    return False


def user_can_revoke_private_share(user, share):
    return share.owner_id == user.id or _user_owns_ancestor_share(user, share)


def user_can_view_private_share_tree(user, share):
    """View tree if user owns this share or an ancestor share."""
    if share.owner_id == user.id:
        return True
    return _user_owns_ancestor_share(user, share)


def get_private_share_tree_root(share):
    root = share
    while root.parent_share:
        root = root.parent_share
    return root


def cascade_revoke_share(share, request_user=None):
    share.is_revoked = True
    share.revoked_at = timezone.now()
    share.save(update_fields=["is_revoked", "revoked_at"])

    share.recipients.filter(is_revoked=False).update(is_revoked=True, revoked_at=timezone.now())

    if request_user:
        _log_share_access(share, request_user, ShareAccessLog.ACTION_REVOKE, metadata={"cascade": True})

    child_shares = share.child_shares.filter(is_revoked=False)
    for child in child_shares:
        cascade_revoke_share(child, request_user)


def revoke_private_share(user, share_id):
    try:
        share = PrivateShare.objects.get(id=share_id)
    except PrivateShare.DoesNotExist:
        return False
    if not user_can_revoke_private_share(user, share):
        return False

    cascade_revoke_share(share, user)
    _log_share_access(share, user, ShareAccessLog.ACTION_REVOKE)
    _cleanup_soft_deleted_file(share.user_file)  # 👈 add this
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
    

    child_shares = PrivateShare.objects.filter(parent_share=grant.private_share, owner=grant.recipient, is_revoked=False)
    for cs in child_shares:
        cascade_revoke_share(cs, owner)

    _cleanup_soft_deleted_file(grant.private_share.user_file)  # 👈 add this
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


def _share_ids_for_same_file(share):
    """All private-share rows for the same underlying file (includes re-share chains)."""
    return PrivateShare.objects.filter(user_file_id=share.user_file_id).values_list("id", flat=True)


def get_share_access_logs(share, user):
    share_ids = _share_ids_for_same_file(share)
    qs = ShareAccessLog.objects.filter(private_share_id__in=share_ids).select_related(
        "actor", "private_share"
    ).order_by("-created_at")

    if share.user_file.user_id == user.id or share.owner_id == user.id:
        return qs
    grant = get_recipient_grant(user, share.id)
    if grant:
        return qs.filter(actor=user)
    return ShareAccessLog.objects.none()


def get_share_analytics(share):
    share_ids = _share_ids_for_same_file(share)
    logs = ShareAccessLog.objects.filter(private_share_id__in=share_ids)
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
    try:
        from PIL import Image, ImageDraw, ImageFont
        path = user_file.file.path
        if user_file.mime_type and user_file.mime_type.startswith("image/"):
            img = Image.open(path).convert("RGBA")
            overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)
            text = f"{get_user_display_name(recipient)} | {recipient.email}"

            font_size = max(14, int(img.width * 0.025))
            font = ImageFont.load_default(size=font_size)

            x = 20
            y = img.height - font_size - 16

            draw.text(
                (x, y),
                text,
                fill=(255, 255, 255, 55),
                font=font,
                stroke_width=1,
                stroke_fill=(0, 0, 0, 35),
            )

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
            "display_name": get_user_display_name(u) if u else None,
        })
    return results


def _share_is_accessible_for_action(share, grant=None, action='download'):
    if share.is_revoked:
        return False, "Revoked."
    if share.is_expired:
        return False, "Expired."
    if grant:
        if grant.is_revoked:
            return False, "Revoked."
        if grant.individual_expires_at and timezone.now() >= grant.individual_expires_at:
            return False, "Expired."

    # One-time access — block download entirely, only preview allowed once
    if share.one_time_access:
        if action == 'download':
            return False, "Download not available for one-time access shares."
        if action == 'preview' and share.download_count >= 1:
            return False, "One time access already used."

    if action in ('download', 'preview'):
        if not _is_within_time_windows(share.time_windows):
            return False, "Time window expired."

    if action == 'download':
        if share.max_downloads and share.download_count >= share.max_downloads:
            return False, "Maximum download limit reached."
        if grant and grant.max_downloads and grant.download_count >= grant.max_downloads:
            return False, "Download limit reached."

    return True, None


def record_private_share_view(grant, request=None, *, preview=False):
    share = grant.private_share
    action = 'preview' if preview else 'download'
    ok, err = _share_is_accessible_for_action(share, grant, action=action)
    if not ok:
        return False, err

    grant.view_count += 1
    grant.last_accessed_at = timezone.now()
    grant.save(update_fields=["view_count", "last_accessed_at"])
    share.last_accessed_at = timezone.now()
    share.save(update_fields=["last_accessed_at"])

    metadata = {"preview": True} if preview else {}
    _log_share_access(share, grant.recipient, ShareAccessLog.ACTION_VIEW, request, metadata=metadata)
    _notify_owner_read_receipt(share, grant.recipient, "viewed")

    
    if share.one_time_access and not share.is_revoked:
        share.is_revoked = True
        share.revoked_at = timezone.now()
        share.download_count += 1  # mark as used
        share.save(update_fields=['is_revoked', 'revoked_at', 'download_count'])

    return True, None


def record_private_share_download(grant, request=None):
    share = grant.private_share
    if not grant.can_download:
        return False, "Download not permitted."

    # Block download entirely for one-time access shares
    if share.one_time_access:
        return False, "Download not available for one-time access shares."

    ok, err = _share_is_accessible_for_action(share, grant, action='download')
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


def add_share_comment(grant, content, page_number=None, highlight_text="", parent_id=None):
    if not grant.can_comment:
        return None, "Commenting not permitted."
    share = grant.private_share
    ok, err = _share_is_accessible_for_action(share, grant, action='comment')
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