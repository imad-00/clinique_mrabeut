from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

import bcrypt
from django.conf import settings
from django.core import signing
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods

from clinic.models import AdminRole, AdminUser, Service
from core.auth import (
    admin_required,
    get_admin_from_request,
    is_super_admin,
    issue_token,
    super_admin_required,
)
from core.http import json_error, parse_json_body
from core.ids import cuid
from core.rate_limit import SlidingWindowRule, check_rate_limit
from core.validators import ValidationError, require_string


PASSWORD_RESET_SALT = "admin-password-reset"
LOGIN_RATE_LIMIT_RULES = [
    SlidingWindowRule(window_ms=60_000, max_requests=8),
    SlidingWindowRule(window_ms=3_600_000, max_requests=40),
]


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _validate_email(email: str) -> bool:
    return "@" in email and "." in email.split("@", 1)[-1]


def _get_client_ip(request: HttpRequest) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return (request.META.get("REMOTE_ADDR") or "unknown").strip()


def _too_many_requests_response(retry_after: int | None) -> JsonResponse:
    response = json_error("Too many login attempts. Please try again shortly.", 429, "TOO_MANY_REQUESTS")
    response["Retry-After"] = str(retry_after or 1)
    return response


def _admin_user_to_dict(user: AdminUser) -> dict:
    service = getattr(user, "service", None)
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "serviceId": user.service_id,
        "isActive": user.is_active,
        "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
        "lastLoginIp": user.last_login_ip,
        "failedLoginAttempts": user.failed_login_attempts,
        "lockedUntil": user.locked_until.isoformat() if user.locked_until else None,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
        "service": (
            {
                "id": service.id,
                "nameFr": service.name_fr,
                "nameAr": service.name_ar,
            }
            if service
            else None
        ),
    }


def _issue_password_reset_token(user: AdminUser) -> tuple[str, timezone.datetime]:
    raw_nonce = secrets.token_urlsafe(24)
    token_hash = hashlib.sha256(raw_nonce.encode("utf-8")).hexdigest()
    expires_at = timezone.now() + timedelta(minutes=settings.ADMIN_PASSWORD_RESET_TOKEN_TTL_MINUTES)
    user.reset_token_hash = token_hash
    user.reset_token_expires_at = expires_at
    user.save(update_fields=["reset_token_hash", "reset_token_expires_at", "updated_at"])
    token = signing.dumps({"sub": user.id, "nonce": raw_nonce}, salt=PASSWORD_RESET_SALT)
    return token, expires_at


def _consume_reset_token(raw_token: str) -> AdminUser:
    try:
        payload = signing.loads(
            raw_token,
            salt=PASSWORD_RESET_SALT,
            max_age=settings.ADMIN_PASSWORD_RESET_TOKEN_TTL_MINUTES * 60,
        )
    except signing.SignatureExpired as exc:
        raise ValidationError("Reset token has expired.") from exc
    except signing.BadSignature as exc:
        raise ValidationError("Invalid reset token.") from exc

    user_id = payload.get("sub")
    nonce = payload.get("nonce")
    if not isinstance(user_id, str) or not isinstance(nonce, str):
        raise ValidationError("Invalid reset token.")

    try:
        user = AdminUser.objects.get(id=user_id)
    except AdminUser.DoesNotExist as exc:
        raise ValidationError("Invalid reset token.") from exc

    if not user.is_active:
        raise ValidationError("Account is disabled.")
    if not user.reset_token_hash or not user.reset_token_expires_at:
        raise ValidationError("Reset token has already been used.")
    if user.reset_token_expires_at <= timezone.now():
        raise ValidationError("Reset token has expired.")

    expected_hash = hashlib.sha256(nonce.encode("utf-8")).hexdigest()
    if user.reset_token_hash != expected_hash:
        raise ValidationError("Reset token has already been used.")

    return user


def _active_super_admin_count() -> int:
    return AdminUser.objects.filter(role=AdminRole.SUPER_ADMIN, is_active=True).count()


@require_http_methods(["POST"])
def login_view(request: HttpRequest) -> JsonResponse:
    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        email = _normalize_email(require_string(payload.get("email"), "email"))
        password = require_string(payload.get("password"), "password")
    except ValidationError:
        return json_error("Invalid credentials.", 401)

    client_ip = _get_client_ip(request)
    ip_allowed, ip_retry_after = check_rate_limit(f"auth-login:ip:{client_ip}", LOGIN_RATE_LIMIT_RULES)
    if not ip_allowed:
        return _too_many_requests_response(ip_retry_after)
    email_allowed, email_retry_after = check_rate_limit(f"auth-login:email:{email}", LOGIN_RATE_LIMIT_RULES)
    if not email_allowed:
        return _too_many_requests_response(email_retry_after)

    try:
        user = AdminUser.objects.get(email=email)
    except AdminUser.DoesNotExist:
        return json_error("Invalid credentials.", 401)

    if not user.is_active:
        return json_error("Account is disabled.", 403, "ACCOUNT_INACTIVE")

    now = timezone.now()
    if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        user.locked_until = None
        user.save(update_fields=["failed_login_attempts", "locked_until", "updated_at"])
        return json_error("Invalid credentials.", 401)

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    user.last_login_ip = client_ip or None
    user.save(update_fields=["failed_login_attempts", "locked_until", "last_login_at", "last_login_ip", "updated_at"])

    token = issue_token(user)
    return JsonResponse({"token": token, "user": _admin_user_to_dict(user)})


@require_GET
def session_view(request: HttpRequest) -> JsonResponse:
    try:
        user = get_admin_from_request(request)
    except Exception:
        return json_error("Unauthorized", 401)

    return JsonResponse({"user": _admin_user_to_dict(user)})


@admin_required
@require_http_methods(["POST"])
def change_password_view(request: HttpRequest) -> JsonResponse:
    user = get_admin_from_request(request)

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        current_password = require_string(payload.get("currentPassword"), "currentPassword")
        new_password = require_string(payload.get("newPassword"), "newPassword")
    except ValidationError:
        return json_error("Invalid password payload.", 400)

    if not bcrypt.checkpw(current_password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return json_error("Current password is incorrect.", 400, "CURRENT_PASSWORD_INVALID")

    user.password_hash = _hash_password(new_password)
    user.auth_version = (user.auth_version or 0) + 1
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(
        update_fields=[
            "password_hash",
            "auth_version",
            "reset_token_hash",
            "reset_token_expires_at",
            "failed_login_attempts",
            "locked_until",
            "updated_at",
        ]
    )
    return JsonResponse({"ok": True})


@require_http_methods(["POST"])
def reset_password_view(request: HttpRequest) -> JsonResponse:
    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        raw_token = require_string(payload.get("token"), "token")
        new_password = require_string(payload.get("newPassword"), "newPassword")
    except ValidationError:
        return json_error("Invalid reset payload.", 400)

    try:
        user = _consume_reset_token(raw_token)
    except ValidationError as exc:
        return json_error(str(exc), 400, "INVALID_RESET_TOKEN")

    user.password_hash = _hash_password(new_password)
    user.auth_version = (user.auth_version or 0) + 1
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(
        update_fields=[
            "password_hash",
            "auth_version",
            "reset_token_hash",
            "reset_token_expires_at",
            "failed_login_attempts",
            "locked_until",
            "updated_at",
        ]
    )
    return JsonResponse({"ok": True})


@super_admin_required
@require_http_methods(["GET", "POST"])
def admin_users_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        users = AdminUser.objects.select_related("service").order_by("-created_at", "email")
        return JsonResponse({"users": [_admin_user_to_dict(user) for user in users]})

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        email = _normalize_email(require_string(payload.get("email"), "email"))
        password = require_string(payload.get("password"), "password")
        role = require_string(payload.get("role"), "role")
    except ValidationError:
        return json_error("Invalid admin user data.", 400)

    if role not in {AdminRole.SUPER_ADMIN, AdminRole.SERVICE_ADMIN}:
        return json_error("Invalid admin role.", 400, "INVALID_ROLE")
    if not _validate_email(email):
        return json_error("Invalid email.", 400, "INVALID_EMAIL")
    if AdminUser.objects.filter(email=email).exists():
        return json_error("Admin email already exists.", 409, "ADMIN_EMAIL_TAKEN")

    service_id = payload.get("serviceId")
    if role == AdminRole.SERVICE_ADMIN:
        if not isinstance(service_id, str) or not service_id.strip():
            return json_error("serviceId is required for service admins.", 400, "SERVICE_REQUIRED")
        service_id = service_id.strip()
        if not Service.objects.filter(id=service_id).exists():
            return json_error("Service not found.", 404, "SERVICE_NOT_FOUND")
    else:
        service_id = None

    user = AdminUser.objects.create(
        id=cuid(),
        email=email,
        password_hash=_hash_password(password),
        role=role,
        service_id=service_id,
        is_active=bool(payload.get("isActive", True)),
    )
    user = AdminUser.objects.select_related("service").get(id=user.id)
    return JsonResponse({"user": _admin_user_to_dict(user)}, status=201)


@super_admin_required
@require_http_methods(["PATCH"])
def admin_user_detail_view(request: HttpRequest, user_id: str) -> JsonResponse:
    current_user = get_admin_from_request(request)

    try:
        user = AdminUser.objects.get(id=user_id)
    except AdminUser.DoesNotExist:
        return json_error("Admin user not found.", 404, "NOT_FOUND")

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    updates: dict[str, object] = {}
    resulting_role = user.role
    resulting_is_active = user.is_active
    resulting_service_id = user.service_id

    if "email" in payload:
        try:
            email = _normalize_email(require_string(payload.get("email"), "email"))
        except ValidationError:
            return json_error("Invalid email.", 400, "INVALID_EMAIL")
        if not _validate_email(email):
            return json_error("Invalid email.", 400, "INVALID_EMAIL")
        if AdminUser.objects.filter(email=email).exclude(id=user.id).exists():
            return json_error("Admin email already exists.", 409, "ADMIN_EMAIL_TAKEN")
        updates["email"] = email

    if "role" in payload:
        role = str(payload.get("role"))
        if role not in {AdminRole.SUPER_ADMIN, AdminRole.SERVICE_ADMIN}:
            return json_error("Invalid admin role.", 400, "INVALID_ROLE")
        resulting_role = role
        updates["role"] = role

    if "isActive" in payload:
        resulting_is_active = bool(payload.get("isActive"))
        updates["is_active"] = resulting_is_active

    if resulting_role == AdminRole.SERVICE_ADMIN:
        service_id = payload.get("serviceId", user.service_id)
        if not isinstance(service_id, str) or not service_id.strip():
            return json_error("serviceId is required for service admins.", 400, "SERVICE_REQUIRED")
        service_id = service_id.strip()
        if not Service.objects.filter(id=service_id).exists():
            return json_error("Service not found.", 404, "SERVICE_NOT_FOUND")
        resulting_service_id = service_id
        updates["service_id"] = service_id
    elif "serviceId" in payload or resulting_role == AdminRole.SUPER_ADMIN:
        resulting_service_id = None
        updates["service_id"] = None

    if user.id == current_user.id and resulting_is_active is False:
        return json_error("You cannot deactivate your own account.", 400, "SELF_DEACTIVATE_FORBIDDEN")

    removing_active_super_admin = (
        user.role == AdminRole.SUPER_ADMIN
        and user.is_active
        and (resulting_role != AdminRole.SUPER_ADMIN or resulting_is_active is False)
    )
    if removing_active_super_admin and _active_super_admin_count() <= 1:
        return json_error("At least one active super admin is required.", 400, "LAST_SUPER_ADMIN")

    if user.id == current_user.id and resulting_role != AdminRole.SUPER_ADMIN:
        return json_error("You cannot change your own role.", 400, "SELF_ROLE_CHANGE_FORBIDDEN")

    for field, value in updates.items():
        setattr(user, field, value)

    if not updates:
        user = AdminUser.objects.select_related("service").get(id=user.id)
        return JsonResponse({"user": _admin_user_to_dict(user)})

    if "is_active" in updates and updates["is_active"] is False:
        user.auth_version = (user.auth_version or 0) + 1
        updates["auth_version"] = user.auth_version

    user.save(update_fields=[*updates.keys(), "updated_at"])
    user = AdminUser.objects.select_related("service").get(id=user.id)
    return JsonResponse({"user": _admin_user_to_dict(user)})


@super_admin_required
@require_http_methods(["POST"])
def issue_admin_reset_token_view(_request: HttpRequest, user_id: str) -> JsonResponse:
    try:
        user = AdminUser.objects.get(id=user_id)
    except AdminUser.DoesNotExist:
        return json_error("Admin user not found.", 404, "NOT_FOUND")

    if not user.is_active:
        return json_error("Cannot reset password for a disabled account.", 400, "ACCOUNT_INACTIVE")

    token, expires_at = _issue_password_reset_token(user)
    return JsonResponse(
        {
            "ok": True,
            "token": token,
            "expiresAt": expires_at.isoformat(),
        }
    )


@super_admin_required
@require_http_methods(["POST"])
def set_admin_password_view(_request: HttpRequest, user_id: str) -> JsonResponse:
    try:
        user = AdminUser.objects.get(id=user_id)
    except AdminUser.DoesNotExist:
        return json_error("Admin user not found.", 404, "NOT_FOUND")

    try:
        payload = parse_json_body(_request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        new_password = require_string(payload.get("newPassword"), "newPassword")
    except ValidationError:
        return json_error("Invalid password payload.", 400)

    user.password_hash = _hash_password(new_password)
    user.auth_version = (user.auth_version or 0) + 1
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(
        update_fields=[
            "password_hash",
            "auth_version",
            "reset_token_hash",
            "reset_token_expires_at",
            "failed_login_attempts",
            "locked_until",
            "updated_at",
        ]
    )
    return JsonResponse({"ok": True})


@require_http_methods(["POST"])
def logout_view(_request: HttpRequest) -> JsonResponse:
    return JsonResponse({"ok": True})
