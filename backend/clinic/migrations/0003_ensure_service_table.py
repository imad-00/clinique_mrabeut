from django.db import migrations


def _ensure_service_table(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'Service'
            """
        )
        (table_exists,) = cursor.fetchone()

        if not table_exists:
            cursor.execute(
                """
                CREATE TABLE `Service` (
                    `id` varchar(191) NOT NULL,
                    `nameFr` varchar(191) NOT NULL,
                    `nameAr` varchar(191) NOT NULL,
                    `descriptionFr` longtext NOT NULL,
                    `descriptionAr` longtext NOT NULL,
                    `icon` varchar(191) NOT NULL DEFAULT 'activity',
                    `active` tinyint(1) NOT NULL DEFAULT 1,
                    `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            return

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'Service' AND column_name = 'icon'
            """
        )
        (icon_exists,) = cursor.fetchone()
        if not icon_exists:
            cursor.execute(
                """
                ALTER TABLE `Service`
                ADD COLUMN `icon` varchar(191) NOT NULL DEFAULT 'activity'
                """
            )


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0002_ensure_admin_user_table"),
    ]

    operations = [
        migrations.RunPython(_ensure_service_table, migrations.RunPython.noop),
    ]
