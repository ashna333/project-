from rest_framework import serializers
from django.contrib.auth import get_user_model
from .service import register_user
from .validators import (
    validate_name,
    validate_email,
    validate_password_strength,
    validate_dob,
    validate_filename,
    validate_share_message,
    validate_expires_in_hours,
    MAX_FILE_SIZE,
    MAX_FILES_PER_UPLOAD,
    MAX_MESSAGE_LENGTH,
)

from rest_framework import serializers
from .models import UserFile
from django.conf import settings
from .validators import validate_file_type

User = get_user_model()

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return validate_email(value)

    def validate_password(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Password is required.")
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


    def validate_dob(self, value):
        return validate_dob(value)

    def validate_email(self, value):
        value = validate_email(value)
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

    def validate_email(self, value):
        return validate_email(value)


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
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
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "dob", "auth_provider", "display_name"]

    def get_display_name(self, obj):
        from .service import get_user_display_name
        return get_user_display_name(obj)


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "dob"]

    def validate_first_name(self, value):
        return validate_name(value, field_name="First name", min_length=2)

    def validate_last_name(self, value):
        return validate_name(value, field_name="Last name", min_length=1)

    def validate_dob(self, value):
        return validate_dob(value)



class UserFileSerializer(serializers.ModelSerializer):

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
        if not value:
            raise serializers.ValidationError("At least one file is required.")
        if len(value) > MAX_FILES_PER_UPLOAD:
            raise serializers.ValidationError(
                f"You can upload at most {MAX_FILES_PER_UPLOAD} files at once."
            )
        for f in value:
            if f.size > MAX_FILE_SIZE:
                raise serializers.ValidationError(
                    f'"{f.name}" exceeds the 100 MB per-file limit.'
                )
            if f.size == 0:
                raise serializers.ValidationError(
                    f'"{f.name}" appears to be a folder. Please upload files only.'
                )
            validate_file_type(f)
            try:
                validate_filename(f.name)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError(
                    f'"{f.name}": {exc.detail[0] if isinstance(exc.detail, list) else exc.detail}'
                ) from exc
        return value

class FileRenameSerializer(serializers.Serializer):
    new_name = serializers.CharField(max_length=255, trim_whitespace=True)

    def validate_new_name(self, value):
        return validate_filename(value)


from django.utils import timezone
from .models import FileShare


class FileShareCreateSerializer(serializers.Serializer):
    file_id = serializers.IntegerField(min_value=1)
    recipient_email = serializers.EmailField()
    expires_in_hours = serializers.IntegerField(required=False, default=0, min_value=0)
    expires_in_minutes = serializers.IntegerField(required=False, default=0, min_value=0)
    message = serializers.CharField(allow_blank=True, trim_whitespace=True, max_length=MAX_MESSAGE_LENGTH)

    def validate_recipient_email(self, value):
        return validate_email(value)

    def validate_expires_in_hours(self, value):
        return validate_expires_in_hours(value)

    def validate_message(self, value):
        return validate_share_message(value)


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


class PublicFileShareSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source='user_file.original_name',read_only=True)
    file_size = serializers.IntegerField(source='user_file.file_size',read_only=True)
    sender = serializers.SerializerMethodField(source='owner.username', read_only=True)
    download_url = serializers.SerializerMethodField()
    
   
    class Meta:
        model = FileShare
        fields = ['file_name', 'file_size', 'expires_at', 'message', 'sender',"download_url"]

    def get_sender(self, obj):
        from .service import get_user_display_name
        return get_user_display_name(obj.owner) or obj.owner.email

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
    recipient_emails = serializers.ListField(child=serializers.EmailField(), min_length=1, max_length=20)
    recipient_permissions = serializers.DictField(required=False, default=dict)
    message = serializers.CharField(allow_blank=True, default="", max_length=MAX_MESSAGE_LENGTH)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=128)
    one_time_access = serializers.BooleanField(default=False)
    max_downloads = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=10000)
    time_windows = serializers.ListField(required=False, default=list)
    parent_share_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_recipient_emails(self, value):
        cleaned = []
        for raw in value:
            cleaned.append(validate_email(raw))
        if len(cleaned) != len(set(cleaned)):
            raise serializers.ValidationError("Duplicate recipient emails are not allowed.")
        return cleaned

    def validate_message(self, value):
        return validate_share_message(value)

    def validate_password(self, value):
        if value and len(value) < 4:
            raise serializers.ValidationError("Share password must be at least 4 characters.")
        return value

    def validate(self, data):
        if data.get("expires_at"):
            from django.utils import timezone
            if data["expires_at"] <= timezone.now():
                raise serializers.ValidationError({"expires_at": "Expiry must be in the future."})
        return data


class UserLookupSerializer(serializers.Serializer):
    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=20,
    )

    def validate_emails(self, value):
        return [validate_email(e) for e in value]


class ShareCommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=2000, trim_whitespace=True)
    page_number = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    highlight_text = serializers.CharField(required=False, allow_blank=True, max_length=500)
    parent_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    def validate_content(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("Comment cannot be empty.")
        if len(value.strip()) > 2000:
            raise serializers.ValidationError("Comment cannot exceed 2000 characters.")
        return value.strip()


class TransferOwnershipSerializer(serializers.Serializer):
    new_owner_email = serializers.EmailField()

    def validate_new_owner_email(self, value):
        return validate_email(value)

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
        from .service import get_user_display_name
        return get_user_display_name(obj.recipient)



class PrivateShareTreeSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_name = serializers.SerializerMethodField()
    recipients = PrivateShareRecipientSerializer(many=True, read_only=True)
    child_shares = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()  # ← add this

    class Meta:
        model = PrivateShare
        fields = [
            "id", "owner_email", "owner_name", "expires_at", "is_expired",
            "is_revoked", "revoked_at", "recipients", "child_shares", "created_at"
        ]

    def get_is_expired(self, obj):  # ← add this
        return obj.is_expired

    def get_owner_name(self, obj):
        from .service import get_user_display_name
        return get_user_display_name(obj.owner)

    def get_child_shares(self, obj):
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
             "time_windows", "is_revoked", "revoked_at",
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
    one_time_access = serializers.BooleanField(source='private_share.one_time_access', read_only=True)

    class Meta:
        model = PrivateShareRecipient
        fields = [
            "id", "share_id", "file_id", "file_name",
            "shared_by", "shared_by_email", "message",
            "can_view", "can_download", "can_reshare", "can_comment",
            "expires_at", "individual_expires_at", "is_expired",'one_time_access',
            "access_status", "requires_password",
            "download_count", "view_count", "last_accessed_at", "created_at",
        ]

    def get_shared_by(self, obj):
        from .service import get_user_display_name
        o = obj.private_share.owner
        return get_user_display_name(o) or o.email

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
        from .service import get_user_display_name
        return get_user_display_name(obj.author)


class ShareAccessLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, allow_null=True)
    actor_name = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()

    class Meta:
        model = ShareAccessLog
        fields = [
            "id", "action", "action_label", "actor_email", "actor_name",
            "ip_address", "metadata", "created_at",
        ]

    def get_actor_name(self, obj):
        from .service import get_user_display_name
        if not obj.actor:
            return "—"
        return get_user_display_name(obj.actor) or obj.actor.email

    def get_action_label(self, obj):
        labels = {
            "view": "Viewed",
            "download": "Downloaded",
            "comment": "Commented",
            "revoke": "Revoked",
            "reshare": "Re-shared",
            "create": "Shared",
            "transfer": "Transferred",
        }
        label = labels.get(obj.action, obj.action)
        if obj.action == "view" and obj.metadata.get("preview"):
            return "Previewed"
        return label