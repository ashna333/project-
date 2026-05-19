"""Shared validation helpers for serializers and services."""
import re
from datetime import date

from rest_framework import serializers

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
NAME_REGEX = re.compile(r"^[a-zA-Z\s'\-]+$")
FORBIDDEN_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00]')
PASSWORD_SPECIAL = re.compile(r'[!@#$%^&*()_+\-=;:"<>?/|]')

MAX_FILE_SIZE = 100 * 1024 * 1024
MAX_FILES_PER_UPLOAD = 50
MAX_STORAGE_PER_USER = 1 * 1024 * 1024 * 1024
MAX_MESSAGE_LENGTH = 2000
MAX_FILENAME_LENGTH = 255
MIN_PASSWORD_LENGTH = 8


def validate_name(value, field_name="Name", min_length=2):
    value = (value or "").strip()
    if not value:
        raise serializers.ValidationError(f"{field_name} is required.")
    if not NAME_REGEX.match(value):
        raise serializers.ValidationError(
            f"{field_name} should only contain letters, hyphens, or apostrophes."
        )
    if len(value) < min_length:
        raise serializers.ValidationError(
            f"{field_name} must be at least {min_length} characters."
        )
    if len(value) > 50:
        raise serializers.ValidationError(f"{field_name} cannot exceed 50 characters.")
    return value


def validate_email(value, required=True):
    value = (value or "").strip().lower()
    if not value:
        if required:
            raise serializers.ValidationError("Email is required.")
        return value
    if len(value) > 254:
        raise serializers.ValidationError("Email is too long.")
    if not EMAIL_REGEX.match(value):
        raise serializers.ValidationError("Enter a valid email address.")
    return value


def validate_password_strength(value):
    if not value:
        raise serializers.ValidationError("Password is required.")
    if len(value) < MIN_PASSWORD_LENGTH:
        raise serializers.ValidationError("Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", value):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", value):
        raise serializers.ValidationError("Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", value):
        raise serializers.ValidationError("Password must contain at least one number.")
    if not PASSWORD_SPECIAL.search(value):
        raise serializers.ValidationError("Password must contain at least one special character.")
    if value != value.strip():
        raise serializers.ValidationError("Password cannot contain leading or trailing spaces.")
    return value


def validate_dob(value):
    if not value:
        raise serializers.ValidationError("Date of birth is required.")
    today = date.today()
    if value >= today:
        raise serializers.ValidationError("Date of birth cannot be a future date.")
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < 13:
        raise serializers.ValidationError("User must be at least 13 years old.")
    if age > 120:
        raise serializers.ValidationError("Please enter a valid date of birth.")
    return value


def validate_filename(value):
    value = (value or "").strip()
    if not value:
        raise serializers.ValidationError("File name cannot be empty.")
    if len(value) > MAX_FILENAME_LENGTH:
        raise serializers.ValidationError("File name is too long (max 255 characters).")
    if "/" in value or "\\" in value:
        raise serializers.ValidationError("File name cannot contain slashes.")
    if FORBIDDEN_FILENAME_CHARS.search(value):
        raise serializers.ValidationError("File name contains invalid characters.")
    if value in (".", ".."):
        raise serializers.ValidationError("Invalid file name.")
    return value


def validate_share_message(value):
    value = (value or "").strip()
    if len(value) > MAX_MESSAGE_LENGTH:
        raise serializers.ValidationError(
            f"Message cannot exceed {MAX_MESSAGE_LENGTH} characters."
        )
    return value


def validate_expires_in_hours(value):
    if value is None:
        raise serializers.ValidationError("Expiry hours is required.")
    if value < 1 or value > 720:
        raise serializers.ValidationError("Expiry must be between 1 and 720 hours (30 days).")
    return value
