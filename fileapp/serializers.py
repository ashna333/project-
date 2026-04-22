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

