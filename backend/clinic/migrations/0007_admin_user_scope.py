from django.db import migrations


def _ensure_admin_scope_columns(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'AdminUser' AND column_name = 'serviceId'
            """
        )
        (service_column_exists,) = cursor.fetchone()
        if not service_column_exists:
            cursor.execute("ALTER TABLE `AdminUser` ADD COLUMN `serviceId` varchar(191) NULL")
            cursor.execute("CREATE INDEX `AdminUser_serviceId_idx` ON `AdminUser` (`serviceId`)")

        cursor.execute("UPDATE `AdminUser` SET `role` = 'SUPER_ADMIN' WHERE `role` = 'ADMIN' OR `role` = '' OR `role` IS NULL")
        cursor.execute(
            """
            UPDATE `AdminUser`
            SET `role` = 'SERVICE_ADMIN'
            WHERE `role` NOT IN ('SUPER_ADMIN', 'SERVICE_ADMIN') AND `serviceId` IS NOT NULL
            """
        )
        cursor.execute(
            """
            UPDATE `AdminUser`
            SET `role` = 'SUPER_ADMIN'
            WHERE `role` NOT IN ('SUPER_ADMIN', 'SERVICE_ADMIN')
            """
        )


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0006_ensure_clinic_video_table"),
    ]

    operations = [
        migrations.RunPython(_ensure_admin_scope_columns, migrations.RunPython.noop),
    ]
