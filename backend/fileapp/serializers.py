from rest_framework import serializers
from django.contrib.auth import get_user_model
from datetime import date
import re
from .service import register_user
User = get_user_model()
from django.core.mail import send_mail        # 👈 add this
from django.conf import settings 


def validate_name(value, field_name="Name", min_length=2):
    value = value.strip()
    if not re.match(r"^[a-zA-Z\s'\-]+$", value):
        raise serializers.ValidationError(f"{field_name} should only contain letters, hyphens, or apostrophes")
    if len(value) < min_length:
        raise serializers.ValidationError(f"{field_name} must be at least {min_length} characters")
    if len(value) > 50:
        raise serializers.ValidationError(f"{field_name} cannot exceed 50 characters")
    return value

def validate_password_strength(value):
    if len(value) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters")
    if not re.search(r'[A-Z]', value):
        raise serializers.ValidationError("Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', value):
        raise serializers.ValidationError("Password must contain at least one lowercase letter")
    if not re.search(r'[0-9]', value):
        raise serializers.ValidationError("Password must contain at least one number")
    if not re.search(r'[!@#$%^&*()_+\-=;:"<>?/|]', value):
        raise serializers.ValidationError("Password must contain at least one special character")
    if value != value.strip():
        raise serializers.ValidationError("Password cannot contain leading or trailing spaces")
    return value
    


class RegisterSerializer(serializers.ModelSerializer):
    confirm_password=serializers.CharField(write_only =True)

    class Meta:
        model=User
        fields=['first_name','last_name','email','dob','password','confirm_password']
        extra_kwargs = {'password':{ 'write_only':True}}

     #FIELD LEVEL VALIDATION

    def validate_first_name(self, value):
     return validate_name(value, field_name="First name", min_length=2)

    def validate_last_name(self, value):
     return validate_name(value, field_name="Last name", min_length=1)  # allows single letter


    def validate_dob(self,value):

        today =date.today()
        if(value >= today):
            raise serializers.ValidationError("Date of birth cannot be a future date")
        
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))

        if age < 13:
            raise serializers.ValidationError("User must be at least 13 years old")
        
        if age > 120:
           raise serializers.ValidationError("Please enter a valid date of birth")
  
        

        return value


    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists. Please sign in instead."
            )
        return value
    
    def validate_password(self,value):
         return validate_password_strength(value)
    

    # OBJECT LEVEL VALIDATION
    def validate(self, data):
        if data.get('password') != data.get('confirm_password'):
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        data = validated_data.copy()
        data.pop('confirm_password')
        try:
            return register_user(data)
        except ValueError as exc:
            raise serializers.ValidationError({"email": [str(exc)]}) from exc
           
    
    
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password= serializers.CharField(write_only=True)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate_new_password(self,value):
         return validate_password_strength(value)

    def validate(self,data):
        if(data['new_password']!= data['confirm_new_password']):
            raise serializers.ValidationError("Passwords do not match")
        
        
        if(data['old_password']== data['new_password']):
            raise serializers.ValidationError("old and new Passwords are same ")
        

        return data
    
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        return validate_password_strength(value)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "dob", "auth_provider"]




from rest_framework import serializers
from .models import UserFile

MAX_FILE_SIZE = 100 * 1024 * 1024        # 100 MB per file
MAX_STORAGE_PER_USER = 1 * 1024 * 1024 * 1024  # 1 GB total per user


class UserFileSerializer(serializers.ModelSerializer):
    """Read serializer — used for listing/retrieving files."""
    file_size_display = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()

    class Meta:
        model = UserFile
        fields = [
            "id",
            "original_name",
            "is_starred",
            "file_size",
            "file_size_display",
            "mime_type",
            "uploaded_at",
            "url",
        ]

    def get_file_size_display(self, obj):
        """Human-readable file size."""
        size = obj.file_size
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    def get_url(self, obj):
        request = self.context.get("request")
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class FileUploadSerializer(serializers.Serializer):
    files = serializers.ListField(child=serializers.FileField())

    def validate_files(self, value):
        for f in value:
            # 1. Size Check
            if f.size > MAX_FILE_SIZE:
                raise serializers.ValidationError(f"{f.name} is too large.")
            
            # 2. Folder Check (Directories usually have 0 size in these uploads)
            if f.size == 0:
                raise serializers.ValidationError(
                    f"'{f.name}' appears to be a folder. Please upload files only."
                )
        return value
    
class FileRenameSerializer(serializers.Serializer):
    new_name = serializers.CharField(max_length=255, trim_whitespace=True)

    def validate_new_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("File name cannot be empty.")
        # Block path traversal attacks
        if "/" in value or "\\" in value:
            raise serializers.ValidationError("File name cannot contain slashes.")
        return value.strip()


from django.utils import timezone
from .models import FileShare


class FileShareCreateSerializer(serializers.Serializer):
    file_id = serializers.IntegerField(min_value=1)
    recipient_email = serializers.EmailField()
    expires_in_hours = serializers.IntegerField(min_value=1, max_value=720)  # up to 30 days
    message = serializers.CharField(allow_blank=True, trim_whitespace=True)


class FileShareListSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source="user_file.original_name", read_only=True)
    share_date = serializers.DateTimeField(source="created_at", read_only=True)
    is_accessed = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()
        

    class Meta:
        model = FileShare
        fields = [
            "id",
            "file_name",
            "recipient_email",
            "share_date",
            "expires_at",
            "accessed_at",
            "is_accessed",
            "is_expired",
            "token",
            "share_url",
            'is_revoked'
        ]

    def get_is_accessed(self, obj):
        return obj.accessed_at is not None

    def get_is_expired(self, obj):
        return timezone.now() >= obj.expires_at
    def get_share_url(self, obj):
        frontend_base = getattr(settings, "FRONTEND_APP_URL", "http://localhost:5173")
        return f"{frontend_base}/s/{obj.token}/"


# In your serializers.py (Backend)
class PublicFileShareSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source='user_file.original_name',read_only=True)
    file_size = serializers.IntegerField(source='user_file.file_size',read_only=True)
    # Add this to get the sender's name
    sender = serializers.SerializerMethodField(source='owner.username', read_only=True)
    download_url = serializers.SerializerMethodField()
    
   
    class Meta:
        model = FileShare
        fields = ['file_name', 'file_size', 'expires_at', 'message', 'sender',"download_url"]

    def get_sender(self, obj):
        full_name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return full_name or obj.owner.email

    def get_download_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(
                f"/api/public/shares/{obj.token}/download/"
            )
        return f"/api/public/shares/{obj.token}/download/"


# ─── Private sharing serializers ─────────────────────────────────────────────

from .models import PrivateShare, PrivateShareRecipient, ShareComment, ShareAccessLog


class PrivateShareCreateSerializer(serializers.Serializer):
    file_id = serializers.IntegerField(min_value=1)
    recipient_emails = serializers.ListField(child=serializers.EmailField(), min_length=1)
    recipient_permissions = serializers.DictField(required=False, default=dict)
    message = serializers.CharField(allow_blank=True, default="")
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    one_time_access = serializers.BooleanField(default=False)
    max_downloads = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    inactivity_revoke_days = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    time_windows = serializers.ListField(required=False, default=list)
    parent_share_id = serializers.IntegerField(required=False, allow_null=True)

class PrivateShareRecipientSerializer(serializers.ModelSerializer):
    recipient_email = serializers.EmailField(source="recipient.email", read_only=True)
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = PrivateShareRecipient
        fields = [
            "id", "recipient_email", "recipient_name",
            "can_view", "can_download", "can_reshare", "can_comment",
            "download_count", "view_count", "last_accessed_at",
            "is_revoked", "individual_expires_at",
        ]

    def get_recipient_name(self, obj):
        return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip()



class PrivateShareTreeSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_name = serializers.SerializerMethodField()
    recipients = PrivateShareRecipientSerializer(many=True, read_only=True)
    child_shares = serializers.SerializerMethodField()

    class Meta:
        model = PrivateShare
        fields = [
            "id", "owner_email", "owner_name", "expires_at", "is_revoked", "revoked_at",
            "recipients", "child_shares", "created_at"
        ]

    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip()

    def get_child_shares(self, obj):
        # Recursively serialize child shares
        children = obj.child_shares.all()
        return PrivateShareTreeSerializer(children, many=True).data




class PrivateShareOwnerSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source="user_file.original_name", read_only=True)
    file_id = serializers.IntegerField(source="user_file.id", read_only=True)
    recipients = PrivateShareRecipientSerializer(many=True, read_only=True)
    is_expired = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()

    class Meta:
        model = PrivateShare
        fields = [
            "id", "file_id", "file_name", "message", "token",
            "expires_at", "one_time_access", "max_downloads", "download_count",
            "inactivity_revoke_days", "time_windows", "is_revoked", "revoked_at",
            "is_expired", "created_at", "last_accessed_at", "recipients", "analytics",
        ]

    def get_is_expired(self, obj):
        return obj.is_expired

    def get_analytics(self, obj):
        from .service import get_share_analytics
        return get_share_analytics(obj)


class PrivateShareInboxSerializer(serializers.ModelSerializer):
    share_id = serializers.IntegerField(source="private_share.id", read_only=True)
    file_name = serializers.CharField(source="private_share.user_file.original_name", read_only=True)
    file_id = serializers.IntegerField(source="private_share.user_file.id", read_only=True)
    shared_by = serializers.SerializerMethodField()
    shared_by_email = serializers.EmailField(source="private_share.owner.email", read_only=True)
    message = serializers.CharField(source="private_share.message", read_only=True)
    expires_at = serializers.DateTimeField(source="private_share.expires_at", read_only=True)
    is_expired = serializers.SerializerMethodField()
    access_status = serializers.SerializerMethodField()
    requires_password = serializers.SerializerMethodField()

    class Meta:
        model = PrivateShareRecipient
        fields = [
            "id", "share_id", "file_id", "file_name",
            "shared_by", "shared_by_email", "message",
            "can_view", "can_download", "can_reshare", "can_comment",
            "expires_at", "individual_expires_at", "is_expired",
            "access_status", "requires_password",
            "download_count", "view_count", "last_accessed_at", "created_at",
        ]

    def get_shared_by(self, obj):
        o = obj.private_share.owner
        return f"{o.first_name} {o.last_name}".strip() or o.email

    def get_is_expired(self, obj):
        if obj.individual_expires_at and timezone.now() >= obj.individual_expires_at:
            return True
        return obj.private_share.is_expired

    def get_access_status(self, obj):
        from .service import _share_is_accessible
        ok, err = _share_is_accessible(obj.private_share, obj)
        return "accessible" if ok else err

    def get_requires_password(self, obj):
        return bool(obj.private_share.password_hash)


class ShareCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ShareComment
        fields = [
            "id", "content", "page_number", "highlight_text",
            "author_name", "parent", "created_at",
        ]

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip()


class ShareAccessLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, allow_null=True)

    class Meta:
        model = ShareAccessLog
        fields = ["id", "action", "actor_email", "ip_address", "metadata", "created_at"]