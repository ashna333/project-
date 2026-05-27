"""
storage_views.py  —  add to your existing app

These views follow the exact same pattern as your existing views.py:
  - class-based APIView
  - IsAuthenticated permission
  - Response() returns
  - Same error format {"error": "..."}
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .serializers import UserFileSerializer
from .storage_service import (
    get_storage_manager_summary,
    get_duplicate_groups,
    delete_duplicate_extras,
    get_large_files,
    get_stale_downloads,
    delete_files_by_ids,
    clean_all_suggestions,
    backfill_missing_hashes,
)


# ─── Summary ──────────────────────────────────────────────────────────────────

class StorageManagerSummaryView(APIView):
    """
    GET /api/storage-manager/summary/
    Returns storage bar data + counts for each tab.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        backfill_missing_hashes(request.user)
        summary = get_storage_manager_summary(request.user)
        return Response(summary)


# ─── Duplicates ───────────────────────────────────────────────────────────────

class StorageDuplicatesView(APIView):
    """
    GET /api/storage-manager/duplicates/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = get_duplicate_groups(request.user)

        serialized = []
        for g in groups:
            serialized.append({
                "file_hash": g["file_hash"],
                "total_size": g["total_size"],
                "recoverable_size": g["recoverable_size"],
                "count": g["count"],
                "files": UserFileSerializer(
                    g["files"], many=True, context={"request": request}
                ).data,
            })

        return Response(serialized)


class StorageDeleteDuplicateGroupView(APIView):
    """
    DELETE /api/storage-manager/duplicates/<file_hash>/
    Keeps the oldest copy, deletes the rest.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, file_hash):
        result = delete_duplicate_extras(request.user, file_hash)
        return Response(result)


# ─── Large files ──────────────────────────────────────────────────────────────

class StorageLargeFilesView(APIView):
    """
    GET /api/storage-manager/large-files/?threshold_mb=10
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        threshold_mb = int(request.query_params.get("threshold_mb", 60))
        threshold_bytes = threshold_mb * 1024 * 1024
        qs = get_large_files(request.user, threshold_bytes)
        serializer = UserFileSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


# ─── Stale files ──────────────────────────────────────────────────────────────

class StorageStaleDownloadsView(APIView):
    """
    GET /api/storage-manager/stale/?days=90

    Returns ALL unstarred files older than `days` days (any extension).
    Previously restricted to .zip/.dmg/.exe etc. — that filter has been removed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get("days", 90))   # default 90, not 1
        qs = get_stale_downloads(request.user, days)
        serializer = UserFileSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


# ─── Bulk file delete ─────────────────────────────────────────────────────────

class StorageDeleteFilesView(APIView):
    """
    DELETE /api/storage-manager/files/
    Body: { "file_ids": [1, 2, 3] }
    Hard-deletes files (removes from disk + DB, not trash).
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        file_ids = request.data.get("file_ids", [])
        if not file_ids or not isinstance(file_ids, list):
            return Response(
                {"error": "file_ids must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = delete_files_by_ids(request.user, file_ids)
        return Response(result)


# ─── Clean all ────────────────────────────────────────────────────────────────

class StorageCleanAllView(APIView):
    """
    DELETE /api/storage-manager/clean-all/
    Deletes all duplicate extras + all stale files.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        result = clean_all_suggestions(request.user)
        return Response(result)