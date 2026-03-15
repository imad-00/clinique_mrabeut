from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health_view(_request):
    return JsonResponse({"ok": True})
