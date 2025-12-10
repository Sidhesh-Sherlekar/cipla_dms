# Generated manually

from django.db import migrations


def cleanup_old_roles(apps, schema_editor):
    """
    Remove all roles and groups except the 5 core Cipla roles
    """
    Role = apps.get_model('auth_custom', 'Role')
    User = apps.get_model('auth_custom', 'User')
    from django.contrib.auth.models import Group

    # Define the 5 core roles to keep
    CORE_ROLES = [
        'System Administrator',
        'Section Head',
        'Head QC',
        'Document Store',
        'Quality Assurance'
    ]

    # Get the 5 core role objects
    try:
        system_admin_role = Role.objects.get(role_name='System Administrator')
    except Role.DoesNotExist:
        print("ERROR: Core roles not found. Please run migration 0005_setup_cipla_roles first.")
        return

    # Get old roles that need to be removed
    old_roles = Role.objects.exclude(role_name__in=CORE_ROLES)
    deleted_count = old_roles.count()
    deleted_names = list(old_roles.values_list('role_name', flat=True))

    # Reassign all users from old roles to System Administrator
    users_reassigned = 0
    for old_role in old_roles:
        users_with_old_role = User.objects.filter(role=old_role)
        user_count = users_with_old_role.count()
        if user_count > 0:
            users_with_old_role.update(role=system_admin_role)
            users_reassigned += user_count
            print(f"Reassigned {user_count} users from '{old_role.role_name}' to 'System Administrator'")

    # Now delete the old roles
    old_roles.delete()

    # Delete all groups not in the core list
    deleted_groups = Group.objects.exclude(name__in=CORE_ROLES)
    deleted_groups.delete()

    if deleted_count > 0:
        print(f"Cleaned up {deleted_count} old roles: {', '.join(deleted_names)}")
        print(f"Total users reassigned: {users_reassigned}")
    else:
        print("No old roles to clean up")


def reverse_cleanup(apps, schema_editor):
    """
    This is irreversible - cannot restore deleted roles
    """
    print("WARNING: This migration cannot be reversed. Old roles cannot be restored.")


class Migration(migrations.Migration):

    dependencies = [
        ('auth_custom', '0005_setup_cipla_roles'),
    ]

    operations = [
        migrations.RunPython(cleanup_old_roles, reverse_cleanup),
    ]
