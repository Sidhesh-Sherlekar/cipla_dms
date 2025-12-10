# Generated manually

from django.db import migrations


def create_cipla_roles(apps, schema_editor):
    """
    Create the 5 core roles for Cipla Document Management System
    Based on 21 CFR Part 11 compliance requirements
    """
    Role = apps.get_model('auth_custom', 'Role')
    from django.contrib.auth.models import Group

    # Define the 5 roles with their descriptions
    roles_data = [
        {
            'role_name': 'System Administrator',
            'description': (
                'Manages users, roles, and system configurations. '
                'Enforces password and access policies as per 21 CFR Part 11. '
                'CANNOT alter document data or approve requests. '
                'Responsible for user management, security policies, and system maintenance.'
            )
        },
        {
            'role_name': 'Section Head',
            'description': (
                'Initiates all document-related requests (storage, withdrawal, destruction). '
                'Enters document metadata and acknowledges crate allocations. '
                'CANNOT approve own requests. '
                'Responsible for document submission and request creation.'
            )
        },
        {
            'role_name': 'Head QC',
            'description': (
                'Serves as the approving authority for all requests. '
                'Validates or rejects storage, withdrawal, and destruction requests. '
                'Applies digital signatures for traceability and compliance. '
                'CANNOT create requests or execute storage operations. '
                'Responsible for quality control and approval workflow.'
            )
        },
        {
            'role_name': 'Document Store',
            'description': (
                'Executes approved actions: allocates storage locations, acknowledges document movement. '
                'Generates barcode labels and confirms destruction. '
                'CANNOT edit core document data or approve requests. '
                'Responsible for physical document handling and storage management.'
            )
        },
        {
            'role_name': 'Quality Assurance',
            'description': (
                'Ensures system integrity by reviewing all audit trails. '
                'Validates e-signatures and verifies GMP compliance across activities. '
                'Read-only access to all system data for oversight and auditing. '
                'CANNOT create, approve, or execute document operations. '
                'Responsible for compliance monitoring and audit trail review.'
            )
        }
    ]

    # Create or update roles
    for role_data in roles_data:
        role, created = Role.objects.update_or_create(
            role_name=role_data['role_name'],
            defaults={'description': role_data['description']}
        )

        # Create corresponding Django Group for permissions
        Group.objects.get_or_create(name=role_data['role_name'])

        if created:
            print(f"Created role: {role_data['role_name']}")
        else:
            print(f"Updated role: {role_data['role_name']}")


def remove_cipla_roles(apps, schema_editor):
    """
    Remove the 5 core roles (for migration rollback)
    """
    Role = apps.get_model('auth_custom', 'Role')
    from django.contrib.auth.models import Group

    role_names = [
        'System Administrator',
        'Section Head',
        'Head QC',
        'Document Store',
        'Quality Assurance'
    ]

    # Delete roles and corresponding groups
    for role_name in role_names:
        Role.objects.filter(role_name=role_name).delete()
        Group.objects.filter(name=role_name).delete()
        print(f"Removed role: {role_name}")


class Migration(migrations.Migration):

    dependencies = [
        ('auth_custom', '0004_user_must_change_password'),
    ]

    operations = [
        migrations.RunPython(create_cipla_roles, remove_cipla_roles),
    ]
