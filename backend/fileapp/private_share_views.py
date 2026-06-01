import os
from django.conf import settings
from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from datetime import timedelta
from django.db import models as db_models
from django.utils import timezone

from .serializers import (
    PrivateShareCreateSerializer,
    PrivateShareOwnerSerializer,
    PrivateShareInboxSerializer,
    ShareCommentSerializer,
    ShareAccessLogSerializer,
    UserLookupSerializer,
    ShareCommentCreateSerializer,
    TransferOwnershipSerializer,
)
from .service import (
    create_private_share,
    list_private_shares_by_owner,
    list_private_shares_for_recipient,
    get_recipient_grant,
    verify_private_share_password,
    record_private_share_view,
    record_private_share_download,
    revoke_private_share,
    revoke_private_share_recipient,
    transfer_file_ownership,
    add_share_comment,
    get_share_access_logs,
    get_share_analytics,
    _log_share_access,
    upload_file_version,
    apply_watermark_to_file,
    lookup_users_by_email,
)
from .models import PrivateShare, ShareComment, ShareAccessLog


class FilePagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"
    max_page_size = 100


class PrivateShareCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PrivateShareCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        result = create_private_share(
            owner=request.user,
            file_id=data["file_id"],
            recipient_emails=data["recipient_emails"],
            recipient_permissions=data.get("recipient_permissions", {}),
            message=data.get("message", ""),
            expires_at=data.get("expires_at"),
            password=data.get("password"),
            one_time_access=data.get("one_time_access", False),
            max_downloads=data.get("max_downloads"),
            time_windows=data.get("time_windows", []),
            request=request,
            parent_share_id=data.get("parent_share_id"),
        )
        if result[0] is None:
            err = result[1]
            code = status.HTTP_400_BAD_REQUEST if "not registered" in str(err).lower() else status.HTTP_404_NOT_FOUND
            return Response({"error": err}, status=code)

        share, meta = result
        recipients = meta["recipients"]
        emails_sent = meta.get("emails_sent", 0)

        from .service import get_user_display_name

        if len(recipients) == 1:
            name = get_user_display_name(recipients[0].recipient)
            msg = f"File shared with {name}."
        else:
            msg = f"File shared with {len(recipients)} people."

        if emails_sent > 0:
            msg += " A notification email has been sent."

        return Response(
            {
                "message": msg,
                "share_id": share.id,
                "recipients_count": len(recipients),
                "emails_sent": emails_sent,
                "email_delivery": "smtp" if getattr(settings, "EMAIL_HOST", "") else "dev_file",
                "unregistered": meta.get("unregistered", []),
                "skipped_self": meta.get("skipped_self", []),
            },
            status=status.HTTP_201_CREATED,
        )

class PrivateShareOwnerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get("status")
        qs = list_private_shares_by_owner(request.user, status_filter=status_filter)
        paginator = FilePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = PrivateShareOwnerSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response({"shares": serializer.data})
    

from datetime import timedelta
from django.db import models as db_models
from django.utils import timezone

class PrivateShareInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = list_private_shares_for_recipient(request.user)

        # --- Type filter ---
        file_type = request.query_params.get("type")
        if file_type:
            IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp']
            PDF_EXTS = ['pdf']
            DOC_EXTS = ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'ppt', 'pptx']
            ALL_KNOWN = IMAGE_EXTS + PDF_EXTS + DOC_EXTS

            if file_type == 'image':
                exts = IMAGE_EXTS
            elif file_type == 'pdf':
                exts = PDF_EXTS
            elif file_type == 'document':
                exts = DOC_EXTS
            elif file_type == 'other':
                exts = None
                exclude_q = db_models.Q()
                for ext in ALL_KNOWN:
                    exclude_q |= db_models.Q(
                        private_share__user_file__original_name__iendswith=f'.{ext}'
                    )
                qs = qs.exclude(exclude_q)
            else:
                exts = None

            if file_type != 'other' and exts:
                ext_q = db_models.Q()
                for ext in exts:
                    ext_q |= db_models.Q(
                        private_share__user_file__original_name__iendswith=f'.{ext}'
                    )
                qs = qs.filter(ext_q)

        # --- People filter ---
        shared_by = request.query_params.get("sharedBy")
        if shared_by:
            qs = qs.filter(private_share__owner__email__iexact=shared_by)

        # --- Expires filter ---
        expires = request.query_params.get("expires")
        if expires:
            now = timezone.now()
            if expires == 'never':
                qs = qs.filter(private_share__expires_at__isnull=True)
            elif expires == 'past':
                qs = qs.filter(private_share__expires_at__lt=now)
            elif expires == 'week':
                qs = qs.filter(
                    private_share__expires_at__gte=now,
                    private_share__expires_at__lte=now + timedelta(days=7)
                )
            elif expires == 'month':
                qs = qs.filter(
                    private_share__expires_at__gte=now,
                    private_share__expires_at__lte=now + timedelta(days=30)
                )

        # --- Status filter ---
        status_filter = request.query_params.get("status")
        if status_filter:
            now = timezone.now()
            if status_filter == 'accessible':
                qs = qs.filter(
                    is_revoked=False,
                    private_share__is_revoked=False,
                ).filter(
                    db_models.Q(private_share__expires_at__isnull=True) |
                    db_models.Q(private_share__expires_at__gt=now)
                )
            elif status_filter == 'expired':
                qs = qs.filter(
                    is_revoked=False,
                    private_share__is_revoked=False,
                    private_share__expires_at__lt=now,
                )
            elif status_filter == 'revoked':
                qs = qs.filter(
                    db_models.Q(is_revoked=True) |
                    db_models.Q(private_share__is_revoked=True)
                )

        paginator = FilePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = PrivateShareInboxSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response({"shares": serializer.data})

class PrivateShareDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, share_id):
        grant = get_recipient_grant(request.user, share_id)
        if not grant:
            try:
                share = PrivateShare.objects.get(id=share_id, owner=request.user)
                return Response(
                    PrivateShareOwnerSerializer(share, context={"request": request}).data
                )
            except PrivateShare.DoesNotExist:
                return Response({"error": "Share not found."}, status=status.HTTP_404_NOT_FOUND)

        password = request.query_params.get("password", "")
        if not verify_private_share_password(grant.private_share, password):
            return Response({"error": "Password required.", "requires_password": True}, status=403)

        ok, err = record_private_share_view(grant, request)
        if not ok:
            return Response({"error": err}, status=status.HTTP_403_FORBIDDEN)

        serializer = PrivateShareInboxSerializer(grant, context={"request": request})
        return Response(serializer.data)


class PrivateShareDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, share_id):
        grant = get_recipient_grant(request.user, share_id)
        if not grant:
            return Response({"error": "Access denied."}, status=status.HTTP_404_NOT_FOUND)

        password = request.query_params.get("password", "")
        if not verify_private_share_password(grant.private_share, password):
            return Response({"error": "Invalid password."}, status=403)

        is_preview = request.query_params.get("preview") == "true"

        if is_preview:
            # Preview is NEVER blocked by download limit — only check view permission
            ok, err = record_private_share_view(grant, request, preview=True)
            as_attachment = False
        else:
            # Download limit is only enforced here
            ok, err = record_private_share_download(grant, request)
            as_attachment = True

        if not ok:
            return Response({"error": err}, status=status.HTTP_403_FORBIDDEN)

        user_file = grant.private_share.user_file
        if not user_file.file or not os.path.isfile(user_file.file.path):
            return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        # Avoid watermark processing for previews to reduce perceived latency.
        # (Watermarking is applied for actual downloads.)
        file_path = apply_watermark_to_file(user_file, request.user) if not is_preview else user_file.file.path
        response = FileResponse(
            open(file_path, "rb"),
            as_attachment=as_attachment,
            filename=user_file.original_name,
        )
        response["Content-Type"] = user_file.mime_type or "application/octet-stream"
        return response


class PrivateShareRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, share_id):
        if revoke_private_share(request.user, share_id):
            return Response({"message": "Share revoked."})
        return Response({"error": "Share not found."}, status=status.HTTP_404_NOT_FOUND)


class PrivateShareRecipientRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, share_id, recipient_id):
        if revoke_private_share_recipient(request.user, share_id, recipient_id):
            return Response({"message": "Recipient access revoked."})
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)


class PrivateShareTransferView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        serializer = TransferOwnershipSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        ok, msg = transfer_file_ownership(
            request.user, file_id, serializer.validated_data["new_owner_email"]
        )
        if not ok:
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": msg})


class PrivateShareCommentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, share_id):
        try:
            share = PrivateShare.objects.get(id=share_id)
        except PrivateShare.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
            
        is_owner = share.owner_id == request.user.id
        if not is_owner:
            grant = get_recipient_grant(request.user, share_id)
            if not grant:
                return Response({"error": "Access denied."}, status=404)
                
        # Find the root of the share tree
        root_share = share
        while root_share.parent_share:
            root_share = root_share.parent_share
            
        def get_all_child_ids(s):
            ids = [s.id]
            for c in s.child_shares.all():
                ids.extend(get_all_child_ids(c))
            return ids
            
        tree_ids = get_all_child_ids(root_share)
                
        comments = ShareComment.objects.filter(private_share_id__in=tree_ids, parent__isnull=True)
        return Response(ShareCommentSerializer(comments, many=True).data)

    def post(self, request, share_id):
        serializer = ShareCommentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            share = PrivateShare.objects.get(id=share_id)
        except PrivateShare.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
            
        is_owner = share.owner_id == request.user.id
        grant = None
        if not is_owner:
            grant = get_recipient_grant(request.user, share_id)
            if not grant:
                return Response({"error": "Access denied."}, status=404)
                
        content = serializer.validated_data["content"]
            
        if is_owner:
            if share.is_revoked:
                return Response({"error": "Cannot comment on a revoked share."}, status=403)
            parent = None
            parent_id = serializer.validated_data.get("parent_id")
            parent = None
            if parent_id:
                parent = ShareComment.objects.filter(id=parent_id, private_share=share).first()
            comment = ShareComment.objects.create(
                private_share=share,
                author=request.user,
                content=content,
                page_number=serializer.validated_data.get("page_number"),
                highlight_text=serializer.validated_data.get("highlight_text", ""),
                parent=parent,
            )
            _log_share_access(share, request.user, ShareAccessLog.ACTION_COMMENT, request)
        else:
            comment, err = add_share_comment(
                grant,
                content,
                page_number=serializer.validated_data.get("page_number"),
                highlight_text=serializer.validated_data.get("highlight_text", ""),
                parent_id=serializer.validated_data.get("parent_id"),
            )
            if err:
                return Response({"error": err}, status=403)
                
        return Response(ShareCommentSerializer(comment).data, status=201)


class PrivateShareAuditView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, share_id):
        try:
            share = PrivateShare.objects.get(id=share_id)
        except PrivateShare.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        if share.owner_id != request.user.id and not get_recipient_grant(request.user, share_id):
            return Response({"error": "Access denied."}, status=403)
        logs = get_share_access_logs(share, request.user)
        return Response(ShareAccessLogSerializer(logs, many=True).data)


class PrivateShareAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, share_id):
        try:
            share = PrivateShare.objects.get(id=share_id, owner=request.user)
        except PrivateShare.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        return Response(get_share_analytics(share))


class PrivateShareVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        new_file = request.FILES.get("file")
        if not new_file:
            return Response({"error": "File required."}, status=400)
        user_file, err = upload_file_version(
            request.user, file_id, new_file, request.data.get("change_note", "")
        )
        if err:
            return Response({"error": err}, status=404)
        return Response({"message": "New version uploaded.", "file_id": user_file.id})


class UserLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserLookupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(lookup_users_by_email(serializer.validated_data["emails"]))


from .serializers import PrivateShareTreeSerializer

class PrivateShareTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, share_id):
        from .service import get_private_share_tree_root, user_can_view_private_share_tree

        try:
            share = PrivateShare.objects.get(id=share_id)
        except PrivateShare.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not user_can_view_private_share_tree(request.user, share):
            return Response({"error": "Not found"}, status=404)
        root = get_private_share_tree_root(share)
        serializer = PrivateShareTreeSerializer(root)
        return Response(serializer.data)

class PrivateShareApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, share_id):
        # Placeholder for strict mode approval
        return Response({"status": "approved"})
