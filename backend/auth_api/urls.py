from django.urls import path

from auth_api import views

urlpatterns = [
    path("auth/login", views.login_view),
    path("auth/session", views.session_view),
    path("auth/change-password", views.change_password_view),
    path("auth/reset-password", views.reset_password_view),
    path("auth/logout", views.logout_view),
    path("admin/users", views.admin_users_view),
    path("admin/users/<str:user_id>", views.admin_user_detail_view),
    path("admin/users/<str:user_id>/issue-reset-token", views.issue_admin_reset_token_view),
    path("admin/users/<str:user_id>/set-password", views.set_admin_password_view),
]
