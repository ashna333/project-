from django.urls import path
from .views import RegisterView, LoginView, ChangePasswordView,ForgotPasswordView,ResetPasswordView

urlpatterns = [
    # REGISTER
    path('register/', RegisterView.as_view(), name='register'),

    # LOGIN
    path('login/', LoginView.as_view(), name='login'),

    # CHANGE PASSWORD (protected)
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/', ForgotPasswordView.as_view()),
    path('reset-password/', ResetPasswordView.as_view()),
]