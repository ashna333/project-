from django.urls import path
from .views import( RegisterView, LoginView, 
                   ChangePasswordView,ForgotPasswordView,
                   ResetPasswordView, FileUploadView, UploadCheckView,
                    FileListView,
                    FileDeleteView,
                    FileDownloadView,
                    FileRenameView,
                    FileToggleStarView, TrashDeleteAllPermanentView,
                    TrashListView,
                    TrashRestoreView,
                    TrashRestoreAllView,
                    TrashDeleteAllPermanentView,
                    TrashDeletePermanentView,
                    ProfileView,
                    GoogleAuthStartView,
                    GoogleAuthCallbackView,
                    StorageSummaryView,
                    FileShareView,
                    PublicShareDetailView,
                    PublicShareDownloadView,
                    FileShareDeleteView)
from .private_share_views import (
    PrivateShareCreateView,
    PrivateShareOwnerListView,
    PrivateShareInboxView,
    PrivateShareDetailView,
    PrivateShareDownloadView,
    PrivateShareRevokeView,
    PrivateShareRecipientRevokeView,
    PrivateShareTransferView,
    PrivateShareCommentsView,
    PrivateShareAuditView,
    PrivateShareAnalyticsView,
    PrivateShareVersionView,
    UserLookupView,
)

urlpatterns = [
    # REGISTER
    path('register/', RegisterView.as_view(), name='register'),

    # LOGIN
    path('login/', LoginView.as_view(), name='login'),
    path('me/', ProfileView.as_view(), name='profile'),
    path('auth/google/', GoogleAuthStartView.as_view(), name='google-auth-start'),
    path('auth/google/callback/', GoogleAuthCallbackView.as_view(), name='google-auth-callback'),

    # CHANGE PASSWORD (protected)
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/', ForgotPasswordView.as_view()),
    path('reset-password/', ResetPasswordView.as_view()),
    path("upload/check/", UploadCheckView.as_view(), name="upload-check"),
    path("upload/", FileUploadView.as_view(), name="file-upload"),
    path("", FileListView.as_view(), name="file-list"),

    

    path('trash/restore-all/', TrashRestoreAllView.as_view(), name='trash-restore-all'),
    path('trash/empty/', TrashDeleteAllPermanentView.as_view(), name='trash-empty'),


    
    path("<int:file_id>/download/", FileDownloadView.as_view(), name="file-download"),

    path("<int:file_id>/delete/", FileDeleteView.as_view(), name="file-delete"),
    path("<int:file_id>/rename/", FileRenameView.as_view(), name="file-rename"),
    path('files/<int:file_id>/star/', FileToggleStarView.as_view(), name='file-star'),
    path("trash/", TrashListView.as_view(), name="file-trash-list"),
    path("trash/<int:file_id>/restore/", TrashRestoreView.as_view(), name="file-trash-restore"),
    path("trash/<int:file_id>/destroy/", TrashDeletePermanentView.as_view(), name="file-trash-destroy"),
    path("storage/", StorageSummaryView.as_view(), name="file-storage"),

    # FILE SHARING (authenticated)
    path("shares/", FileShareView.as_view(), name="share"),

    # FILE SHARING (public)
    path("public/shares/<str:token>/", PublicShareDetailView.as_view(), name="public-share-detail"),
    path("public/shares/<str:token>/download/", PublicShareDownloadView.as_view(), name="public-share-download"),
    path("shares/<int:share_id>/delete/", FileShareDeleteView.as_view()),

    # Private file sharing
    path("private-shares/", PrivateShareCreateView.as_view(), name="private-share-create"),
    path("private-shares/owned/", PrivateShareOwnerListView.as_view(), name="private-share-owned"),
    path("private-shares/inbox/", PrivateShareInboxView.as_view(), name="private-share-inbox"),
    path("private-shares/lookup/", UserLookupView.as_view(), name="private-share-lookup"),
    path("private-shares/<int:share_id>/", PrivateShareDetailView.as_view(), name="private-share-detail"),
    path("private-shares/<int:share_id>/download/", PrivateShareDownloadView.as_view(), name="private-share-download"),
    path("private-shares/<int:share_id>/revoke/", PrivateShareRevokeView.as_view(), name="private-share-revoke"),
    path("private-shares/<int:share_id>/recipients/<int:recipient_id>/revoke/", PrivateShareRecipientRevokeView.as_view()),
    path("private-shares/<int:share_id>/comments/", PrivateShareCommentsView.as_view()),
    path("private-shares/<int:share_id>/audit/", PrivateShareAuditView.as_view()),
    path("private-shares/<int:share_id>/analytics/", PrivateShareAnalyticsView.as_view()),
    path("files/<int:file_id>/transfer/", PrivateShareTransferView.as_view()),
    path("files/<int:file_id>/version/", PrivateShareVersionView.as_view()),
]

