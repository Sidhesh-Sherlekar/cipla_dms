"""
Django management command for initial system setup.

This command sets up:
- Default groups and permissions
- Sample organizational units
- Default storage locations
- Admin superuser
- Sample data (optional)
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from apps.auth.models import Unit
from apps.storage.models import Storage
import getpass

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize the Cipla DMS with default roles, permissions, and sample data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-sample-data',
            action='store_true',
            help='Skip creating sample organizational units and storage',
        )
        parser.add_argument(
            '--admin-username',
            type=str,
            default='admin',
            help='Username for the superuser account (default: admin)',
        )
        parser.add_argument(
            '--admin-email',
            type=str,
            default='admin@cipla.com',
            help='Email for the superuser account',
        )
        parser.add_argument(
            '--skip-admin',
            action='store_true',
            help='Skip admin user creation',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('  Cipla Document Management System - Initial Setup'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

        try:
            with transaction.atomic():
                # Step 1: Create groups and permissions
                self.create_groups_and_permissions()

                # Step 2: Create admin user
                if not options['skip_admin']:
                    self.create_admin_user(
                        username=options['admin_username'],
                        email=options['admin_email']
                    )

                # Step 3: Create sample data
                if not options['skip_sample_data']:
                    self.create_sample_units()
                    self.create_sample_storage()

                self.stdout.write(self.style.SUCCESS('\n' + '='*70))
                self.stdout.write(self.style.SUCCESS('  ✅ Initial setup completed successfully!'))
                self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

                self.print_next_steps()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Setup failed: {str(e)}'))
            raise CommandError(f'Setup failed: {str(e)}')

    def create_groups_and_permissions(self):
        """Create default groups with appropriate permissions."""
        self.stdout.write('\n📋 Creating groups and permissions...')

        # Define groups and their permissions
        group_permissions = {
            'System Administrator': {
                'description': 'Full system access',
                'permissions': 'all',  # All permissions
            },
            'Unit Admin': {
                'description': 'Manage users and master data for their unit',
                'permissions': [
                    'add_user', 'change_user', 'view_user',
                    'add_storage', 'change_storage', 'delete_storage', 'view_storage',
                    'add_crate', 'change_crate', 'delete_crate', 'view_crate',
                    'add_document', 'change_document', 'delete_document', 'view_document',
                    'view_request', 'view_sendback',
                    'view_auditlog',
                ],
            },
            'Document Manager': {
                'description': 'Create and manage document requests',
                'permissions': [
                    'add_request', 'change_request', 'view_request',
                    'add_document', 'change_document', 'view_document',
                    'add_crate', 'change_crate', 'view_crate',
                    'add_sendback', 'view_sendback',
                    'view_storage',
                ],
            },
            'Approver': {
                'description': 'Approve/reject document requests',
                'permissions': [
                    'view_request', 'change_request',
                    'add_sendback', 'change_sendback', 'view_sendback',
                    'view_crate', 'view_document',
                    'view_auditlog',
                ],
            },
            'Store Head': {
                'description': 'Allocate storage and manage crates',
                'permissions': [
                    'view_request', 'change_request',
                    'add_crate', 'change_crate', 'view_crate',
                    'view_storage',
                    'add_document', 'change_document', 'view_document',
                    'view_sendback',
                ],
            },
            'Viewer': {
                'description': 'Read-only access to documents and requests',
                'permissions': [
                    'view_request',
                    'view_crate',
                    'view_document',
                    'view_storage',
                    'view_sendback',
                    'view_auditlog',
                ],
            },
        }

        created_count = 0
        for group_name, config in group_permissions.items():
            group, created = Group.objects.get_or_create(name=group_name)

            if created:
                created_count += 1
                self.stdout.write(f'  ✅ Created group: {group_name}')
            else:
                self.stdout.write(f'  ⏭️  Group already exists: {group_name}')

            # Assign permissions
            if config['permissions'] == 'all':
                # System Administrator gets all permissions
                all_permissions = Permission.objects.all()
                group.permissions.set(all_permissions)
                self.stdout.write(f'     └─ Assigned all permissions')
            else:
                # Filter permissions by codename
                permissions = Permission.objects.filter(
                    codename__in=config['permissions']
                )
                group.permissions.set(permissions)
                self.stdout.write(f'     └─ Assigned {permissions.count()} permissions')

        self.stdout.write(self.style.SUCCESS(f'\n  ✅ Created {created_count} new groups'))

    def create_admin_user(self, username='admin', email='admin@cipla.com'):
        """Create an administrative superuser."""
        self.stdout.write(f'\n👤 Creating admin user: {username}...')

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'  ⏭️  User "{username}" already exists'))
            return

        # Get password from user
        self.stdout.write('\n  Please enter a password for the admin account:')
        self.stdout.write('  (minimum 12 characters, mix of letters, numbers, and symbols)\n')

        password = None
        while not password:
            password = getpass.getpass('  Password: ')
            password_confirm = getpass.getpass('  Confirm password: ')

            if password != password_confirm:
                self.stdout.write(self.style.ERROR('  ❌ Passwords do not match. Try again.\n'))
                password = None
                continue

            if len(password) < 12:
                self.stdout.write(self.style.ERROR('  ❌ Password must be at least 12 characters. Try again.\n'))
                password = None
                continue

        # Create superuser
        admin_user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            full_name='System Administrator',
            employee_id='ADMIN001',
        )

        # Add to System Administrator group
        admin_group = Group.objects.get(name='System Administrator')
        admin_user.groups.add(admin_group)

        self.stdout.write(self.style.SUCCESS(f'\n  ✅ Created admin user: {username}'))
        self.stdout.write(f'     └─ Email: {email}')
        self.stdout.write(f'     └─ Groups: System Administrator')

    def create_sample_units(self):
        """Create sample organizational units."""
        self.stdout.write('\n🏢 Creating sample organizational units...')

        sample_units = [
            {'unit_code': 'CORP', 'unit_name': 'Corporate Office', 'description': 'Main corporate office'},
            {'unit_code': 'R&D', 'unit_name': 'Research & Development', 'description': 'R&D department'},
            {'unit_code': 'MFG', 'unit_name': 'Manufacturing', 'description': 'Manufacturing unit'},
        ]

        created_count = 0
        for unit_data in sample_units:
            unit, created = Unit.objects.get_or_create(
                unit_code=unit_data['unit_code'],
                defaults={
                    'unit_name': unit_data['unit_name'],
                    'description': unit_data['description'],
                }
            )

            if created:
                created_count += 1
                self.stdout.write(f'  ✅ Created unit: {unit.unit_code} - {unit.unit_name}')
            else:
                self.stdout.write(f'  ⏭️  Unit already exists: {unit.unit_code}')

        self.stdout.write(self.style.SUCCESS(f'\n  ✅ Created {created_count} new units'))

    def create_sample_storage(self):
        """Create sample storage locations."""
        self.stdout.write('\n📦 Creating sample storage locations...')

        # Get the first unit or create a default one
        unit = Unit.objects.first()
        if not unit:
            unit = Unit.objects.create(
                unit_code='DEFAULT',
                unit_name='Default Unit',
                description='Default organizational unit'
            )

        sample_storage = [
            {'room': 'Room-A', 'rack': 'Rack-01', 'compartment': 'C01', 'shelf': 'S1'},
            {'room': 'Room-A', 'rack': 'Rack-01', 'compartment': 'C02', 'shelf': 'S1'},
            {'room': 'Room-A', 'rack': 'Rack-02', 'compartment': 'C01', 'shelf': 'S1'},
            {'room': 'Room-B', 'rack': 'Rack-01', 'compartment': 'C01', 'shelf': None},  # 3-level storage
        ]

        created_count = 0
        for storage_data in sample_storage:
            storage, created = Storage.objects.get_or_create(
                unit=unit,
                room_name=storage_data['room'],
                rack_name=storage_data['rack'],
                compartment_name=storage_data['compartment'],
                shelf_name=storage_data['shelf'],
            )

            if created:
                created_count += 1
                location = storage.get_full_location()
                self.stdout.write(f'  ✅ Created storage: {location}')
            else:
                self.stdout.write(f'  ⏭️  Storage already exists')

        self.stdout.write(self.style.SUCCESS(f'\n  ✅ Created {created_count} new storage locations'))

    def print_next_steps(self):
        """Print next steps for the user."""
        self.stdout.write('\n📝 Next Steps:\n')
        self.stdout.write('  1. Login with admin credentials')
        self.stdout.write('  2. Create additional organizational units (if needed)')
        self.stdout.write('  3. Create user accounts and assign to groups')
        self.stdout.write('  4. Configure storage locations for your units')
        self.stdout.write('  5. Start creating document requests\n')
        self.stdout.write('  For production deployment:')
        self.stdout.write('  - Set SECRET_KEY in environment variables')
        self.stdout.write('  - Configure ALLOWED_HOSTS')
        self.stdout.write('  - Set DEBUG=False')
        self.stdout.write('  - Use PostgreSQL database')
        self.stdout.write('  - Configure Redis for caching and WebSocket')
        self.stdout.write('  - Set up SSL/TLS for HTTPS\n')
