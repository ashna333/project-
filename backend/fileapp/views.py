from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import (
    RegisterSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer
)
from .service import (
    register_user,
    login_user,
    change_user_password,
    send_password_reset_email,
    reset_user_password
)

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()  
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class LoginView(APIView):
    def post(self,request):
       data = login_user(request.data.get("email"),request.data.get("password"))

       if not data :
           return Response({"error":"Invalid credentials"},status=status.HTTP_400_BAD_REQUEST)
       

       return Response({
           "message":"Logged in successfully",
           "tokens":data['tokens']

       })


class ChangePasswordView(APIView):
    permission_classes=[IsAuthenticated]

    def post(self,request):
        serializer = ChangePasswordSerializer(data=request.data)

        if serializer.is_valid():
            success=change_user_password(request.user,serializer.validated_data.get('old_password'),
                                         serializer.validated_data.get('new_password'))
            
            if not success:
                return Response(
                    {"error":"Wrong old password"},status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({"message": "Password changed successfully"})

            
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)
    
class ForgotPasswordView(APIView):
    def post(self,request):
       serializer=ForgotPasswordSerializer(data=request.data)
       if serializer.is_valid():
           send_password_reset_email(serializer.validated_data.get('email'))
           return Response({"message":"If email id existes, reset link will be sent"})
       return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)




class ResetPasswordView(APIView):
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            success = reset_user_password(
                serializer.validated_data.get("token"),
                serializer.validated_data.get("new_password")
            )
            if not success:
                return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"message": "Password reset successfully"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

