"""
Management command to initialize the system with a super admin user.
This should be run once after deployment to set up the initial System Admin account.

Usage:
    python manage.py init_system_admin

Or with custom credentials:
    python manage.py init_system_admin --username admin --email admin@cipla.com --password SecurePass123!
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
import getpass

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize System Admin user with full permissions for first-time deployment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='systemadmin',
            help='Username for the system admin (default: systemadmin)',
        )
        parser.add_argument(
            '--email',
            type=str,
            default='admin@cipla.com',
            help='Email for the system admin (default: admin@cipla.com)',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the system admin (will be prompted if not provided)',
        )
        parser.add_argument(
            '--full-name',
            type=str,
            default='System Administrator',
            help='Full name for the system admin (default: System Administrator)',
        )
        parser.add_argument(
            '--skip-if-exists',
            action='store_true',
            help='Skip creation if system admin already exists',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        full_name = options['full_name']
        skip_if_exists = options['skip_if_exists']

        # Check if System Admin already exists
        if User.objects.filter(username=username).exists():
            if skip_if_exists:
                self.stdout.write(
                    self.style.WARNING(f'System Admin user "{username}" already exists. Skipping creation.')
                )
                return
            else:
                self.stdout.write(
                    self.style.ERROR(f'User with username "{username}" already exists!')
                )
                return

        # Prompt for password if not provided
        if not password:
            password = getpass.getpass('Enter password for System Admin: ')
            password_confirm = getpass.getpass('Confirm password: ')

            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match!'))
                return

            if len(password) < 8:
                self.stdout.write(self.style.ERROR('Password must be at least 8 characters long!'))
                return

        self.stdout.write('Initializing System Admin setup...')

        # 1. Create core Django Groups (4 Cipla roles)
        core_roles = [
            {
                'name': 'System Admin',
                'description': 'Full system access - manage users, roles, and master data'
            },
            {
                'name': 'Section Head',
                'description': 'Approve/reject document storage requests'
            },
            {
                'name': 'Store Head',
                'description': 'Manage document storage and crate allocation'
            },
            {
                'name': 'User',
                'description': 'Create document storage, withdrawal, and destruction requests'
            }
        ]

        created_groups = {}
        for role_info in core_roles:
            group, created = Group.objects.get_or_create(name=role_info['name'])
            created_groups[role_info['name']] = group

            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created Django Group: {role_info["name"]}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'• Django Group already exists: {role_info["name"]}')
                )

        # 2. Create corresponding Role entries (for backward compatibility)
        from apps.auth.models import Role

        for role_info in core_roles:
            role, created = Role.objects.get_or_create(
                role_name=role_info['name'],
                defaults={'description': role_info['description']}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created Role entry: {role_info["name"]}')
                )

        # 3. Assign permissions to System Admin group
        system_admin_group = created_groups['System Admin']

        # Get all permissions for these apps
        admin_apps = ['auth', 'documents', 'storage', 'requests', 'audit', 'reports']
        permissions = Permission.objects.filter(
            content_type__app_label__in=admin_apps
        )

        # Assign all permissions to System Admin
        system_admin_group.permissions.set(permissions)
        self.stdout.write(
            self.style.SUCCESS(f'✓ Assigned {permissions.count()} permissions to System Admin group')
        )

        # Assign permissions to Section Head (approve/reject requests)
        section_head_group = created_groups['Section Head']
        section_head_perms = Permission.objects.filter(
            content_type__app_label__in=['requests', 'documents', 'audit'],
            codename__in=[
                'view_storagerequestheader',
                'change_storagerequestheader',
                'view_withdrawalrequestheader',
                'change_withdrawalrequestheader',
                'view_destructionrequestheader',
                'change_destructionrequestheader',
                'view_documentstorage',
                'view_auditlog',
            ]
        )
        section_head_group.permissions.set(section_head_perms)
        self.stdout.write(
            self.style.SUCCESS(f'✓ Assigned {section_head_perms.count()} permissions to Section Head group')
        )

        # Assign permissions to Store Head (allocate storage, manage crates)
        store_head_group = created_groups['Store Head']
        store_head_perms = Permission.objects.filter(
            content_type__app_label__in=['storage', 'documents', 'requests', 'audit'],
            codename__in=[
                'add_storageunit',
                'change_storageunit',
                'view_storageunit',
                'add_crate',
                'change_crate',
                'view_crate',
                'delete_crate',
                'view_storagerequestheader',
                'change_storagerequestheader',
                'view_documentstorage',
                'change_documentstorage',
                'view_auditlog',
            ]
        )
        store_head_group.permissions.set(store_head_perms)
        self.stdout.write(
            self.style.SUCCESS(f'✓ Assigned {store_head_perms.count()} permissions to Store Head group')
        )

        # Assign permissions to User (create requests, view own data)
        user_group = created_groups['User']
        user_perms = Permission.objects.filter(
            content_type__app_label__in=['requests', 'documents'],
            codename__in=[
                'add_storagerequestheader',
                'view_storagerequestheader',
                'add_withdrawalrequestheader',
                'view_withdrawalrequestheader',
                'add_destructionrequestheader',
                'view_destructionrequestheader',
                'view_documentstorage',
            ]
        )
        user_group.permissions.set(user_perms)
        self.stdout.write(
            self.style.SUCCESS(f'✓ Assigned {user_perms.count()} permissions to User group')
        )

        # 4. Create System Admin user
        system_admin_role = Role.objects.get(role_name='System Admin')

        user = User.objects.create(
            username=username,
            email=email.lower(),
            full_name=full_name,
            role=system_admin_role,
            status='Active',
            is_staff=True,
            is_superuser=True,
            must_change_password=False
        )
        user.set_password(password)
        user.save()

        # Add user to System Admin group
        user.groups.add(system_admin_group)

        self.stdout.write(
            self.style.SUCCESS(f'\n{"="*60}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✓ System Admin user created successfully!')
        )
        self.stdout.write(
            self.style.SUCCESS(f'{"="*60}')
        )
        self.stdout.write(f'Username: {username}')
        self.stdout.write(f'Email: {email}')
        self.stdout.write(f'Full Name: {full_name}')
        self.stdout.write(f'Role: System Admin')
        self.stdout.write(f'Status: Active')
        self.stdout.write(
            self.style.SUCCESS(f'{"="*60}\n')
        )

        self.stdout.write(
            self.style.WARNING('IMPORTANT: This user has full system access.')
        )
        self.stdout.write(
            self.style.WARNING('Use this account to:')
        )
        self.stdout.write(
            self.style.WARNING('  1. Create additional roles as needed')
        )
        self.stdout.write(
            self.style.WARNING('  2. Set up units, departments, and sections')
        )
        self.stdout.write(
            self.style.WARNING('  3. Create other user accounts')
        )
        self.stdout.write(
            self.style.WARNING('  4. Configure system settings')
        )
        self.stdout.write()
        self.stdout.write(
            self.style.SUCCESS('System initialization complete!')
        )
