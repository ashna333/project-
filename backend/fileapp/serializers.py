from rest_framework import serializers
from django.contrib.auth import get_user_model
from datetime import date
import re
from .service import register_user
User = get_user_model()


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
     value = value.lower().strip()   # USER@EMAIL.COM → user@email.com
     if User.objects.filter(email=value).exists():
        raise serializers.ValidationError("Email already exists")
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
        return register_user(data)
           
    
    
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
    """Write serializer — used for uploading files."""
    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
    )

    def validate_files(self, files):
        for f in files:
            if f.size > MAX_FILE_SIZE:
                raise serializers.ValidationError(
                    f"'{f.name}' exceeds the 100 MB per-file limit "
                    f"(size: {f.size / (1024*1024):.1f} MB)."
                )
        return files

    def validate(self, attrs):
        """Check that total upload won't exceed 1 GB storage quota."""
        request = self.context.get("request")
        user = request.user

        from django.db.models import Sum
        current_usage = (
            UserFile.objects.filter(user=user)
            .aggregate(total=Sum("file_size"))["total"] or 0
        )
        incoming_size = sum(f.size for f in attrs["files"])

        if current_usage + incoming_size > MAX_STORAGE_PER_USER:
            used_gb = current_usage / (1024 ** 3)
            raise serializers.ValidationError(
                f"Upload would exceed your 1 GB storage limit. "
                f"Currently using {used_gb:.2f} GB."
            )
        return attrs
    
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
    message = serializers.CharField(allow_blank=False, trim_whitespace=True)


class FileShareListSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source="user_file.original_name", read_only=True)
    share_date = serializers.DateTimeField(source="created_at", read_only=True)
    is_accessed = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

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
        ]

    def get_is_accessed(self, obj):
        return obj.accessed_at is not None

    def get_is_expired(self, obj):
        return timezone.now() >= obj.expires_at


class PublicFileShareSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source="user_file.original_name", read_only=True)
    file_size = serializers.IntegerField(source="user_file.file_size", read_only=True)
    mime_type = serializers.CharField(source="user_file.mime_type", read_only=True)

    class Meta:
        model = FileShare
        fields = [
            "file_name",
            "file_size",
            "mime_type",
            "expires_at",
        ]