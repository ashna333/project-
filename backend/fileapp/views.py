from datetime import timezone
import token
from .models import FileShare, UserFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import redirect
from urllib.parse import urlencode
from .serializers import (
    RegisterSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
)
from .service import (
    register_user,
    login_user,
    build_google_auth_url,
    login_with_google_code,
    change_user_password,
    send_password_reset_email,
    reset_user_password,
    restore_all_user_trash,
    empty_user_trash,
    toggle_file_star,
)
from django.conf import settings
from django.utils import timezone

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
            except Exception as exc:
                from django.db import IntegrityError
                if isinstance(exc, IntegrityError):
                    return Response(
                        {"email": ["An account with this email already exists. Please sign in instead."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                raise
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class LoginView(APIView):
    def post(self,request):
       data = login_user(request.data.get("email"),request.data.get("password"))

       if not data :
           return Response({"error":"Invalid credentials"},status=status.HTTP_400_BAD_REQUEST)
       

       return Response({
           "message":"Logged in successfully",
           "tokens":data['tokens'],
           "user": UserProfileSerializer(data["user"]).data

       })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)


class GoogleAuthStartView(APIView):
    def get(self, request):
        if not getattr(settings, "GOOGLE_CLIENT_ID", "") or not getattr(settings, "GOOGLE_CLIENT_SECRET", ""):
            return Response(
                {"error": "Google sign-in is not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return redirect(build_google_auth_url())


class GoogleAuthCallbackView(APIView):
    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            return redirect(f"{settings.FRONTEND_APP_URL}/auth/google/callback?error=missing_code")

        try:
            data = login_with_google_code(code)
        except ValueError:
            return redirect(f"{settings.FRONTEND_APP_URL}/auth/google/callback?error=google_auth_failed")

        user = UserProfileSerializer(data["user"]).data
        query = urlencode({
            "access": data["tokens"]["access"],
            "refresh": data["tokens"]["refresh"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "dob": user["dob"],
            "display_name": user.get("display_name", ""),
        })
        return redirect(f"{settings.FRONTEND_APP_URL}/auth/google/callback?{query}")


class ChangePasswordView(APIView):
    permission_classes=[IsAuthenticated]

    def post(self,request):
        if request.user.auth_provider == "google" and not request.user.has_usable_password():
            return Response(
                {"error": "Password change is not available for Google-authenticated accounts."},
                status=status.HTTP_403_FORBIDDEN
            )

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
            success, message = reset_user_password(   # ✅ unpack the tuple
                serializer.validated_data.get("token"),
                serializer.validated_data.get("new_password")
            )
            if not success:
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)  # ✅ use actual message
            return Response({"message": message})  # ✅ use actual message
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
    check_upload_conflicts,
    list_user_files,
    delete_user_file,
    get_user_file,
    get_storage_summary,
    rename_user_file,
    list_user_trash,
    restore_user_file,
    permanently_delete_user_file,
)


class FilePagination(PageNumberPagination):
    page_size = 12  
    page_size_query_param = "page_size"
    max_page_size = 100


class UploadCheckView(APIView):
    """POST /api/upload/check/ — detect duplicate files before upload."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FileUploadSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        files = request.FILES.getlist("files")
        conflicts = check_upload_conflicts(request.user, files)
        return Response({
            "has_conflicts": len(conflicts) > 0,
            "conflicts": conflicts,
            "total_files": len(files),
        })


class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FileUploadSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        files = request.FILES.getlist('files')
        resolutions = {}
        raw_resolutions = request.data.get("resolutions")
        if raw_resolutions:
            import json
            resolutions = json.loads(raw_resolutions) if isinstance(raw_resolutions, str) else raw_resolutions

        created, skipped = upload_files(request.user, files, resolutions=resolutions)

        if len(created) > 0:
            msg = f"Successfully uploaded {len(created)} file(s)."
        else:
            msg = "No new files were uploaded."

        return Response({
            "message": msg,
            "skipped": skipped,
            "created_count": len(created)
        }, status=status.HTTP_201_CREATED)


class FileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        
        # 1. GET THE PARAMETER FROM THE URL
        is_starred = request.query_params.get('is_starred')

        # 2. START WITH YOUR BASE FILES
        qs = list_user_files(request.user, search=search or None).filter(is_deleted=False)

        # 3. APPLY THE STAR FILTER MANUALLY HERE
        if is_starred == 'true':
            qs = qs.filter(is_starred=True)

        # 4. PAGINATE AND RETURN
        paginator = FilePagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = UserFileSerializer(page, many=True, context={"request": request})
        storage = get_storage_summary(request.user)

        return paginator.get_paginated_response(
            {
                "files": serializer.data,
                "storage": storage,
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





class FileToggleStarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        user_file = toggle_file_star(request.user, file_id) # Call Service
        if not user_file:
            return Response(
                {"error": "File not found or permission denied."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            "id": user_file.id,
            "is_starred": user_file.is_starred,
            "message": "File status updated."
        }, status=status.HTTP_200_OK)
    
        
class StorageSummaryView(APIView):
    """
    GET /api/files/storage/
    Returns storage usage summary for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        storage = get_storage_summary(request.user)
        return Response(storage)


class TrashListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        qs = list_user_trash(request.user, search=search or None)
        paginator = FilePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UserFileSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response({"files": serializer.data})


class TrashRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        restored = restore_user_file(request.user, file_id)
        if not restored:
            return Response({"error": "File not found in trash."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"message": "File restored successfully."})


class TrashDeletePermanentView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, file_id):
        deleted = permanently_delete_user_file(request.user, file_id)
        if not deleted:
            return Response({"error": "File not found in trash."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"message": "File permanently deleted."})


from rest_framework.permissions import AllowAny
from .serializers import (
    FileShareCreateSerializer,
    FileShareListSerializer,
    PublicFileShareSerializer,
)
from .service import (
    create_file_share,
    list_user_shares,
    get_valid_share_by_token,
    mark_share_accessed,
)


class FileShareView(APIView):
    """
    POST /api/shares/
    Create a share link for a file owned by the authenticated user.

    GET /api/shares/?search=<term>&page=<n>&page_size=<n>
    List all shares created by the authenticated user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        qs = list_user_shares(request.user, search=search or None)

        paginator = FilePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = FileShareListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response({"shares": serializer.data})
        

    def post(self, request):
        serializer = FileShareCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        share, share_url = create_file_share(
            owner=request.user,
            file_id=serializer.validated_data["file_id"],
            recipient_email=serializer.validated_data["recipient_email"],
            expires_in_hours=serializer.validated_data["expires_in_hours"],
            message=serializer.validated_data["message"],
            request=request,
        )
        if share is None:
            return Response(
                {"error": "File not found or you do not have permission."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "message": "Share link created and email sent.",
                "share_url": share_url,
                "expires_at": share.expires_at,
                "share": FileShareListSerializer(share).data,
            },
            status=status.HTTP_201_CREATED,
        )
        

class PublicShareDetailView(APIView):
    """
    GET /api/public/shares/<token>/
    Public endpoint to view share metadata (also marks as accessed).
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            # Look up the share by its unique token
            share = FileShare.objects.get(token=token)

            # Check if it was revoked or expired
            if share.is_revoked:
                return Response({"error": "Link revoked"}, status=403)
            if share.is_expired:
                return Response({"error": "Link expired"}, status=410)


            if not share.is_accessed:
                share.is_accessed = True
                share.accessed_at = timezone.now() # Good practice to track WHEN
                share.save()

            # 4. Return data to frontend
            serializer = PublicFileShareSerializer(share, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileShare.DoesNotExist:
            return Response({"error": "Invalid link."}, status=status.HTTP_404_NOT_FOUND)
       




            # 3. TRIGGER STATUS CHANGE HERE
            # This runs whether they clicked the email OR pasted the link.
           
            return Response(serializer.data)

        except FileShare.DoesNotExist:
            return Response({"error": "Invalid link"}, status=404)
        
class PublicShareDownloadView(APIView):
    """
    GET /api/public/shares/<token>/download/
    Public endpoint to download the shared file (marks as accessed).
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        share = get_valid_share_by_token(token)
        if not share:
            return Response(
                {"error": "Invalid or expired share link."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_file = share.user_file
        if not user_file.file or not os.path.isfile(user_file.file.path):
            return Response(
                {"error": "File not found on server."},
                status=status.HTTP_404_NOT_FOUND,
            )

        mark_share_accessed(share)

        response = FileResponse(
            open(user_file.file.path, "rb"),
            as_attachment=True,
            filename=user_file.original_name,
        )
        response["Content-Type"] = user_file.mime_type or "application/octet-stream"
        response["Content-Length"] = user_file.file_size
        return response
    


class FileShareDeleteView(APIView):
    """
    DELETE /api/shares/<share_id>/delete/
    Revoke a share so the public link stops working.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, share_id):
        try:
            share = FileShare.objects.get(id=share_id, owner=request.user)
            

            # Delete share = token invalid instantly
            share.is_revoked = True
            share.save()

            return Response(
                {"message": "Share revoked successfully."},
                status=status.HTTP_200_OK,
            )

        except FileShare.DoesNotExist:
            return Response(
                {"error": "Share not found or permission denied."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
class TrashRestoreAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = restore_all_user_trash(request.user) # Call Service
        return Response({
            "message": f"Successfully restored {count} files.",
            "restored_count": count
        })

class TrashDeleteAllPermanentView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        count = empty_user_trash(request.user) # Call Service
        return Response({
            "message": f"Permanently deleted {count} files.",
            "deleted_count": count
        })