# Generated migration for making email unique

from django.db import migrations, models


def fix_duplicate_emails(apps, schema_editor):
    """
    Fix duplicate email addresses before adding unique constraint.
    Assign unique emails to users with duplicate or empty emails.
    """
    User = apps.get_model('auth_custom', 'User')
    from django.db.models import Count

    # Fix empty email addresses first
    users_with_empty_email = User.objects.filter(email='')
    for user in users_with_empty_email:
        # Generate a unique email based on username
        user.email = f"{user.username}@temp.cipla.local"
        user.save(update_fields=['email'])
        print(f"Updated user {user.username} with temporary email: {user.email}")

    # Find and fix duplicate email addresses
    duplicate_emails = User.objects.values('email').annotate(
        count=Count('email')
    ).filter(count__gt=1)

    for dup in duplicate_emails:
        email = dup['email']
        users_with_dup = User.objects.filter(email=email).order_by('id')

        # Keep the first user's email, modify others
        first_user = True
        for user in users_with_dup:
            if first_user:
                first_user = False
                print(f"Keeping original email for user {user.username}: {user.email}")
                continue

            # Generate unique email for duplicate users
            new_email = f"{user.username}@temp.cipla.local"
            counter = 1

            # Ensure the new email is also unique
            while User.objects.filter(email=new_email).exists():
                new_email = f"{user.username}{counter}@temp.cipla.local"
                counter += 1

            old_email = user.email
            user.email = new_email
            user.save(update_fields=['email'])
            print(f"Updated user {user.username}: {old_email} -> {new_email}")


def reverse_fix_emails(apps, schema_editor):
    """
    Reverse function - Note: This cannot fully restore original duplicate emails
    due to uniqueness constraint, but we document the change.
    """
    pass  # Cannot restore duplicates


class Migration(migrations.Migration):

    dependencies = [
        ('auth_custom', '0011_update_session_timeout_choices'),
    ]

    operations = [
        # First, fix duplicate emails
        migrations.RunPython(fix_duplicate_emails, reverse_fix_emails),

        # Then alter the email field to add unique constraint and make it required
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(
                verbose_name='email address',
                unique=True,
                blank=False,
                max_length=254
            ),
        ),
    ]
