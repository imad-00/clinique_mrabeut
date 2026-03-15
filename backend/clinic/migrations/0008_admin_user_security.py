from django.db import migrations


ADMIN_SECURITY_COLUMNS = {
    "isActive": "tinyint(1) NOT NULL DEFAULT 1",
    "lastLoginAt": "datetime(6) NULL",
    "lastLoginIp": "varchar(191) NULL",
    "failedLoginAttempts": "int NOT NULL DEFAULT 0",
    "lockedUntil": "datetime(6) NULL",
    "authVersion": "int NOT NULL DEFAULT 0",
    "resetTokenHash": "varchar(191) NULL",
    "resetTokenExpiresAt": "datetime(6) NULL",
}


def _ensure_admin_security_columns(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        for column_name, definition in ADMIN_SECURITY_COLUMNS.items():
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'AdminUser' AND column_name = %s
                """,
                [column_name],
            )
            (column_exists,) = cursor.fetchone()
            if not column_exists:
                cursor.execute(f"ALTER TABLE `AdminUser` ADD COLUMN `{column_name}` {definition}")

        cursor.execute("UPDATE `AdminUser` SET `isActive` = 1 WHERE `isActive` IS NULL")
        cursor.execute("UPDATE `AdminUser` SET `failedLoginAttempts` = 0 WHERE `failedLoginAttempts` IS NULL")
        cursor.execute("UPDATE `AdminUser` SET `authVersion` = 0 WHERE `authVersion` IS NULL")


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0007_admin_user_scope"),
    ]

    operations = [
        migrations.RunPython(_ensure_admin_security_columns, migrations.RunPython.noop),
    ]
