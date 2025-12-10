from django.core.management.base import BaseCommand
from apps.auth.models import Role


class Command(BaseCommand):
    help = 'Initialize default roles for the system'

    def handle(self, *args, **options):
        roles = [
            {
                'role_name': 'Admin',
                'description': 'System Administrator with full access to all features'
            },
            {
                'role_name': 'Section Head',
                'description': 'Can create storage, withdrawal, and destruction requests'
            },
            {
                'role_name': 'Head QC',
                'description': 'Can approve or reject requests'
            },
            {
                'role_name': 'Document Store',
                'description': 'Can allocate storage and issue/receive documents'
            },
        ]
        
        created_count = 0
        for role_data in roles:
            role, created = Role.objects.get_or_create(
                role_name=role_data['role_name'],
                defaults={'description': role_data['description']}
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created role: {role.role_name}"))
            else:
                self.stdout.write(f"Role already exists: {role.role_name}")
        
        self.stdout.write(self.style.SUCCESS(f'\nInitialization complete! Created {created_count} new roles.'))
        self.stdout.write(self.style.SUCCESS(f'Total roles: {Role.objects.count()}'))
