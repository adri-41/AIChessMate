from django.contrib import admin
from django.urls import path, include
from chessgame.views import login_view, register_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("chessgame.urls")),
    path("login/", login_view, name="login"),
    path("register/", register_view, name="register"),
]