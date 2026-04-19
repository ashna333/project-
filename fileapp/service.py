from django.contrib.auth import authenticate,get_user_model
from .utils import get_user_tokens
import uuid
from django.core.mail import send_mail        # 👈 add this
from django.conf import settings 
User= get_user_model()


def register_user(data):
    user = User.objects.create_user(
        email=data.get("email"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        dob=data.get("dob"),
        password=data.get("password")
    )

    return user


def login_user(email,password):
   user = authenticate(username=email,password=password)

   if not user:
       return None
   
   tokens = get_user_tokens(user)
   
   return {
       "user": user,
       "tokens":tokens
    }
   

def change_user_password(user,old_password,new_password):
    if not user.check_password(old_password):
        return False
    
    user.set_password(new_password)
    user.save()
    return True


def send_password_reset_email(email):
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return True

    token = str(uuid.uuid4())

    user.reset_token = token
    user.save()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    send_mail(
        subject="Password Reset Request",
        message=(
            f"Hi {user.first_name},\n\n"
            f"Click the link below to reset your password:\n{reset_link}\n\n"
            f"If you did not request this, please ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )

    return True


def reset_user_password(token, new_password):
    try:
        user = User.objects.get(reset_token=token)
    except User.DoesNotExist:
        return False

    user.set_password(new_password)
    user.reset_token = None   # clear token after use — one time use only
    user.save()
    return True

