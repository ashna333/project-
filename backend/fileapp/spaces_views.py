from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import (
  Space,
  SpaceMember,
  SpaceFile,
  SpaceFileVersion,
  SpaceThread,
  SpaceThreadComment,
  SpaceTask,
  SpaceNotification,
  SpacePresence,
)
from .spaces_serializers import (
  SpaceCreateSerializer,
  SpaceListSerializer,
  SpaceMemberSerializer,
  SpaceFileSerializer,
  SpaceThreadSerializer,
  SpaceThreadCreateSerializer,
  SpaceThreadCommentSerializer,
  SpaceThreadResolveSerializer,
  SpaceTaskSerializer,
  SpaceTaskCreateSerializer,
  SpaceNotificationSerializer,
  SpaceFileVersionMiniSerializer,
)

from .service import upload_files, get_user_display_name


def _require_space_member(space, user):
  m = SpaceMember.objects.filter(space=space, user=user).first()
  if not m:
    return None
  return m


def _require_editor_or_owner(space, user):
  m = _require_space_member(space, user)
  if not m:
    return None, Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
  if m.role not in (SpaceMember.ROLE_OWNER, SpaceMember.ROLE_EDITOR):
    return None, Response({"error": "Insufficient permissions."}, status=status.HTTP_403_FORBIDDEN)
  return m, None


class SpacesListCreateView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    qs = Space.objects.filter(members__user=request.user).distinct()
    return Response({"spaces": SpaceListSerializer(qs, many=True, context={"request": request}).data})

  def post(self, request):
    serializer = SpaceCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    name = serializer.validated_data["name"]
    description = serializer.validated_data.get("description", "")
    invite_emails = serializer.validated_data.get("invite_emails", []) or []
    role_by_email = serializer.validated_data.get("role_by_email", {}) or {}

    space = Space.objects.create(
      name=name,
      description=description,
      created_by=request.user,
    )

    # Creator is always owner
    SpaceMember.objects.create(space=space, user=request.user, role=SpaceMember.ROLE_OWNER)

    # Invites: only users that already exist in CloudShare will be added for MVP.
    created = []
    for email in invite_emails:
      from django.contrib.auth import get_user_model
      User = get_user_model()
      user = User.objects.filter(email__iexact=email).first()
      if not user:
        continue
      role = role_by_email.get(email, role_by_email.get(email.lower(), SpaceMember.ROLE_VIEWER))
      if role not in (SpaceMember.ROLE_OWNER, SpaceMember.ROLE_EDITOR, SpaceMember.ROLE_VIEWER):
        role = SpaceMember.ROLE_VIEWER
      SpaceMember.objects.get_or_create(space=space, user=user, defaults={"role": role})
      created.append(email)

    return Response(
      {
        "message": "Space created.",
        "space": SpaceListSerializer(space, context={"request": request}).data,
      },
      status=status.HTTP_201_CREATED,
    )


class SpaceMembersView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    members = SpaceMember.objects.filter(space=space).select_related("user")
    return Response({"members": SpaceMemberSerializer(members, many=True).data})


class SpaceFilesView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    qs = (
      SpaceFile.objects.filter(space=space)
      .select_related("current_version", "pinned_version")
      .order_by("-is_pinned", "-pinned_at", "-updated_at", "-created_at")
    )
    return Response({"files": SpaceFileSerializer(qs, many=True).data})


class SpaceFilePinView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, space_id, space_file_id):
    space = get_object_or_404(Space, id=space_id)
    _member, err = _require_editor_or_owner(space, request.user)
    if err:
      return err
    sf = get_object_or_404(SpaceFile, id=space_file_id, space=space)
    sf.is_pinned = not sf.is_pinned
    sf.pinned_at = timezone.now() if sf.is_pinned else None
    sf.save(update_fields=["is_pinned", "pinned_at", "updated_at"])
    return Response({"message": "Pinned updated.", "is_pinned": sf.is_pinned})


class SpaceFilePinVersionView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, space_id, space_file_id):
    space = get_object_or_404(Space, id=space_id)
    _member, err = _require_editor_or_owner(space, request.user)
    if err:
      return err
    sf = get_object_or_404(SpaceFile, id=space_file_id, space=space)
    version_id = request.data.get("version_id")
    if not version_id:
      return Response({"error": "version_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    version = get_object_or_404(SpaceFileVersion, id=version_id, space_file=sf)
    sf.pinned_version = version
    sf.save(update_fields=["pinned_version", "updated_at"])
    return Response({"message": "Pinned version updated.", "pinned_version_id": version.id})


class SpaceFileUploadView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    member, err = _require_editor_or_owner(space, request.user)
    if err:
      return err

    files = request.FILES.getlist("files")
    if not files:
      return Response({"error": "No files uploaded."}, status=status.HTTP_400_BAD_REQUEST)

    # Ensure duplicates still create a new Space version record even if the same bytes already exist.
    resolutions = {f.name: "replace" for f in files}
    created, skipped = upload_files(request.user, files, resolutions=resolutions)

    # Map by original_name (upload_files sets it to f.name for replace).
    by_name = {}
    for uf in created:
      by_name[uf.original_name] = uf

    upload_results = []
    for f in files:
      display_name = f.name
      uf = by_name.get(display_name)
      if not uf:
        continue

      sf = SpaceFile.objects.filter(space=space, display_name=display_name).first()
      if not sf:
        sf = SpaceFile.objects.create(space=space, display_name=display_name, created_by=request.user)

      last_v = sf.versions.order_by("-version_number").first()
      next_num = (last_v.version_number + 1) if last_v else 1

      version = SpaceFileVersion.objects.create(
        space_file=sf,
        version_number=next_num,
        user_file=uf,
        uploaded_by=request.user,
        change_note=request.data.get("change_note", "") or "",
      )
      sf.current_version = version
      if sf.pinned_version is None:
        sf.pinned_version = version
      sf.save(update_fields=["current_version", "pinned_version", "updated_at"])

      upload_results.append({"space_file_id": sf.id, "version_id": version.id, "version_number": next_num})

    # Notify other members about uploads (MVP in-app notifications).
    if upload_results:
      uploader_name = get_user_display_name(request.user) or request.user.email
      file_ids = [r["space_file_id"] for r in upload_results]
      file_names = list(
        SpaceFile.objects.filter(space=space, id__in=file_ids).values_list(
          "display_name", flat=True
        )
      )
      file_names_display = ", ".join(file_names[:3])
      first_file_id = file_ids[0] if file_ids else None

      recipient_ids = SpaceMember.objects.filter(
        space=space,
        mute_in_app=False,
      ).exclude(user=request.user).values_list("user_id", flat=True)

      for uid in recipient_ids:
        SpaceNotification.objects.create(
          user_id=uid,
          space=space,
          notif_type=SpaceNotification.TYPE_UPLOAD,
          title="Space upload",
          message=f"{uploader_name} uploaded: {file_names_display or 'new file version(s)'}.",
          is_read=False,
          space_file_id=first_file_id,
          space_task=None,
          space_thread=None,
        )

    return Response(
      {
        "message": "Uploaded to Space (versioned).",
        "created_count": len(upload_results),
        "skipped_count": len(skipped),
        "results": upload_results,
      },
      status=status.HTTP_201_CREATED,
    )


class SpaceFileVersionsView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, space_id, space_file_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    sf = get_object_or_404(SpaceFile, id=space_file_id, space=space)
    versions = sf.versions.all().select_related("user_file", "uploaded_by")
    return Response(
      {
        "versions": [
          SpaceFileVersionMiniSerializer(v).data
          for v in versions
        ]
      }
    )


class SpaceFileRestoreView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, space_id, space_file_id):
    space = get_object_or_404(Space, id=space_id)
    member, err = _require_editor_or_owner(space, request.user)
    if err:
      return err

    sf = get_object_or_404(SpaceFile, id=space_file_id, space=space)
    version_id = request.data.get("version_id")
    if not version_id:
      return Response({"error": "version_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    version = get_object_or_404(SpaceFileVersion, id=version_id, space_file=sf)
    sf.current_version = version
    sf.save(update_fields=["current_version", "updated_at"])
    return Response({"message": "Version restored.", "current_version_id": version.id})


class SpaceFileThreadsView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, space_id, space_file_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    sf = get_object_or_404(SpaceFile, id=space_file_id, space=space)
    threads = sf.threads.all().select_related("created_by")
    return Response({"threads": SpaceThreadSerializer(threads, many=True, context={"author_name_map": {}}).data})

  def post(self, request, space_id, space_file_id):
    space = get_object_or_404(Space, id=space_id)
    member, err = _require_editor_or_owner(space, request.user)
    if err:
      # Let viewers also comment (we treat threads as collaboration). If you want strict, change this.
      # For now, allow any member to create threads:
      member = _require_space_member(space, request.user)
      if not member:
        return err

    sf = get_object_or_404(SpaceFile, id=space_file_id, space=space)
    serializer = SpaceThreadCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    content = serializer.validated_data["content"]
    page_number = serializer.validated_data.get("page_number")
    highlight_text = serializer.validated_data.get("highlight_text", "")
    mention_user_ids = serializer.validated_data.get("mention_user_ids", []) or []

    thread = SpaceThread.objects.create(
      space=space,
      space_file=sf,
      created_by=request.user,
      is_resolved=False,
    )
    SpaceThreadComment.objects.create(
      thread=thread,
      author=request.user,
      content=content,
      page_number=page_number,
      highlight_text=highlight_text,
      parent=None,
    )

    # Create mention notifications (in-app).
    mentions = set(int(x) for x in mention_user_ids)
    if mentions:
      for uid in mentions:
        if uid == request.user.id:
          continue
        if not SpaceMember.objects.filter(space=space, user_id=uid, mute_in_app=False).exists():
          continue
        SpaceNotification.objects.create(
          user_id=uid,
          space=space,
          notif_type=SpaceNotification.TYPE_MENTION,
          title="You were mentioned in a Space",
          message=f"@{request.user.email}: {content[:140]}",
          is_read=False,
          space_file=sf,
          space_thread=thread,
        )

    return Response({"message": "Thread created.", "thread_id": thread.id}, status=status.HTTP_201_CREATED)


class SpaceThreadCommentsView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, space_id, thread_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    thread = get_object_or_404(SpaceThread, id=thread_id, space=space)
    comments = thread.comments.select_related("author").all()
    return Response(
      {
        "thread": {"id": thread.id, "is_resolved": thread.is_resolved, "resolved_at": thread.resolved_at},
        "comments": SpaceThreadCommentSerializer(comments, many=True).data,
      }
    )

  def post(self, request, space_id, thread_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    thread = get_object_or_404(SpaceThread, id=thread_id, space=space)

    # For MVP: only allow adding comment; resolution handled separately.
    content = request.data.get("content", "").strip()
    if not content:
      return Response({"error": "content is required."}, status=status.HTTP_400_BAD_REQUEST)

    page_number = request.data.get("page_number")
    highlight_text = request.data.get("highlight_text", "")
    parent_id = request.data.get("parent_comment_id")
    parent = None
    if parent_id:
      parent = SpaceThreadComment.objects.filter(thread=thread, id=parent_id).first()

    comment = SpaceThreadComment.objects.create(
      thread=thread,
      author=request.user,
      content=content,
      page_number=page_number,
      highlight_text=highlight_text,
      parent=parent,
    )

    if SpaceMember.objects.filter(space=space, user=request.user, mute_in_app=False).exists():
      SpaceNotification.objects.create(
        user=request.user,
        space=space,
        notif_type=SpaceNotification.TYPE_COMMENT,
        title="New thread activity",
        message=f"{get_user_display_name(request.user) or request.user.email} commented.",
        is_read=False,
        space_file=thread.space_file,
        space_thread=thread,
      )

    # Notify other members on the thread
    member_qs = SpaceMember.objects.filter(space=space, mute_in_app=False).exclude(user=request.user).values_list("user_id", flat=True)
    for uid in member_qs:
      SpaceNotification.objects.create(
        user_id=uid,
        space=space,
        notif_type=SpaceNotification.TYPE_COMMENT,
        title="New comment in a Space thread",
        message=f"{get_user_display_name(request.user) or request.user.email}: {content[:140]}",
        is_read=False,
        space_file=thread.space_file,
        space_thread=thread,
      )

    return Response({"message": "Comment added.", "comment_id": comment.id}, status=status.HTTP_201_CREATED)


class SpaceThreadResolveView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, space_id, thread_id):
    space = get_object_or_404(Space, id=space_id)
    _member, err = _require_editor_or_owner(space, request.user)
    if err:
      return err
    thread = get_object_or_404(SpaceThread, id=thread_id, space=space)

    serializer = SpaceThreadResolveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    is_resolved = serializer.validated_data["is_resolved"]
    thread.is_resolved = is_resolved
    thread.resolved_at = timezone.now() if is_resolved else None
    thread.save(update_fields=["is_resolved", "resolved_at", "updated_at"])
    return Response({"message": "Thread updated."})


class SpaceUnresolvedThreadsView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    # Unresolved threads across all spaces the user belongs to.
    spaces = Space.objects.filter(members__user=request.user).values_list("id", flat=True)
    threads = (
      SpaceThread.objects.filter(space_id__in=spaces, is_resolved=False)
      .select_related("space_file", "space_file__space", "created_by")
    )
    return Response({"threads": SpaceThreadSerializer(threads, many=True).data})


class SpaceTasksView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    status_filter = request.query_params.get("status")
    qs = SpaceTask.objects.filter(space=space).select_related("space_file", "assignee", "created_by")
    if status_filter:
      qs = qs.filter(status=status_filter)
    return Response({"tasks": SpaceTaskSerializer(qs, many=True).data})


class SpaceFileTasksView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, space_id, space_file_id):
    space = get_object_or_404(Space, id=space_id)
    if not _require_space_member(space, request.user):
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    sf = get_object_or_404(SpaceFile, id=space_file_id, space=space)

    serializer = SpaceTaskCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    title = serializer.validated_data["title"]
    description = serializer.validated_data.get("description", "")
    due_at = serializer.validated_data.get("due_at")
    priority = serializer.validated_data.get("priority", 2)
    assignee_id = serializer.validated_data.get("assignee_id")

    assignee = None
    if assignee_id:
      assignee = SpaceMember.objects.filter(space=space, user_id=assignee_id).first().user if SpaceMember.objects.filter(space=space, user_id=assignee_id).exists() else None

    task = SpaceTask.objects.create(
      space=space,
      space_file=sf,
      title=title,
      description=description,
      due_at=due_at,
      priority=priority,
      assignee=assignee,
      status=SpaceTask.STATUS_TODO,
      created_by=request.user,
    )

    # Notify assignee (and uploader if no assignee).
    target_ids = []
    if assignee:
      target_ids.append(assignee.id)
    else:
      target_ids.append(request.user.id)

    recipient_ids = SpaceMember.objects.filter(
      space=space,
      mute_in_app=False,
      user_id__in=set(target_ids),
    ).values_list("user_id", flat=True)

    for uid in recipient_ids:
      SpaceNotification.objects.create(
        user_id=uid,
        space=space,
        notif_type=SpaceNotification.TYPE_TASK,
        title="New task created",
        message=f"{get_user_display_name(request.user) or request.user.email}: {title}",
        is_read=False,
        space_file=sf,
        space_task=task,
      )

    return Response({"message": "Task created.", "task": SpaceTaskSerializer(task).data}, status=status.HTTP_201_CREATED)


class SpaceNotificationsView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    qs = SpaceNotification.objects.filter(user=request.user).select_related("space", "space_file", "space_thread", "space_task")
    return Response({"notifications": SpaceNotificationSerializer(qs, many=True).data})

  def post(self, request):
    # Mark all read
    SpaceNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({"message": "All notifications marked as read."})


class SpacePresenceHeartbeatView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    member = _require_space_member(space, request.user)
    if not member:
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    SpacePresence.objects.update_or_create(
      space=space,
      user=request.user,
      defaults={"last_seen_at": timezone.now()},
    )
    return Response({"message": "Heartbeat received."})

  def get(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    member = _require_space_member(space, request.user)
    if not member:
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    # Active within last 2 minutes
    cutoff = timezone.now() - timezone.timedelta(seconds=120)
    active_users = SpacePresence.objects.filter(space=space, last_seen_at__gte=cutoff).select_related("user")
    results = []
    for p in active_users:
      results.append(
        {
          "user_id": p.user.id,
          "display_name": get_user_display_name(p.user) or p.user.email,
          "last_seen_at": p.last_seen_at,
        }
      )
    return Response({"active_users": results})


class SpaceMyMuteView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    member = _require_space_member(space, request.user)
    if not member:
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
    return Response({
      "mute_in_app": member.mute_in_app,
      "mute_weekly_digest": member.mute_weekly_digest,
    })

  def post(self, request, space_id):
    space = get_object_or_404(Space, id=space_id)
    member = _require_space_member(space, request.user)
    if not member:
      return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    mute_in_app = request.data.get("mute_in_app", member.mute_in_app)
    mute_weekly_digest = request.data.get("mute_weekly_digest", member.mute_weekly_digest)

    member.mute_in_app = bool(mute_in_app)
    member.mute_weekly_digest = bool(mute_weekly_digest)
    member.save(update_fields=["mute_in_app", "mute_weekly_digest"])

    return Response({
      "mute_in_app": member.mute_in_app,
      "mute_weekly_digest": member.mute_weekly_digest,
    })

