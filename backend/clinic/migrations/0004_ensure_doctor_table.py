from django.db import migrations


DOCTOR_COLUMNS = {
    "id": "varchar(191) NOT NULL",
    "serviceId": "varchar(191) NOT NULL",
    "nameFr": "varchar(191) NOT NULL",
    "nameAr": "varchar(191) NOT NULL",
    "titleFr": "varchar(191) NOT NULL",
    "titleAr": "varchar(191) NOT NULL",
    "photoUrl": "longtext NULL",
    "active": "tinyint(1) NOT NULL DEFAULT 1",
    "scheduleJson": "json NOT NULL",
    "morningCapacity": "int NOT NULL DEFAULT 0",
    "eveningCapacity": "int NOT NULL DEFAULT 0",
    "createdAt": "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)",
    "updatedAt": "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)",
}


def _ensure_doctor_table(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'Doctor'
            """
        )
        (table_exists,) = cursor.fetchone()

        if not table_exists:
            cursor.execute(
                """
                CREATE TABLE `Doctor` (
                    `id` varchar(191) NOT NULL,
                    `serviceId` varchar(191) NOT NULL,
                    `nameFr` varchar(191) NOT NULL,
                    `nameAr` varchar(191) NOT NULL,
                    `titleFr` varchar(191) NOT NULL,
                    `titleAr` varchar(191) NOT NULL,
                    `photoUrl` longtext NULL,
                    `active` tinyint(1) NOT NULL DEFAULT 1,
                    `scheduleJson` json NOT NULL,
                    `morningCapacity` int NOT NULL DEFAULT 0,
                    `eveningCapacity` int NOT NULL DEFAULT 0,
                    `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    PRIMARY KEY (`id`),
                    KEY `Doctor_serviceId_idx` (`serviceId`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            return

        for column_name, definition in DOCTOR_COLUMNS.items():
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'Doctor' AND column_name = %s
                """,
                [column_name],
            )
            (column_exists,) = cursor.fetchone()
            if not column_exists:
                cursor.execute(f"ALTER TABLE `Doctor` ADD COLUMN `{column_name}` {definition}")


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0003_ensure_service_table"),
    ]

    operations = [
        migrations.RunPython(_ensure_doctor_table, migrations.RunPython.noop),
    ]
