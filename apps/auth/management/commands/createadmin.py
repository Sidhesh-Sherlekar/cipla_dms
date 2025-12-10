from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.auth.models import Role

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser with proper role setup'

    def handle(self, *args, **options):
        # Check if admin role exists, create if not
        admin_role, created = Role.objects.get_or_create(
            role_name='Admin',
            defaults={'description': 'System Administrator with full access'}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created Admin role'))
        
        # Check if superuser already exists
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING('Superuser already exists!'))
            return
        
        # Get user details
        username = input('Username: ')
        email = input('Email: ')
        full_name = input('Full name: ')
        password = None
        
        while not password:
            password = input('Password: ')
            password_confirm = input('Password (again): ')
            
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match. Try again.'))
                password = None
        
        # Create superuser
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            role=admin_role,
            status='Active'
        )
        
        self.stdout.write(self.style.SUCCESS(f'Superuser {username} created successfully!'))
