from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Space,
    SpaceMember,
    SpaceFile,
    SpaceFileVersion,
    SpaceThread,
    SpaceThreadComment,
    SpaceTask,
    SpaceNotification,
)

User = get_user_model()


class SpaceCreateSerializer(serializers.Serializer):
  name = serializers.CharField(max_length=120, trim_whitespace=True)
  description = serializers.CharField(required=False, allow_blank=True, default="")

  invite_emails = serializers.ListField(
    child=serializers.EmailField(),
    required=False,
    allow_empty=True,
    default=list,
  )

  # Optional: { "user@email.com": "editor" | "viewer" }
  role_by_email = serializers.DictField(
    required=False,
    default=dict,
  )

  def validate_name(self, value):
    v = value.strip()
    if not v:
      raise serializers.ValidationError("Space name cannot be empty.")
    if Space.objects.filter(name__iexact=v).exists():
      raise serializers.ValidationError("A space with this name already exists.")
    return v


class SpaceListSerializer(serializers.ModelSerializer):
  user_role = serializers.SerializerMethodField()

  class Meta:
    model = Space
    fields = ["id", "name", "description", "created_at", "user_role"]

  def get_user_role(self, obj):
    request = self.context.get("request")
    if not request or not request.user or request.user.is_anonymous:
      return None
    m = SpaceMember.objects.filter(space=obj, user=request.user).first()
    return m.role if m else None


class SpaceMemberSerializer(serializers.ModelSerializer):
  display_name = serializers.SerializerMethodField()

  class Meta:
    model = SpaceMember
    fields = ["id", "user", "display_name", "role", "joined_at"]
    # Include `user` id for frontend lookups (mentions/assignees).

  def get_display_name(self, obj):
    from .service import get_user_display_name
    return get_user_display_name(obj.user) or obj.user.email


class SpaceFileVersionMiniSerializer(serializers.ModelSerializer):
  uploaded_by_name = serializers.SerializerMethodField()

  class Meta:
    model = SpaceFileVersion
    fields = [
      "id",
      "version_number",
      "uploaded_by_name",
      "created_at",
      "change_note",
      "user_file",
    ]

  def get_uploaded_by_name(self, obj):
    from .service import get_user_display_name
    return get_user_display_name(obj.uploaded_by) if obj.uploaded_by else None


class SpaceFileSerializer(serializers.ModelSerializer):
  current_version = serializers.SerializerMethodField()
  pinned_version = serializers.SerializerMethodField()

  class Meta:
    model = SpaceFile
    fields = ["id", "display_name", "is_pinned", "pinned_at", "current_version", "pinned_version", "updated_at"]

  def get_current_version(self, obj):
    v = obj.current_version
    if not v:
      return None
    return SpaceFileVersionMiniSerializer(v).data

  def get_pinned_version(self, obj):
    v = obj.pinned_version
    if not v:
      return None
    return SpaceFileVersionMiniSerializer(v).data


class SpaceThreadCommentSerializer(serializers.ModelSerializer):
  author_name = serializers.SerializerMethodField()

  class Meta:
    model = SpaceThreadComment
    fields = [
      "id",
      "author_name",
      "content",
      "page_number",
      "highlight_text",
      "parent",
      "created_at",
    ]

  def get_author_name(self, obj):
    from .service import get_user_display_name
    return get_user_display_name(obj.author) or obj.author.email


class SpaceThreadSerializer(serializers.ModelSerializer):
  created_by_name = serializers.SerializerMethodField()
  latest_comment = serializers.SerializerMethodField()

  class Meta:
    model = SpaceThread
    fields = ["id", "space_file", "is_resolved", "resolved_at", "created_at", "updated_at", "created_by_name", "latest_comment"]

  def get_created_by_name(self, obj):
    from .service import get_user_display_name
    return get_user_display_name(obj.created_by) or (obj.created_by.email if obj.created_by else None)

  def get_latest_comment(self, obj):
    c = obj.comments.order_by("-created_at").first()
    if not c:
      return None
    return {
      "id": c.id,
      "author_name": self.context.get("author_name_map", {}).get(c.author_id),
      "content_preview": (c.content or "")[:120],
      "created_at": c.created_at,
    }


class SpaceThreadCreateSerializer(serializers.Serializer):
  space_file_id = serializers.IntegerField(min_value=1)
  content = serializers.CharField(max_length=8000, trim_whitespace=True)
  page_number = serializers.IntegerField(required=False, allow_null=True, min_value=1)
  highlight_text = serializers.CharField(required=False, allow_blank=True, default="")

  # Optional: IDs of mentioned users to notify.
  mention_user_ids = serializers.ListField(
    child=serializers.IntegerField(min_value=1),
    required=False,
    allow_empty=True,
    default=list,
  )

  def validate_content(self, value):
    if not (value or "").strip():
      raise serializers.ValidationError("Comment cannot be empty.")
    return value.strip()


class SpaceThreadResolveSerializer(serializers.Serializer):
  is_resolved = serializers.BooleanField()


class SpaceTaskSerializer(serializers.ModelSerializer):
  assignee_name = serializers.SerializerMethodField()
  created_by_name = serializers.SerializerMethodField()

  class Meta:
    model = SpaceTask
    fields = [
      "id",
      "space_file",
      "title",
      "description",
      "status",
      "due_at",
      "priority",
      "assignee",
      "assignee_name",
      "created_by_name",
      "created_at",
      "updated_at",
    ]

  def get_assignee_name(self, obj):
    from .service import get_user_display_name
    if not obj.assignee:
      return None
    return get_user_display_name(obj.assignee) or obj.assignee.email

  def get_created_by_name(self, obj):
    from .service import get_user_display_name
    return get_user_display_name(obj.created_by) if obj.created_by else None


class SpaceTaskCreateSerializer(serializers.Serializer):
  space_file_id = serializers.IntegerField(min_value=1)
  title = serializers.CharField(max_length=200, trim_whitespace=True)
  description = serializers.CharField(required=False, allow_blank=True, default="")
  due_at = serializers.DateTimeField(required=False, allow_null=True)
  priority = serializers.IntegerField(required=False, default=2, min_value=1, max_value=3)
  assignee_id = serializers.IntegerField(required=False, allow_null=True)

  def validate_title(self, value):
    if not (value or "").strip():
      raise serializers.ValidationError("Task title cannot be empty.")
    return value.strip()


class SpaceNotificationSerializer(serializers.ModelSerializer):
  class Meta:
    model = SpaceNotification
    fields = ["id", "space", "notif_type", "title", "message", "is_read", "created_at", "space_file", "space_thread", "space_task"]

