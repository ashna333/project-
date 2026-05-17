# Generated manually for private sharing feature

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fileapp', '0004_alter_userfile_file_hash_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='userfile',
            unique_together=set(),
        ),
        migrations.AddIndex(
            model_name='userfile',
            index=models.Index(fields=['user', 'file_hash'], name='fileapp_use_user_id_8a3f2d_idx'),
        ),
        migrations.CreateModel(
            name='FileVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version_number', models.PositiveIntegerField()),
                ('file', models.FileField(upload_to='fileapp.models.user_upload_path')),
                ('file_size', models.PositiveBigIntegerField()),
                ('file_hash', models.CharField(blank=True, max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('change_note', models.CharField(blank=True, max_length=255)),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('user_file', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='fileapp.userfile')),
            ],
            options={
                'ordering': ['-version_number'],
                'unique_together': {('user_file', 'version_number')},
            },
        ),
        migrations.CreateModel(
            name='PrivateShare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(db_index=True, editable=False, max_length=64, unique=True)),
                ('message', models.TextField(blank=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('password_hash', models.CharField(blank=True, max_length=128)),
                ('one_time_access', models.BooleanField(default=False)),
                ('max_downloads', models.PositiveIntegerField(blank=True, null=True)),
                ('download_count', models.PositiveIntegerField(default=0)),
                ('inactivity_revoke_days', models.PositiveIntegerField(blank=True, null=True)),
                ('last_accessed_at', models.DateTimeField(blank=True, null=True)),
                ('time_windows', models.JSONField(blank=True, default=list)),
                ('use_latest_version', models.BooleanField(default=True)),
                ('is_revoked', models.BooleanField(default=False)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='private_shares_owned', to=settings.AUTH_USER_MODEL)),
                ('pinned_version', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='fileapp.fileversion')),
                ('transferred_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='transferred_shares', to=settings.AUTH_USER_MODEL)),
                ('user_file', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='private_shares', to='fileapp.userfile')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PrivateShareRecipient',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('can_view', models.BooleanField(default=True)),
                ('can_download', models.BooleanField(default=True)),
                ('can_reshare', models.BooleanField(default=False)),
                ('can_comment', models.BooleanField(default=False)),
                ('individual_expires_at', models.DateTimeField(blank=True, null=True)),
                ('max_downloads', models.PositiveIntegerField(blank=True, null=True)),
                ('download_count', models.PositiveIntegerField(default=0)),
                ('last_accessed_at', models.DateTimeField(blank=True, null=True)),
                ('view_count', models.PositiveIntegerField(default=0)),
                ('is_revoked', models.BooleanField(default=False)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('private_share', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recipients', to='fileapp.privateshare')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='private_shares_received', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('private_share', 'recipient')},
            },
        ),
        migrations.CreateModel(
            name='ShareAccessLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=20)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=512)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='share_access_logs', to=settings.AUTH_USER_MODEL)),
                ('private_share', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='access_logs', to='fileapp.privateshare')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ShareComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('page_number', models.PositiveIntegerField(blank=True, null=True)),
                ('highlight_text', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='share_comments', to=settings.AUTH_USER_MODEL)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='fileapp.sharecomment')),
                ('private_share', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='fileapp.privateshare')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
