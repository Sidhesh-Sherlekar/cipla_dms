"""
Management command to setup initial authentication system:
- Creates default admin user
- Creates default groups with permissions
- Sets up Role-Based Access Control (RBAC)
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from apps.auth.models import Role, Unit

User = get_user_model()


class Command(BaseCommand):
    help = 'Setup authentication system with admin user and default groups'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-username',
            type=str,
            default='admin',
            help='Admin username (default: admin)'
        )
        parser.add_argument(
            '--admin-password',
            type=str,
            default='admin123456',
            help='Admin password (default: admin123456)'
        )
        parser.add_argument(
            '--admin-email',
            type=str,
            default='admin@cipla.com',
            help='Admin email (default: admin@cipla.com)'
        )

    def handle(self, *args, **options):
        admin_username = options['admin_username']
        admin_password = options['admin_password']
        admin_email = options['admin_email']

        self.stdout.write(self.style.SUCCESS('\n===== Setting up Authentication System =====\n'))

        # Step 1: Create default roles (for backward compatibility)
        self.stdout.write('Step 1: Creating default roles...')
        roles_created = self.create_default_roles()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {roles_created} roles\n'))

        # Step 2: Create default groups
        self.stdout.write('Step 2: Creating default groups with permissions...')
        groups_created = self.create_default_groups()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {groups_created} groups\n'))

        # Step 3: Create admin user
        self.stdout.write('Step 3: Creating admin user...')
        admin_user, created = self.create_admin_user(
            admin_username,
            admin_password,
            admin_email
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Admin user created: {admin_username}'))
            self.stdout.write(self.style.WARNING(f'    Password: {admin_password}'))
            self.stdout.write(self.style.WARNING(f'    Email: {admin_email}\n'))
        else:
            self.stdout.write(self.style.WARNING(f'  ⚠ Admin user already exists: {admin_username}\n'))

        # Step 4: Create default unit
        self.stdout.write('Step 4: Creating default unit...')
        unit, unit_created = self.create_default_unit()
        if unit_created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Default unit created: {unit.unit_code}\n'))
        else:
            self.stdout.write(self.style.WARNING(f'  ⚠ Default unit already exists: {unit.unit_code}\n'))

        # Summary
        self.stdout.write(self.style.SUCCESS('\n===== Setup Complete! =====\n'))
        self.stdout.write('You can now:')
        self.stdout.write('1. Start the server: python manage.py runserver')
        self.stdout.write(f'2. Login with: {admin_username} / {admin_password}')
        self.stdout.write('3. Access admin panel: http://localhost:8000/admin/')
        self.stdout.write('4. Create custom groups in admin panel')
        self.stdout.write('5. Assign users to groups with specific permissions\n')

    def create_default_roles(self):
        """Create default roles (for backward compatibility)"""
        roles_data = [
            ('Admin', 'System Administrator with full access'),
            ('Section Head', 'Can create requests for their section'),
            ('Head QC', 'Can approve or reject requests'),
            ('Document Store', 'Can allocate storage and issue documents'),
        ]

        created_count = 0
        for role_name, description in roles_data:
            role, created = Role.objects.get_or_create(
                role_name=role_name,
                defaults={'description': description}
            )
            if created:
                created_count += 1

        return created_count

    def create_default_groups(self):
        """Create default Django groups with permissions"""

        # Define groups and their permissions
        groups_config = {
            'Admin': {
                'description': 'Full system access',
                'permissions': 'all'  # Will get all permissions
            },
            'Section Head': {
                'description': 'Can create storage, withdrawal, and destruction requests',
                'permissions': [
                    'requests.add_request',
                    'requests.view_request',
                    'documents.view_document',
                    'documents.view_crate',
                    'storage.view_storage',
                ]
            },
            'Head QC': {
                'description': 'Can approve or reject requests',
                'permissions': [
                    'requests.view_request',
                    'requests.change_request',  # For approval/rejection
                    'documents.view_document',
                    'documents.view_crate',
                ]
            },
            'Document Store': {
                'description': 'Can allocate storage, issue and receive documents',
                'permissions': [
                    'requests.view_request',
                    'requests.change_request',  # For allocation
                    'documents.view_document',
                    'documents.view_crate',
                    'documents.change_crate',
                    'storage.view_storage',
                    'storage.change_storage',
                ]
            },
        }

        created_count = 0
        for group_name, config in groups_config.items():
            group, created = Group.objects.get_or_create(name=group_name)

            if created or not group.permissions.exists():
                # Clear existing permissions
                group.permissions.clear()

                # Add permissions
                if config['permissions'] == 'all':
                    # Admin gets all permissions
                    all_permissions = Permission.objects.all()
                    group.permissions.set(all_permissions)
                else:
                    # Add specific permissions
                    for perm_string in config['permissions']:
                        try:
                            app_label, codename = perm_string.split('.')
                            permission = Permission.objects.get(
                                content_type__app_label=app_label,
                                codename=codename
                            )
                            group.permissions.add(permission)
                        except Permission.DoesNotExist:
                            self.stdout.write(
                                self.style.WARNING(f'    Warning: Permission not found: {perm_string}')
                            )

                created_count += 1

        return created_count

    def create_admin_user(self, username, password, email):
        """Create superuser admin"""
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            return user, False

        # Get or create Admin role
        admin_role, _ = Role.objects.get_or_create(
            role_name='Admin',
            defaults={'description': 'System Administrator'}
        )

        # Create superuser
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            full_name='System Administrator',
            role=admin_role,
            status='Active'
        )

        # Add user to Admin group
        admin_group, _ = Group.objects.get_or_create(name='Admin')
        user.groups.add(admin_group)

        return user, True

    def create_default_unit(self):
        """Create a default unit for testing"""
        unit, created = Unit.objects.get_or_create(
            unit_code='HQ',
            defaults={
                'unit_name': 'Headquarters',
                'location': 'Mumbai'
            }
        )
        return unit, created
