from django.urls import path
from . import views

urlpatterns = [
    path("csrf/", views.csrf_token_view, name="csrf_token"),
    path("login/", views.login_view, name="login"),
    path("me/", views.current_user_view, name="current_user"),
    path("logout/", views.logout_view, name="logout"),
]