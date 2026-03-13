from __future__ import annotations

import bcrypt
from django.core.management.base import BaseCommand, CommandError
from django.db.utils import OperationalError, ProgrammingError

from clinic.models import AdminUser, Service
from core.ids import cuid


class Command(BaseCommand):
    help = "Create or update a SERVICE_ADMIN linked to one service."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Admin email")
        parser.add_argument("--password", required=True, help="Admin password")
        parser.add_argument("--service-id", required=True, help="Service ID to scope this admin")

    def handle(self, *args, **options):
        email = (options["email"] or "").strip().lower()
        password = options["password"] or ""
        service_id = (options["service_id"] or "").strip()

        if not email or "@" not in email:
            raise CommandError("--email must be a valid email.")
        if not password:
            raise CommandError("--password is required.")
        if not service_id:
            raise CommandError("--service-id is required.")

        if not Service.objects.filter(id=service_id).exists():
            raise CommandError(f"Service not found: {service_id}")

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        try:
            user = AdminUser.objects.filter(email=email).first()
        except (ProgrammingError, OperationalError) as exc:
            raise CommandError(
                "AdminUser table is missing or inaccessible. Run `python manage.py migrate` first."
            ) from exc

        if user:
            user.password_hash = password_hash
            user.role = "SERVICE_ADMIN"
            user.service_id = service_id
            user.save(update_fields=["password_hash", "role", "service_id", "updated_at"])
            self.stdout.write(self.style.SUCCESS(f"Updated service admin: {email} ({service_id})"))
            return

        AdminUser.objects.create(
            id=cuid(),
            email=email,
            password_hash=password_hash,
            role="SERVICE_ADMIN",
            service_id=service_id,
        )
        self.stdout.write(self.style.SUCCESS(f"Created service admin: {email} ({service_id})"))
