"""
Utility functions for dynamic role management
"""

from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


CORE_ROLES = ['System Admin', 'Section Head', 'Store Head', 'User']


def is_core_role(role_name):
    """Check if a role is one of the 4 core Cipla roles"""
    return role_name in CORE_ROLES


def get_user_role_name(user):
    """
    Get user's primary role name.
    Checks Django groups first, then falls back to legacy role field.
    """
    if user.groups.exists():
        return user.groups.first().name
    elif hasattr(user, 'role') and user.role:
        return user.role.role_name
    return None


def has_role(user, role_name):
    """
    Check if user has a specific role.
    Checks both Django groups and legacy role field.
    """
    if not user or not user.is_authenticated:
        return False

    # Check Django groups first
    if user.groups.filter(name=role_name).exists():
        return True

    # Fallback to legacy role field
    return (
        hasattr(user, 'role') and
        user.role and
        user.role.role_name == role_name
    )


def is_system_admin(user):
    """Check if user is a System Admin"""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return has_role(user, 'System Admin')


def is_section_head(user):
    """Check if user is a Section Head"""
    return has_role(user, 'Section Head')


def is_store_head(user):
    """Check if user is a Store Head"""
    return has_role(user, 'Store Head')


def is_regular_user(user):
    """Check if user is a regular User (not admin/head)"""
    return has_role(user, 'User')


def assign_role_to_user(user, role_name):
    """
    Assign a role (Django Group) to a user.
    Also updates the legacy Role field for backward compatibility.
    """
    from apps.auth.models import Role

    # Get or create the Django Group
    group, _ = Group.objects.get_or_create(name=role_name)

    # Clear existing groups and assign new one
    user.groups.clear()
    user.groups.add(group)

    # Update legacy role field
    role, _ = Role.objects.get_or_create(
        role_name=role_name,
        defaults={'description': f'Role: {role_name}'}
    )
    user.role = role
    user.save(update_fields=['role'])

    return group


def get_available_permissions(app_labels=None):
    """
    Get all available permissions, optionally filtered by app labels.
    Returns permissions grouped by app and model.
    """
    permissions = Permission.objects.select_related('content_type').all()

    if app_labels:
        permissions = permissions.filter(content_type__app_label__in=app_labels)

    permissions = permissions.order_by('content_type__app_label', 'content_type__model', 'codename')

    # Group by app and model
    grouped = {}
    for perm in permissions:
        app_label = perm.content_type.app_label
        model_name = perm.content_type.model

        if app_label not in grouped:
            grouped[app_label] = {}

        if model_name not in grouped[app_label]:
            grouped[app_label][model_name] = []

        grouped[app_label][model_name].append({
            'id': perm.id,
            'name': perm.name,
            'codename': perm.codename,
            'full_codename': f'{app_label}.{perm.codename}'
        })

    return grouped


def get_role_permissions(role_name):
    """Get all permissions assigned to a role"""
    try:
        group = Group.objects.get(name=role_name)
        return list(group.permissions.values('id', 'name', 'codename', 'content_type__app_label'))
    except Group.DoesNotExist:
        return []


def assign_permissions_to_role(role_name, permission_ids):
    """Assign specific permissions to a role"""
    try:
        group = Group.objects.get(name=role_name)
        permissions = Permission.objects.filter(id__in=permission_ids)
        group.permissions.set(permissions)
        return True
    except Group.DoesNotExist:
        return False


def create_custom_role(role_name, description='', permission_ids=None):
    """
    Create a new custom role with specified permissions.
    Returns (group, role, created) tuple.
    """
    from apps.auth.models import Role

    # Check if already exists
    if Group.objects.filter(name=role_name).exists():
        return None, None, False

    # Create Django Group
    group = Group.objects.create(name=role_name)

    # Assign permissions if provided
    if permission_ids:
        permissions = Permission.objects.filter(id__in=permission_ids)
        group.permissions.set(permissions)

    # Create corresponding Role entry
    role = Role.objects.create(
        role_name=role_name,
        description=description
    )

    return group, role, True


def delete_custom_role(role_name):
    """
    Delete a custom role (not core roles).
    Returns (success, message) tuple.
    """
    from apps.auth.models import Role

    # Prevent deletion of core roles
    if is_core_role(role_name):
        return False, f'Cannot delete core role: {role_name}'

    try:
        group = Group.objects.get(name=role_name)

        # Check if role has users
        user_count = group.user_set.count()
        if user_count > 0:
            return False, f'Cannot delete role with {user_count} active users. Reassign users first.'

        # Delete Role entry
        Role.objects.filter(role_name=role_name).delete()

        # Delete Group
        group.delete()

        return True, f'Role "{role_name}" deleted successfully'

    except Group.DoesNotExist:
        return False, 'Role not found'


def sync_role_and_group(role_name):
    """
    Ensure Role model and Django Group are synchronized.
    Creates missing entries if needed.
    """
    from apps.auth.models import Role

    # Ensure Group exists
    group, group_created = Group.objects.get_or_create(name=role_name)

    # Ensure Role exists
    role, role_created = Role.objects.get_or_create(
        role_name=role_name,
        defaults={'description': f'Role: {role_name}'}
    )

    return group, role, group_created or role_created
