from datetime import timezone
from django.conf import settings
from django.db.models import Sum
import os
from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import token
from .models import FileShare, UserFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework import status
from django.shortcuts import redirect
from urllib.parse import urlencode
from .models import FileShare, UserFile, PrivateShare,PrivateShareRecipient
from .tokens import token_generator
from .serializers import FileUploadSerializer, UserFileSerializer,FileRenameSerializer
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth import get_user_model
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
    create_file_share,
    list_user_shares,
    get_valid_share_by_token,
    mark_share_accessed,
)

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
     FileShareCreateSerializer,
    FileShareListSerializer,
    PublicFileShareSerializer,
)


User = get_user_model()

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
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = login_user(
            serializer.validated_data["email"],
            serializer.validated_data["password"],
        )

        if not data:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
       

        return Response({
           "message":"Logged in successfully",
           "tokens":data['tokens'],
           "user": UserProfileSerializer(data["user"]).data

       })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
    permission_classes = []  
    def post(self,request):
       serializer=ForgotPasswordSerializer(data=request.data)
       if serializer.is_valid():
           send_password_reset_email(serializer.validated_data.get('email'))
           return Response({"message":"If email id existes, reset link will be sent"})
       return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)


class VerifyResetTokenView(APIView):
    permission_classes = []

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError):
            return Response({"error": "Invalid or expired token"}, status=400)

        if not token_generator.check_token(user, token):
            return Response({"error": "Invalid or expired token"}, status=400)

        return Response({"valid": True})


class ResetPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            success, message = reset_user_password(
                serializer.validated_data['uid'],
                serializer.validated_data['token'],
                serializer.validated_data['new_password']
            )
            if not success:
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"message": message})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




class FilePagination(PageNumberPagination):
    page_size = 9 
    page_size_query_param = "page_size"
    max_page_size = 100


class UploadCheckView(APIView):
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

    def post(self, request):

        used = UserFile.objects.filter(
            user=request.user,
            is_deleted=False
        ).aggregate(total=Sum('file_size'))['total'] or 0

        limit = getattr(
            settings,
            'USER_STORAGE_LIMIT_BYTES',
            1 * 1024 * 1024 * 1024
        )

        remaining = limit - used

        files = request.FILES.getlist('files')

        serializer = FileUploadSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        resolutions = {}
        raw_resolutions = request.data.get("resolutions")

        if raw_resolutions:
            import json
            resolutions = (
                json.loads(raw_resolutions)
                if isinstance(raw_resolutions, str)
                else raw_resolutions
            )

        allowed_files = []
        skipped = []

        for file in files:

            if file.size <= remaining:
                allowed_files.append(file)
                remaining -= file.size

            else:
                skipped.append({
                    "name": file.name,
                    "reason": "Storage limit exceeded"
                })

        created = []

        if allowed_files:
            created, upload_skipped = upload_files(
                request.user,
                allowed_files,
                resolutions=resolutions
            )

            skipped.extend(upload_skipped)

        if len(created) > 0:
            msg = f"Successfully uploaded {len(created)} file(s)."
        else:
            msg = "No files could be uploaded."

        return Response({
            "message": msg,
            "created_count": len(created),
            "uploaded": [f.original_name for f in created],
            "skipped": skipped,
            "remaining_bytes": remaining,
        }, status=status.HTTP_201_CREATED)



class FileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        is_starred = request.query_params.get('is_starred')
        file_type = request.query_params.get('file_type')
        uploaded = request.query_params.get('uploaded')

        ALLOWED_ORDERING = {
            'original_name', '-original_name',
            'uploaded_at', '-uploaded_at',
            'file_size', '-file_size',
        }
        ordering = request.query_params.get('ordering', '-uploaded_at')
        if ordering not in ALLOWED_ORDERING:
            ordering = '-uploaded_at'

        qs = list_user_files(request.user, search=search or None, ordering=ordering)  # removed .filter(is_deleted=False)

        if is_starred == 'true':
            qs = qs.filter(is_starred=True)

        if file_type:
            if file_type == 'image':
                qs = qs.filter(original_name__iregex=r'\.(jpg|jpeg|png|gif|svg|webp|bmp)$')
            elif file_type == 'pdf':
                qs = qs.filter(original_name__iendswith='.pdf')
            elif file_type == 'document':
                qs = qs.filter(original_name__iregex=r'\.(doc|docx|xls|xlsx|txt|csv|ppt|pptx)$')
            elif file_type == 'video':
                qs = qs.filter(original_name__iregex=r'\.(mp4|webm|mov|avi|mkv)$')
            elif file_type == 'audio':
                qs = qs.filter(original_name__iregex=r'\.(mp3|wav|aac|flac|m4a|ogg)$')
            elif file_type == 'other':
                qs = qs.exclude(original_name__iregex=r'\.(jpg|jpeg|png|gif|svg|webp|bmp|pdf|doc|docx|xls|xlsx|txt|csv|ppt|pptx)$')

        if uploaded:
            now = timezone.now()
            if uploaded == 'today':
                qs = qs.filter(uploaded_at__date=now.date())
            elif uploaded == 'week':
                qs = qs.filter(uploaded_at__gte=now - timedelta(days=7))
            elif uploaded == 'month':
                qs = qs.filter(uploaded_at__gte=now - timedelta(days=30))

      

        paginator = FilePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UserFileSerializer(page, many=True, context={"request": request})
        storage = get_storage_summary(request.user)

        return paginator.get_paginated_response({"files": serializer.data, "storage": storage})

class FileDeleteView(APIView):
    
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
        result = permanently_delete_user_file(request.user, file_id)
        if result == "not_found":
            return Response(
                {"error": "File not found in trash."},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({"message": "File permanently deleted.", "status": "deleted"})




class FileShareView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        status = request.query_params.get("status", "")
        
        qs = list_user_shares(request.user, search=search or None)
        
        now = timezone.now()
        
        if status == "revoked":
            qs = qs.filter(is_revoked=True)
        elif status == "expired":
            qs = qs.filter(is_revoked=False, expires_at__lt=now)
        elif status == "active":
            qs = qs.filter(is_revoked=False, expires_at__gte=now)

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

    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            share = FileShare.objects.get(token=token)

           
            if share.is_revoked:
                return Response({"error": "Link revoked"}, status=403)
            if share.is_expired:
                return Response({"error": "Link expired"}, status=410)


            if not share.is_accessed:
                share.is_accessed = True
                share.accessed_at = timezone.now() # Good practice to track WHEN
                share.save()

            serializer = PublicFileShareSerializer(share, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileShare.DoesNotExist:
            return Response({"error": "Invalid link."}, status=status.HTTP_404_NOT_FOUND)
       

        
class PublicShareDownloadView(APIView):
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
    permission_classes = [IsAuthenticated]

    def delete(self, request, share_id):
        try:
            share = FileShare.objects.get(id=share_id, owner=request.user)
            
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
        deleted, deferred = empty_user_trash(request.user)
        return Response({
            "message": f"Permanently deleted {deleted} files.",
            "deleted_count": deleted,
            "deferred_count": deferred,
        })


class ExpiringSoonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        in_24h = now + timedelta(hours=24)

        private_count = PrivateShareRecipient.objects.filter(
            recipient=request.user,
            is_revoked=False,
            private_share__is_revoked=False,
            private_share__expires_at__gt=now,
            private_share__expires_at__lte=in_24h,
        ).count()

        return Response({"count": private_count})
    

class ExpiringSoonDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        in_24h = now + timedelta(hours=24)

        # Private: shares RECEIVED BY YOU expiring soon
        private_grants = PrivateShareRecipient.objects.filter(
            recipient=request.user,
            is_revoked=False,
            private_share__is_revoked=False,
            private_share__expires_at__gt=now,
            private_share__expires_at__lte=in_24h,
        ).select_related('private_share__user_file', 'private_share__owner')


        private_data = []
        for g in private_grants:
            share = g.private_share
            private_data.append({
                'id': share.id,
                'grant_id': g.id,
                'file_name': share.user_file.original_name,
                'shared_by': share.owner.email,
                'expires_at': share.expires_at,
                'can_download': g.can_download,
                'can_view': g.can_view,
                'can_comment': g.can_comment,
                'download_count': g.download_count,
                'one_time_access': share.one_time_access,
            })

        return Response({
            
            'private': private_data,
            'total':len(private_data),
        })