from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("fileapp", "0007_userfile_file_hash"),
    ]

    operations = [
        migrations.CreateModel(
            name="FileShare",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recipient_email", models.EmailField(max_length=254)),
                ("message", models.TextField()),
                ("token", models.CharField(db_index=True, editable=False, max_length=64, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("accessed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="file_shares",
                        to="fileapp.user",
                    ),
                ),
                (
                    "user_file",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shares",
                        to="fileapp.userfile",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="fileshare",
            index=models.Index(fields=["token"], name="fileapp_fil_token_2d9fd2_idx"),
        ),
        migrations.AddIndex(
            model_name="fileshare",
            index=models.Index(fields=["owner", "created_at"], name="fileapp_fil_owner_i_5b1a1b_idx"),
        ),
    ]

