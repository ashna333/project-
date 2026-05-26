from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models
from django.conf import settings
import os
import uuid
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email).strip().lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

class User(AbstractBaseUser):
    uuid = models.UUIDField(null=True, unique=True, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    dob = models.DateField()
    # Used to control which auth features are available (e.g. password change).
    # Values: "password" (normal login) | "google" (Google OAuth login)
    auth_provider = models.CharField(max_length=20, default="password")
    reset_token = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)  # keep this — needed by Django auth

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "dob"]

    def __str__(self):
        return self.email
    


def user_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    return f"uploads/{instance.user.uuid}/{unique_filename}"


class UserFile(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="files"
    )
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    file = models.FileField(upload_to=user_upload_path)
    original_name = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()  # in bytes
    mime_type = models.CharField(max_length=100, blank=True)
    file_hash = models.CharField(max_length=64, db_index=True, null=True, blank=True) 
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)      
    deleted_at = models.DateTimeField(null=True, blank=True)  
    is_starred = models.BooleanField(default=False)


    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["user", "file_hash"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.original_name}"

    def delete(self, *args, **kwargs):
        # Delete actual file from disk when model is deleted
        if self.file and os.path.isfile(self.file.path):
            os.remove(self.file.path)
        super().delete(*args, **kwargs)


class FileShare(models.Model):
    """
    Public share link for a single UserFile.
    Same file can be shared multiple times (different recipients/tokens).
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="file_shares",
    )
    user_file = models.ForeignKey(
        UserFile,
        on_delete=models.CASCADE,
        related_name="shares",
    )
    is_revoked = models.BooleanField(default=False)
    is_accessed = models.BooleanField(default=False)
    recipient_email = models.EmailField()
    message = models.TextField()

    token = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)
    accessed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["token"]),
            models.Index(fields=["owner", "created_at"]),
        ]

    def __str__(self):
        return f"{self.owner.email} -> {self.recipient_email} ({self.user_file.original_name})"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = uuid.uuid4().hex
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class FileVersion(models.Model):
    """Version history for a UserFile."""
    user_file = models.ForeignKey(
        UserFile, on_delete=models.CASCADE, related_name="versions"
    )
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to=user_upload_path)
    file_size = models.PositiveBigIntegerField()
    file_hash = models.CharField(max_length=64, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    change_note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-version_number"]
        unique_together = ("user_file", "version_number")


class PrivateShare(models.Model):
  """Enterprise private share — recipients must be registered users."""

  PERM_VIEW = "view"
  PERM_DOWNLOAD = "download"
  PERM_RESHARE = "reshare"
  PERM_COMMENT = "comment"

  owner = models.ForeignKey(
      settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="private_shares_owned"
  )
  user_file = models.ForeignKey(
      UserFile, on_delete=models.CASCADE, related_name="private_shares"
  )
  token = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
  message = models.TextField(blank=True)

  expires_at = models.DateTimeField(null=True, blank=True)
  password_hash = models.CharField(max_length=128, blank=True)
  one_time_access = models.BooleanField(default=False)
  max_downloads = models.PositiveIntegerField(null=True, blank=True)
  download_count = models.PositiveIntegerField(default=0)
  last_accessed_at = models.DateTimeField(null=True, blank=True)

  time_windows = models.JSONField(default=list, blank=True)
  pinned_version = models.ForeignKey(
      FileVersion, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
  )
  use_latest_version = models.BooleanField(default=True)
  parent_share = models.ForeignKey(
      "self", on_delete=models.CASCADE, null=True, blank=True, related_name="child_shares"
  )

  is_revoked = models.BooleanField(default=False)
  revoked_at = models.DateTimeField(null=True, blank=True)
  transferred_to = models.ForeignKey(
      settings.AUTH_USER_MODEL,
      on_delete=models.SET_NULL,
      null=True,
      blank=True,
      related_name="transferred_shares",
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
      ordering = ["-created_at"]

  def save(self, *args, **kwargs):
      if not self.token:
          self.token = uuid.uuid4().hex
      super().save(*args, **kwargs)

  @property
  def is_expired(self):
    if self.expires_at and timezone.now() >= self.expires_at:
        return True
    if self.one_time_access and self.download_count >= 1:
        return True
    return False

class PrivateShareRecipient(models.Model):
  """Per-recipient grant on a private share."""

  private_share = models.ForeignKey(
      PrivateShare, on_delete=models.CASCADE, related_name="recipients"
  )
  recipient = models.ForeignKey(
      settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="private_shares_received"
  )
  can_view = models.BooleanField(default=True)
  can_download = models.BooleanField(default=True)
  can_reshare = models.BooleanField(default=False)
  can_comment = models.BooleanField(default=False)

  individual_expires_at = models.DateTimeField(null=True, blank=True)
  max_downloads = models.PositiveIntegerField(null=True, blank=True)
  download_count = models.PositiveIntegerField(default=0)
  last_accessed_at = models.DateTimeField(null=True, blank=True)
  view_count = models.PositiveIntegerField(default=0)

  is_revoked = models.BooleanField(default=False)
  revoked_at = models.DateTimeField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
      unique_together = ("private_share", "recipient")
      ordering = ["-created_at"]


class ShareAccessLog(models.Model):
  """Permanent audit log — cannot be deleted."""

  ACTION_VIEW = "view"
  ACTION_DOWNLOAD = "download"
  ACTION_COMMENT = "comment"
  ACTION_REVOKE = "revoke"
  ACTION_RESHARE = "reshare"
  ACTION_CREATE = "create"
  ACTION_TRANSFER = "transfer"

  private_share = models.ForeignKey(
      PrivateShare, on_delete=models.CASCADE, related_name="access_logs"
  )
  actor = models.ForeignKey(
      settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="share_access_logs"
  )
  action = models.CharField(max_length=20)
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  user_agent = models.CharField(max_length=512, blank=True)
  metadata = models.JSONField(default=dict, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
      ordering = ["-created_at"]


class ShareComment(models.Model):
  private_share = models.ForeignKey(
      PrivateShare, on_delete=models.CASCADE, related_name="comments"
  )
  author = models.ForeignKey(
      settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="share_comments"
  )
  content = models.TextField()
  page_number = models.PositiveIntegerField(null=True, blank=True)
  highlight_text = models.TextField(blank=True)
  parent = models.ForeignKey(
      "self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies"
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
      ordering = ["created_at"]


# ─── Collaborative Workspaces (Spaces) ──────────────────────────────────────

class Space(models.Model):
  """Persistent collaborative room (invite-only)."""
  name = models.CharField(max_length=120, unique=True)
  description = models.TextField(blank=True, default="")

  created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="spaces_created",
  )

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["-created_at"]

  def __str__(self):
    return self.name


class SpaceMember(models.Model):
  ROLE_OWNER = "owner"
  ROLE_EDITOR = "editor"
  ROLE_VIEWER = "viewer"
  ROLE_CHOICES = [
    (ROLE_OWNER, "Owner"),
    (ROLE_EDITOR, "Editor"),
    (ROLE_VIEWER, "Viewer"),
  ]

  space = models.ForeignKey(
    Space, on_delete=models.CASCADE, related_name="members"
  )
  user = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="space_memberships",
  )
  role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_VIEWER)
  joined_at = models.DateTimeField(auto_now_add=True)
  # Notification controls per space (MVP fields).
  mute_in_app = models.BooleanField(default=False)
  mute_weekly_digest = models.BooleanField(default=False)

  class Meta:
    unique_together = ("space", "user")
    ordering = ["-joined_at"]

  def __str__(self):
    return f"{self.user.email} in {self.space.name} ({self.role})"


class SpaceFile(models.Model):
  """A named file inside a Space (has a timeline of versions)."""
  space = models.ForeignKey(
    Space, on_delete=models.CASCADE, related_name="files"
  )
  display_name = models.CharField(max_length=255)
  is_pinned = models.BooleanField(default=False)
  pinned_at = models.DateTimeField(null=True, blank=True)

  created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
  )

  current_version = models.ForeignKey(
    "SpaceFileVersion", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
  )
  pinned_version = models.ForeignKey(
    "SpaceFileVersion", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
  )

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    unique_together = ("space", "display_name")
    ordering = ["-updated_at", "-created_at"]

  def __str__(self):
    return f"{self.display_name} ({self.space.name})"


class SpaceFileVersion(models.Model):
  """One uploaded version of a SpaceFile."""
  space_file = models.ForeignKey(
    SpaceFile, on_delete=models.CASCADE, related_name="versions"
  )
  version_number = models.PositiveIntegerField()

  # Reuse stored UserFile for the actual file content.
  user_file = models.ForeignKey(
    "UserFile", on_delete=models.CASCADE, related_name="space_versions"
  )

  uploaded_by = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="space_file_versions"
  )
  change_note = models.CharField(max_length=255, blank=True, default="")

  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    unique_together = ("space_file", "version_number")
    ordering = ["-version_number"]

  def __str__(self):
    return f"{self.space_file.display_name} v{self.version_number}"


class SpaceThread(models.Model):
  """A threaded discussion attached to a SpaceFile."""
  space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name="threads")
  space_file = models.ForeignKey(SpaceFile, on_delete=models.CASCADE, related_name="threads")

  created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="space_threads"
  )

  is_resolved = models.BooleanField(default=False)
  resolved_at = models.DateTimeField(null=True, blank=True)

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["-updated_at", "-created_at"]

  def __str__(self):
    return f"Thread on {self.space_file.display_name}"


class SpaceThreadComment(models.Model):
  """Threaded comments. Use `parent` for replies; thread resolution lives on SpaceThread."""
  thread = models.ForeignKey(SpaceThread, on_delete=models.CASCADE, related_name="comments")
  author = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="space_thread_comments"
  )
  content = models.TextField()

  # Optional metadata useful for documents/images.
  page_number = models.PositiveIntegerField(null=True, blank=True)
  highlight_text = models.TextField(blank=True, default="")

  parent = models.ForeignKey(
    "self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies"
  )

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["created_at"]

  def __str__(self):
    return f"Comment by {self.author.email}"


class SpaceTask(models.Model):
  STATUS_TODO = "todo"
  STATUS_IN_PROGRESS = "in_progress"
  STATUS_DONE = "done"
  STATUS_CHOICES = [
    (STATUS_TODO, "To do"),
    (STATUS_IN_PROGRESS, "In progress"),
    (STATUS_DONE, "Done"),
  ]

  space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name="tasks")
  space_file = models.ForeignKey(SpaceFile, on_delete=models.CASCADE, related_name="tasks")

  title = models.CharField(max_length=200)
  description = models.TextField(blank=True, default="")

  status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TODO)
  due_at = models.DateTimeField(null=True, blank=True)
  priority = models.PositiveSmallIntegerField(default=2)  # 1=high, 2=med, 3=low

  assignee = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_space_tasks"
  )
  created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_space_tasks"
  )

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["due_at", "priority", "-created_at"]

  def __str__(self):
    return self.title


class SpaceNotification(models.Model):
  """In-app notifications (and source for weekly digest)."""
  TYPE_UPLOAD = "upload"
  TYPE_COMMENT = "comment"
  TYPE_MENTION = "mention"
  TYPE_TASK = "task"

  NOTIF_TYPES = [
    (TYPE_UPLOAD, "Upload"),
    (TYPE_COMMENT, "Comment"),
    (TYPE_MENTION, "Mention"),
    (TYPE_TASK, "Task"),
  ]

  user = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="space_notifications"
  )
  space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name="notifications")
  notif_type = models.CharField(max_length=20, choices=NOTIF_TYPES)

  title = models.CharField(max_length=200)
  message = models.TextField(blank=True, default="")

  is_read = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True)

  # Optional relations for richer UI later.
  space_file = models.ForeignKey(SpaceFile, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
  space_thread = models.ForeignKey(SpaceThread, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
  space_task = models.ForeignKey(SpaceTask, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

  class Meta:
    ordering = ["-created_at"]

  def __str__(self):
    return f"{self.user.email}: {self.notif_type}"


class SpacePresence(models.Model):
  """Polling-based presence indicator (updated via heartbeat endpoint)."""
  space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name="presence")
  user = models.ForeignKey(
    settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="space_presence"
  )
  last_seen_at = models.DateTimeField(auto_now=True)

  class Meta:
    unique_together = ("space", "user")
    ordering = ["-last_seen_at"]

  def __str__(self):
    return f"{self.user.email} in {self.space.name}"
