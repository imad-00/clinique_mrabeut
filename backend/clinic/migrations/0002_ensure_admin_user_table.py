from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS `AdminUser` (
                `id` varchar(191) NOT NULL,
                `email` varchar(191) NOT NULL,
                `passwordHash` varchar(191) NOT NULL,
                `role` varchar(191) NOT NULL DEFAULT 'ADMIN',
                `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (`id`),
                UNIQUE KEY `AdminUser_email_key` (`email`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
