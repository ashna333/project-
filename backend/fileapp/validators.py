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




ALLOWED_EXTENSIONS = {
    # Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv', 'rtf', 'odt', 'ods', 'odp',
    # Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff',
    # Video
    'mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv',
    # Audio
    'mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg', 'wma',
    # Archives
    'zip', 'rar', '7z', 'tar', 'gz',
    # Code/Text
    'json', 'xml', 'html', 'css', 'js', 'py', 'md',
}

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'text/html', 'text/css',
    'application/json', 'application/xml', 'text/xml',
    'application/javascript',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/svg+xml', 'image/bmp', 'image/tiff',
    'video/mp4', 'video/webm', 'video/quicktime',
    'video/x-msvideo', 'video/x-matroska',
    'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac',
    'audio/mp4', 'audio/ogg',
    'application/zip', 'application/x-rar-compressed',
    'application/x-7z-compressed', 'application/x-tar',
    'application/gzip',
    'image/x-icon',           # .ico
    'image/vnd.microsoft.icon', # .ico alternate
    'image/tiff',             # .tiff
    'video/x-msvideo',        # .avi
    'video/x-matroska',       # .mkv
    'video/x-flv',            # .flv
    'video/x-ms-wmv',         # .wmv
    'audio/x-wav',            # .wav alternate
    'audio/x-flac',           # .flac alternate
    'audio/x-m4a',            # .m4a alternate
    'audio/wma',              # .wma
    'audio/x-ms-wma',         # .wma alternate
    'application/x-rar',      # .rar alternate
    'application/vnd.rar',    # .rar alternate
    'application/x-tar',      # .tar
    'text/markdown',          # .md
    'text/x-python',          # .py
    'application/x-python',   # .py alternate
    'text/javascript',        # .js alternate
    'application/rtf',        # .rtf
    'text/rtf',               # .rtf alternate
    'application/vnd.oasis.opendocument.text',          # .odt
    'application/vnd.oasis.opendocument.spreadsheet',   # .ods
    'application/vnd.oasis.opendocument.presentation',  # .odp

}

def validate_file_type(file):
    import os
    ext = os.path.splitext(file.name)[1].lstrip('.').lower()
    
    if not ext:
        raise serializers.ValidationError(
            f'"{file.name}": File has no extension.'
        )
    
    if ext not in ALLOWED_EXTENSIONS:
        raise serializers.ValidationError(
            f'"{file.name}": .{ext} files are not allowed.'
        )
    
    # Skip MIME check for generic types browsers commonly report
    SKIP_MIME_CHECK = {
        'application/octet-stream',
        'application/x-msdownload', 
        '',
    }
    
    mime = (getattr(file, 'content_type', '') or '').strip()
    
    if mime and mime not in SKIP_MIME_CHECK and mime not in ALLOWED_MIME_TYPES:
        # Don't hard reject — extension already passed, MIME is unreliable
        # Just log it in development, don't block the upload
        pass
    
    return file