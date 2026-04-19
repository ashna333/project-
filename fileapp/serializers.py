from rest_framework import serializers
from django.contrib.auth import get_user_model
from datetime import date
import re
User = get_user_model()


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
    return value


class RegisterSerializer(serializers.ModelSerializer):
    confirm_password=serializers.CharField(write_only =True)

    class Meta:
        model=User
        fields=['first_name','last_name','email','dob','password','confirm_password']
        extra_kwargs = {'password':{ 'write_only':True}}

     #FIELD LEVEL VALIDATION

    def validate_first_name(self,value):
        if not value.isalpha():
            raise serializers.ValidationError("First name should only contain letters")
        return value

    def validate_last_name(self,value):
        if not value.isalpha():
            raise serializers.ValidationError("Last name should only contain letters")
        return value

    def validate_dob(self,value):

        today =date.today()
        if(value >= today):
            raise serializers.ValidationError("DOB should be in past")
        
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))

        if age < 13:
            raise serializers.ValidationError("User must be at least 13 years old")
        

        return value


    def validate_email(self,value):
        
        
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")

        return value
    
    def validate_password(self,value):
         return validate_password_strength(value)
      



     # OBJECT LEVEL VALIDATION    

    def validate(self,data):
        if(data['password']!=data['confirm_password']):
            raise serializers.ValidationError("Passwords do not match")
        return data
           
    
    
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password= serializers.CharField()
    confirm_new_password = serializers.CharField()

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
    new_password = serializers.CharField()
    confirm_new_password = serializers.CharField()

    def validate_new_password(self, value):
        return validate_password_strength(value)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data

