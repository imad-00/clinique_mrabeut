from __future__ import annotations

import os

import bcrypt
from django.core.management.base import BaseCommand, CommandError
from django.db.utils import OperationalError, ProgrammingError

from clinic.models import AdminUser
from core.ids import cuid


class Command(BaseCommand):
    help = "Create or update the SUPER_ADMIN user from ADMIN_EMAIL and ADMIN_PASSWORD env vars."

    def handle(self, *args, **options):
        email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
        password = os.getenv("ADMIN_PASSWORD") or ""

        if not email or "@" not in email:
            raise CommandError("ADMIN_EMAIL is required and must be a valid email.")
        if not password:
            raise CommandError("ADMIN_PASSWORD is required.")

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        try:
            user = AdminUser.objects.filter(email=email).first()
        except (ProgrammingError, OperationalError) as exc:
            raise CommandError(
                "AdminUser table is missing or inaccessible. Run `python manage.py migrate` first."
            ) from exc
        if user:
            user.password_hash = password_hash
            user.role = "SUPER_ADMIN"
            user.service_id = None
            user.is_active = True
            user.failed_login_attempts = 0
            user.locked_until = None
            user.reset_token_hash = None
            user.reset_token_expires_at = None
            user.auth_version = (user.auth_version or 0) + 1
            user.save(
                update_fields=[
                    "password_hash",
                    "role",
                    "service_id",
                    "is_active",
                    "failed_login_attempts",
                    "locked_until",
                    "reset_token_hash",
                    "reset_token_expires_at",
                    "auth_version",
                    "updated_at",
                ]
            )
            self.stdout.write(self.style.SUCCESS(f"Updated admin user: {email}"))
            return

        AdminUser.objects.create(
            id=cuid(),
            email=email,
            password_hash=password_hash,
            role="SUPER_ADMIN",
            service_id=None,
            is_active=True,
            failed_login_attempts=0,
            auth_version=0,
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin user: {email}"))
