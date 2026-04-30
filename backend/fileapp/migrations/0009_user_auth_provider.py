from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("fileapp", "0008_fileshare"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="auth_provider",
            field=models.CharField(default="password", max_length=20),
        ),
    ]

