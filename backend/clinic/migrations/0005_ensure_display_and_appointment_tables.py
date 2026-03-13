from django.db import migrations


DISPLAY_COLUMNS = {
    "id": "varchar(191) NOT NULL",
    "mode": "varchar(20) NOT NULL DEFAULT 'IDLE'",
    "appointmentId": "varchar(191) NULL",
    "doctorId": "varchar(191) NULL",
    "serviceId": "varchar(191) NULL",
    "shownQueueNumber": "int NULL",
    "updatedAt": "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)",
}

APPOINTMENT_COLUMNS = {
    "id": "varchar(191) NOT NULL",
    "appointmentDate": "datetime(6) NOT NULL",
    "slot": "varchar(20) NOT NULL",
    "serviceId": "varchar(191) NOT NULL",
    "doctorId": "varchar(191) NOT NULL",
    "patientName": "varchar(191) NOT NULL",
    "patientAge": "int NOT NULL",
    "patientPhone": "varchar(191) NOT NULL",
    "status": "varchar(20) NOT NULL DEFAULT 'BOOKED'",
    "arrivedAt": "datetime(6) NULL",
    "doctorQueueNumber": "int NULL",
    "dailyQueueNumber": "int NULL",
    "createdAt": "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)",
    "updatedAt": "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)",
}


def _ensure_table(cursor, table_name: str, create_sql: str, columns: dict[str, str]) -> None:
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = %s
        """,
        [table_name],
    )
    (table_exists,) = cursor.fetchone()
    if not table_exists:
        cursor.execute(create_sql)
        return

    for column_name, definition in columns.items():
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = %s AND column_name = %s
            """,
            [table_name, column_name],
        )
        (column_exists,) = cursor.fetchone()
        if not column_exists:
            cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{column_name}` {definition}")


def _ensure_display_and_appointments(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        _ensure_table(
            cursor,
            "DisplayState",
            """
            CREATE TABLE `DisplayState` (
                `id` varchar(191) NOT NULL,
                `mode` varchar(20) NOT NULL DEFAULT 'IDLE',
                `appointmentId` varchar(191) NULL,
                `doctorId` varchar(191) NULL,
                `serviceId` varchar(191) NULL,
                `shownQueueNumber` int NULL,
                `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            DISPLAY_COLUMNS,
        )

        _ensure_table(
            cursor,
            "Appointment",
            """
            CREATE TABLE `Appointment` (
                `id` varchar(191) NOT NULL,
                `appointmentDate` datetime(6) NOT NULL,
                `slot` varchar(20) NOT NULL,
                `serviceId` varchar(191) NOT NULL,
                `doctorId` varchar(191) NOT NULL,
                `patientName` varchar(191) NOT NULL,
                `patientAge` int NOT NULL,
                `patientPhone` varchar(191) NOT NULL,
                `status` varchar(20) NOT NULL DEFAULT 'BOOKED',
                `arrivedAt` datetime(6) NULL,
                `doctorQueueNumber` int NULL,
                `dailyQueueNumber` int NULL,
                `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (`id`),
                KEY `Appointment_date_idx` (`appointmentDate`),
                KEY `Appointment_doctor_idx` (`doctorId`),
                KEY `Appointment_service_idx` (`serviceId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            APPOINTMENT_COLUMNS,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0004_ensure_doctor_table"),
    ]

    operations = [
        migrations.RunPython(_ensure_display_and_appointments, migrations.RunPython.noop),
    ]
