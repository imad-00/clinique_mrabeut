from django.db import migrations


VIDEO_COLUMNS = {
    "id": "varchar(191) NOT NULL",
    "title": "varchar(191) NOT NULL",
    "filename": "varchar(191) NOT NULL",
    "mimeType": "varchar(191) NOT NULL",
    "sizeBytes": "int NOT NULL",
    "enabled": "tinyint(1) NOT NULL DEFAULT 1",
    "sortOrder": "int NOT NULL DEFAULT 0",
    "createdAt": "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)",
    "updatedAt": "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)",
}


def _ensure_clinic_video_table(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'ClinicVideo'
            """
        )
        (table_exists,) = cursor.fetchone()

        if not table_exists:
            cursor.execute(
                """
                CREATE TABLE `ClinicVideo` (
                    `id` varchar(191) NOT NULL,
                    `title` varchar(191) NOT NULL,
                    `filename` varchar(191) NOT NULL,
                    `mimeType` varchar(191) NOT NULL,
                    `sizeBytes` int NOT NULL,
                    `enabled` tinyint(1) NOT NULL DEFAULT 1,
                    `sortOrder` int NOT NULL DEFAULT 0,
                    `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            return

        for column_name, definition in VIDEO_COLUMNS.items():
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'ClinicVideo' AND column_name = %s
                """,
                [column_name],
            )
            (column_exists,) = cursor.fetchone()
            if not column_exists:
                cursor.execute(f"ALTER TABLE `ClinicVideo` ADD COLUMN `{column_name}` {definition}")


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0005_ensure_display_and_appointment_tables"),
    ]

    operations = [
        migrations.RunPython(_ensure_clinic_video_table, migrations.RunPython.noop),
    ]
