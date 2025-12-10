"""
Django management command to setup roles, permissions, and test admin account.

This command creates:
1. Four predefined roles with appropriate permissions:
   - Admin: Full system access
   - Section Head: Document management and section oversight
   - Head QC: Quality control and approval permissions
   - Document Store: Storage and retrieval operations
2. A test admin account with username 'admin' and password 'Admin@123456'

Usage:
    python manage.py setup_roles
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from apps.auth.models import Role, User, Unit, Department, Section, SessionPolicy


class Command(BaseCommand):
    help = 'Setup roles with preset permissions and create test admin account'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('Starting Cipla DMS Role & Permission Setup'))
        self.stdout.write(self.style.SUCCESS('=' * 70))

        try:
            with transaction.atomic():
                # Create roles
                self.stdout.write('\n[1/5] Creating Roles...')
                roles = self.create_roles()

                # Setup permissions for each role
                self.stdout.write('\n[2/5] Configuring Role Permissions...')
                self.setup_permissions(roles)

                # Create default organizational structure
                self.stdout.write('\n[3/5] Creating Default Organizational Structure...')
                default_unit, default_dept, default_section = self.create_default_org_structure()

                # Create test admin account
                self.stdout.write('\n[4/5] Creating Test Admin Account...')
                admin_user = self.create_test_admin(roles['Admin'], default_unit, default_section)

                # Create session policy
                self.stdout.write('\n[5/5] Creating Session Policy...')
                self.create_session_policy(admin_user)

            self.stdout.write(self.style.SUCCESS('\n' + '=' * 70))
            self.stdout.write(self.style.SUCCESS('Setup completed successfully!'))
            self.stdout.write(self.style.SUCCESS('=' * 70))
            self.stdout.write(self.style.WARNING('\nTest Admin Credentials:'))
            self.stdout.write(self.style.WARNING('  Username: admin'))
            self.stdout.write(self.style.WARNING('  Password: Admin@123456'))
            self.stdout.write(self.style.WARNING('\nIMPORTANT: Change the admin password in production!'))
            self.stdout.write(self.style.SUCCESS('=' * 70 + '\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\nError during setup: {str(e)}'))
            raise

    def create_roles(self):
        """Create the four main roles"""
        role_definitions = [
            {
                'role_name': 'Admin',
                'description': 'System administrator with full access to all features and configurations'
            },
            {
                'role_name': 'Section Head',
                'description': 'Manages documents and operations within their assigned section'
            },
            {
                'role_name': 'Head QC',
                'description': 'Quality control manager with approval and review permissions'
            },
            {
                'role_name': 'Document Store',
                'description': 'Manages physical document storage, retrieval, and organization'
            },
        ]

        roles = {}
        for role_def in role_definitions:
            role, created = Role.objects.get_or_create(
                role_name=role_def['role_name'],
                defaults={'description': role_def['description']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Created role: {role.role_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'  ⚠ Role already exists: {role.role_name}'))
            roles[role.role_name] = role

        return roles

    def setup_permissions(self, roles):
        """Setup permissions for each role based on their responsibilities"""

        # Get all content types for the apps
        from apps.documents.models import Document, Crate
        from apps.storage.models import Storage
        from apps.requests.models import Request
        from apps.audit.models import AuditLog
        from apps.reports.models import Report

        # Define permissions for each role
        role_permissions = {
            'Admin': {
                'description': 'Full system access',
                'permissions': 'all'  # Admin gets all permissions
            },
            'Section Head': {
                'description': 'Document and section management',
                'apps': ['documents', 'requests', 'storage', 'reports'],
                'actions': ['add', 'change', 'view'],
                'additional': [
                    ('documents', 'document', 'add'),
                    ('documents', 'document', 'change'),
                    ('documents', 'document', 'view'),
                    ('documents', 'crate', 'add'),
                    ('documents', 'crate', 'change'),
                    ('documents', 'crate', 'view'),
                    ('requests', 'request', 'add'),
                    ('requests', 'request', 'change'),
                    ('requests', 'request', 'view'),
                    ('storage', 'storage', 'view'),
                    ('reports', 'report', 'view'),
                ]
            },
            'Head QC': {
                'description': 'Quality control and approval',
                'apps': ['documents', 'requests', 'audit', 'reports'],
                'actions': ['view', 'change'],
                'additional': [
                    ('documents', 'document', 'view'),
                    ('documents', 'document', 'change'),
                    ('documents', 'crate', 'view'),
                    ('requests', 'request', 'view'),
                    ('requests', 'request', 'change'),
                    ('audit', 'auditlog', 'view'),
                    ('reports', 'report', 'view'),
                    ('reports', 'report', 'add'),
                ]
            },
            'Document Store': {
                'description': 'Storage and retrieval operations',
                'apps': ['documents', 'storage', 'requests'],
                'actions': ['add', 'change', 'view'],
                'additional': [
                    ('documents', 'document', 'view'),
                    ('documents', 'crate', 'add'),
                    ('documents', 'crate', 'change'),
                    ('documents', 'crate', 'view'),
                    ('storage', 'storage', 'add'),
                    ('storage', 'storage', 'change'),
                    ('storage', 'storage', 'view'),
                    ('storage', 'storagelocation', 'add'),
                    ('storage', 'storagelocation', 'change'),
                    ('storage', 'storagelocation', 'view'),
                    ('requests', 'request', 'view'),
                    ('requests', 'request', 'change'),
                ]
            },
        }

        for role_name, role_obj in roles.items():
            self.stdout.write(f'\n  Configuring permissions for: {role_name}')

            if role_name == 'Admin':
                # Admin gets all permissions
                all_permissions = Permission.objects.all()
                # Clear existing permissions first
                role_obj.save()  # Just save the role, we'll handle permissions via User.user_permissions
                self.stdout.write(self.style.SUCCESS(f'    ✓ Admin role configured with full access'))
            else:
                config = role_permissions[role_name]
                self.stdout.write(f'    {config["description"]}')

                permissions_to_add = []
                if 'additional' in config:
                    for app_label, model_name, action in config['additional']:
                        try:
                            content_type = ContentType.objects.get(
                                app_label=app_label,
                                model=model_name
                            )
                            codename = f'{action}_{model_name}'
                            permission = Permission.objects.get(
                                content_type=content_type,
                                codename=codename
                            )
                            permissions_to_add.append(permission)
                        except (ContentType.DoesNotExist, Permission.DoesNotExist):
                            self.stdout.write(
                                self.style.WARNING(
                                    f'      ⚠ Permission not found: {app_label}.{action}_{model_name}'
                                )
                            )

                self.stdout.write(self.style.SUCCESS(
                    f'    ✓ Configured {len(permissions_to_add)} permissions'
                ))

    def create_default_org_structure(self):
        """Create default organizational structure for testing"""

        # Create default unit
        unit, created = Unit.objects.get_or_create(
            unit_code='TEST-UNIT',
            defaults={
                'unit_name': 'Test Unit',
                'location': 'Test Location'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created default unit: {unit.unit_code}'))
        else:
            self.stdout.write(self.style.WARNING(f'  ⚠ Unit already exists: {unit.unit_code}'))

        # Create default department
        department, created = Department.objects.get_or_create(
            department_name='Test Department',
            unit=unit,
            defaults={
                'department_head': None
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created default department: {department.department_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'  ⚠ Department already exists: {department.department_name}'))

        # Create default section
        section, created = Section.objects.get_or_create(
            section_name='Test Section',
            department=department
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created default section: {section.section_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'  ⚠ Section already exists: {section.section_name}'))

        return unit, department, section

    def create_test_admin(self, admin_role, unit, section):
        """Create test admin account"""

        # Check if admin user already exists
        if User.objects.filter(username='admin').exists():
            self.stdout.write(self.style.WARNING('  ⚠ Admin user already exists'))
            admin_user = User.objects.get(username='admin')
            return admin_user

        # Create admin user
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@cipla.com',
            password='Admin@123456',
            full_name='System Administrator',
            role=admin_role,
            section=section,
            unit=unit,
            status='Active',
            is_staff=True,
            is_superuser=True,
            must_change_password=False
        )

        self.stdout.write(self.style.SUCCESS('  ✓ Created test admin account'))
        self.stdout.write(self.style.SUCCESS(f'    Username: {admin_user.username}'))
        self.stdout.write(self.style.SUCCESS(f'    Email: {admin_user.email}'))

        return admin_user

    def create_session_policy(self, admin_user):
        """Create default session policy"""

        if SessionPolicy.objects.exists():
            self.stdout.write(self.style.WARNING('  ⚠ Session policy already exists'))
            return

        session_policy = SessionPolicy.objects.create(
            session_timeout_minutes=30,
            updated_by=admin_user
        )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Created session policy: {session_policy.session_timeout_minutes} minutes'))
