# Generated manually for multi-select sections

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_custom', '0012_make_email_unique'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='sections',
            field=models.ManyToManyField(blank=True, related_name='assigned_users', to='auth_custom.Section'),
        ),
    ]
