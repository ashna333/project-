from django.urls import path
from .views import( RegisterView, LoginView, 
                   ChangePasswordView,ForgotPasswordView,
                   ResetPasswordView, FileUploadView,
                    FileListView,
                    FileDeleteView,
                    FileDownloadView,
                    FileRenameView,
                    StorageSummaryView,)

urlpatterns = [
    # REGISTER
    path('register/', RegisterView.as_view(), name='register'),

    # LOGIN
    path('login/', LoginView.as_view(), name='login'),

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
]

