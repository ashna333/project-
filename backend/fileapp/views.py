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



import os
from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework import status

from .serializers import FileUploadSerializer, UserFileSerializer,FileRenameSerializer
from .service import (
    upload_files,
    list_user_files,
    delete_user_file,
    get_user_file,
    get_storage_summary,
    rename_user_file
)


class FilePagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = "page_size"
    max_page_size = 100


class FileUploadView(APIView):
    """
    POST /api/files/upload/
    Upload one or more files (multipart/form-data).
    Field name: files (can repeat for multiple files)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FileUploadSerializer(
            data={"files": request.FILES.getlist("files")},
            context={"request": request},
        )
        if serializer.is_valid():
            created, skipped = upload_files(request.user, serializer.validated_data["files"])  # 👈 unpack both
            response_serializer = UserFileSerializer(
                created, many=True, context={"request": request}
            )
            return Response(
                {
                    "message": f"{len(created)} file(s) uploaded successfully.",
                    "skipped_duplicates": skipped,  # 👈 new
                    "files": response_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileListView(APIView):
    """
    GET /api/files/?search=<term>&page=<n>&page_size=<n>
    List all files for the authenticated user with pagination and search.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        qs = list_user_files(request.user, search=search or None)

        paginator = FilePagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = UserFileSerializer(page, many=True, context={"request": request})
        storage = get_storage_summary(request.user)

        return paginator.get_paginated_response(
            {
                "files": serializer.data
            }
        )


class FileDeleteView(APIView):
    """
    DELETE /api/files/<id>/delete/
    Delete a file owned by the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, file_id):
        success = delete_user_file(request.user, file_id)
        if not success:
            return Response(
                {"error": "File not found or you do not have permission to delete it."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"message": "File deleted successfully."},
            status=status.HTTP_200_OK,
        )


class FileDownloadView(APIView):
    """
    GET /api/files/<id>/download/
    Stream-download a file owned by the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        user_file = get_user_file(request.user, file_id)
        if not user_file:
            return Response(
                {"error": "File not found or you do not have permission to access it."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not os.path.isfile(user_file.file.path):
            return Response(
                {"error": "File not found on server."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = FileResponse(
            open(user_file.file.path, "rb"),
            as_attachment=True,
            filename=user_file.original_name,
        )
        response["Content-Type"] = user_file.mime_type or "application/octet-stream"
        response["Content-Length"] = user_file.file_size
        return response

class FileRenameView(APIView):
    """
    PATCH /api/<id>/rename/
    Rename a file owned by the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, file_id):
        serializer = FileRenameSerializer(data=request.data)
        if serializer.is_valid():
            user_file = rename_user_file(
                request.user,
                file_id,
                serializer.validated_data["new_name"]
            )
            if not user_file:
                return Response(
                    {"error": "File not found or you do not have permission."},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {
                    "message": "File renamed successfully.",
                    "file": UserFileSerializer(user_file, context={"request": request}).data
                }
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StorageSummaryView(APIView):
    """
    GET /api/files/storage/
    Returns storage usage summary for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        storage = get_storage_summary(request.user)
        return Response(storage)