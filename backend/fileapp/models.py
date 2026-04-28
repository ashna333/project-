from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

class User(AbstractBaseUser):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    dob = models.DateField()
    reset_token = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)  # keep this — needed by Django auth

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "dob"]

    def __str__(self):
        return self.email
    

from django.conf import settings
import os
import uuid
from django.utils import timezone


def user_upload_path(instance, filename):
    """Upload to media/uploads/<user_id>/<filename>"""
    return f"uploads/{instance.user.id}/{filename}"


class UserFile(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="files"
    )
    file = models.FileField(upload_to=user_upload_path)
    original_name = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()  # in bytes
    mime_type = models.CharField(max_length=100, blank=True)
    file_hash = models.CharField(max_length=32, blank=True) 
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)      # 👈 add this
    deleted_at = models.DateTimeField(null=True, blank=True)  # 👈 and this


    class Meta:
        ordering = ["-uploaded_at"]

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