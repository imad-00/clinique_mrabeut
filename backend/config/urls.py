from django.urls import include, path
from core.views import health_view

urlpatterns = [
    path("api/health", health_view),
    path("api/", include("auth_api.urls")),
    path("api/", include("clinic.urls")),
    path("api/", include("appointments.urls")),
    path("api/", include("display.urls")),
    path("api/", include("videos.urls")),
]
