from django.urls import path
from .views import( RegisterView, LoginView, 
                   ChangePasswordView,ForgotPasswordView,
                   ResetPasswordView, FileUploadView,
                    FileListView,
                    FileDeleteView,
                    FileDownloadView,
                    FileRenameView,
                    ProfileView,
                    GoogleAuthStartView,
                    GoogleAuthCallbackView,
                    StorageSummaryView,
                    FileShareView,
                    PublicShareDetailView,
                    PublicShareDownloadView,)

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
    path("upload/", FileUploadView.as_view(), name="file-upload"),
    path("", FileListView.as_view(), name="file-list"),


    
    path("<int:file_id>/download/", FileDownloadView.as_view(), name="file-download"),

    path("<int:file_id>/delete/", FileDeleteView.as_view(), name="file-delete"),
    path("<int:file_id>/rename/", FileRenameView.as_view(), name="file-rename"),
    path("storage/", StorageSummaryView.as_view(), name="file-storage"),

    # FILE SHARING (authenticated)
    path("shares/", FileShareView.as_view(), name="share"),

    # FILE SHARING (public)
    path("public/shares/<str:token>/", PublicShareDetailView.as_view(), name="public-share-detail"),
    path("public/shares/<str:token>/download/", PublicShareDownloadView.as_view(), name="public-share-download"),
]

