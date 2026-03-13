from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Callable, TypeVar

import jwt
from django.conf import settings
from django.http import HttpRequest, JsonResponse

from clinic.models import AdminUser
from core.http import json_error


class AuthError(Exception):
    pass


SUPER_ADMIN_ROLE = "SUPER_ADMIN"
SERVICE_ADMIN_ROLE = "SERVICE_ADMIN"


def is_super_admin(user: AdminUser) -> bool:
    return user.role == SUPER_ADMIN_ROLE


def is_service_admin(user: AdminUser) -> bool:
    return user.role == SERVICE_ADMIN_ROLE


def can_access_service(user: AdminUser, service_id: str | None) -> bool:
    if is_super_admin(user):
        return True
    if is_service_admin(user):
        return bool(service_id) and user.service_id == service_id
    return False


def issue_token(user: AdminUser) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "serviceId": user.service_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def parse_bearer_token(request: HttpRequest) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer ") :].strip()
    return token or None


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid token") from exc


def get_admin_from_request(request: HttpRequest) -> AdminUser:
    token = parse_bearer_token(request)
    if not token:
        raise AuthError("Missing bearer token")
    payload = decode_token(token)
    role = payload.get("role")
    user_id = payload.get("sub")
    if role not in {SUPER_ADMIN_ROLE, SERVICE_ADMIN_ROLE} or not user_id:
        raise AuthError("Unauthorized")

    try:
        user = AdminUser.objects.get(id=user_id)
    except AdminUser.DoesNotExist as exc:
        raise AuthError("Unauthorized") from exc

    if user.role not in {SUPER_ADMIN_ROLE, SERVICE_ADMIN_ROLE}:
        raise AuthError("Unauthorized")
    if is_service_admin(user) and not user.service_id:
        raise AuthError("Unauthorized")

    request.admin_user = user
    request.auth_payload = payload
    return user


F = TypeVar("F", bound=Callable[..., JsonResponse])


def admin_required(view: F) -> F:
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        try:
            get_admin_from_request(request)
        except AuthError:
            return json_error("Unauthorized", 401)
        return view(request, *args, **kwargs)

    return wrapped  # type: ignore[return-value]


def super_admin_required(view: F) -> F:
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        try:
            user = get_admin_from_request(request)
        except AuthError:
            return json_error("Unauthorized", 401)

        if not is_super_admin(user):
            return json_error("Forbidden", 403, "FORBIDDEN")

        return view(request, *args, **kwargs)

    return wrapped  # type: ignore[return-value]
