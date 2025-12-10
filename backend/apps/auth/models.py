from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Privilege(models.Model):
    """
    Privileges for granular action-level access control.
    Privileges represent specific actions like 'create_request', 'approve_request', etc.
    """
    CATEGORY_CHOICES = [
        ('requests', 'Requests'),
        ('storage', 'Storage Operations'),
        ('users', 'User Management'),
        ('master_data', 'Master Data'),
        ('reports', 'Reports'),
        ('system', 'System'),
    ]

    id = models.AutoField(primary_key=True)
    codename = models.CharField(max_length=100, unique=True, help_text="Unique identifier like 'create_request'")
    name = models.CharField(max_length=255, help_text="Human-readable name like 'Create Request'")
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='system')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'privileges'
        verbose_name = 'Privilege'
        verbose_name_plural = 'Privileges'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.codename})"


class Role(models.Model):
    """
    Roles for RBAC (Role-Based Access Control)
    Roles: Section Head, Head QC, Document Store, Admin
    """
    id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_core_role = models.BooleanField(default=False, help_text="Core roles cannot be deleted")
    is_active = models.BooleanField(default=True)
    privileges = models.ManyToManyField(Privilege, through='RolePrivilege', related_name='roles', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.role_name

    def get_privilege_codenames(self):
        """Return list of privilege codenames for this role"""
        return list(self.privileges.filter(is_active=True).values_list('codename', flat=True))


class RolePrivilege(models.Model):
    """
    Many-to-Many relationship between Roles and Privileges
    """
    id = models.AutoField(primary_key=True)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_privileges')
    privilege = models.ForeignKey(Privilege, on_delete=models.CASCADE, related_name='privilege_roles')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'role_privileges'
        unique_together = ('role', 'privilege')
        verbose_name = 'Role Privilege'
        verbose_name_plural = 'Role Privileges'

    def __str__(self):
        return f"{self.role.role_name} - {self.privilege.codename}"


class User(AbstractUser):
    """
    Custom User Model extending Django's AbstractUser
    Implements 21 CFR Part 11 compliant user management

    Users can be assigned to multiple units with specific departments in each unit.
    """
    id = models.AutoField(primary_key=True)
    email = models.EmailField('email address', unique=True, blank=False)  # Override to make unique and required
    full_name = models.CharField(max_length=255)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name='users')
    units = models.ManyToManyField('Unit', through='UserUnit', related_name='assigned_users', blank=True)
    sections = models.ManyToManyField('Section', related_name='assigned_users', blank=True)  # Multiple sections
    section = models.ForeignKey('Section', on_delete=models.SET_NULL, null=True, blank=True, related_name='section_users')  # Deprecated

    # Deprecated: kept for backward compatibility, will be removed in future migration
    unit = models.ForeignKey('Unit', on_delete=models.SET_NULL, null=True, blank=True, related_name='unit_users')
    status = models.CharField(
        max_length=50,
        choices=[
            ('Active', 'Active'),
            ('Inactive', 'Inactive'),
            ('Suspended', 'Suspended'),
            ('Locked', 'Locked')
        ],
        default='Active'
    )
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    must_change_password = models.BooleanField(default=False)
    password_changed_at = models.DateTimeField(null=True, blank=True, help_text='Last password change timestamp')
    password_expired = models.BooleanField(default=False, help_text='True if password has expired')
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.full_name})"

    def is_locked(self):
        """Check if user account is manually locked by administrator"""
        return self.status == 'Locked'

    def unlock(self):
        """Unlock user account (set by administrator)"""
        self.status = 'Active'
        self.failed_login_attempts = 0
        self.save()

    def check_password_expiry(self):
        """Check if password has expired and update status"""
        if not self.password_changed_at:
            return False

        from django.utils import timezone
        from datetime import timedelta

        # Get global password expiry policy
        # Import here to avoid circular import
        password_expiry_days = 90  # Default
        try:
            from apps.auth.models import PasswordPolicy
            password_expiry_days = PasswordPolicy.get_current_expiry_days()
        except:
            pass

        expiry_date = self.password_changed_at + timedelta(days=password_expiry_days)
        if timezone.now() > expiry_date:
            self.password_expired = True
            self.status = 'Locked'
            self.save(update_fields=['password_expired', 'status'])
            return True
        return False

    def set_password(self, raw_password):
        """Override set_password to track password change timestamp"""
        super().set_password(raw_password)
        from django.utils import timezone
        self.password_changed_at = timezone.now()
        self.password_expired = False


class Unit(models.Model):
    """
    Organizational Units (e.g., different Cipla facilities/plants)
    """
    id = models.AutoField(primary_key=True)
    unit_code = models.CharField(max_length=50, unique=True)
    unit_name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'units'
        verbose_name = 'Unit'
        verbose_name_plural = 'Units'

    def __str__(self):
        return f"{self.unit_code} - {self.unit_name}"


class Department(models.Model):
    """
    Departments within Units
    """
    id = models.AutoField(primary_key=True)
    department_name = models.CharField(max_length=255)
    department_head = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments'
    )
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='departments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

    def __str__(self):
        return f"{self.department_name} ({self.unit.unit_code})"


class Section(models.Model):
    """
    Sections within Departments
    """
    id = models.AutoField(primary_key=True)
    section_name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='sections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sections'
        verbose_name = 'Section'
        verbose_name_plural = 'Sections'

    def __str__(self):
        return f"{self.section_name} ({self.department.department_name})"


class UserUnit(models.Model):
    """
    Many-to-Many relationship between Users and Units
    Tracks which units and departments a user has access to
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_unit_assignments')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='unit_user_assignments')
    departments = models.ManyToManyField(Department, blank=True, related_name='user_assignments')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'user_units'
        unique_together = ('user', 'unit')
        verbose_name = 'User Unit Assignment'
        verbose_name_plural = 'User Unit Assignments'

    def __str__(self):
        dept_count = self.departments.count()
        return f"{self.user.username} - {self.unit.unit_code} ({dept_count} depts)"


class DeptUser(models.Model):
    """
    Many-to-Many relationship between Users and Departments
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)

    class Meta:
        db_table = 'dept_users'
        unique_together = ('user', 'department')
        verbose_name = 'Department User'
        verbose_name_plural = 'Department Users'

    def __str__(self):
        return f"{self.user.username} - {self.department.department_name}"


class SectionUser(models.Model):
    """
    Many-to-Many relationship between Users and Sections
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    section = models.ForeignKey(Section, on_delete=models.CASCADE)

    class Meta:
        db_table = 'section_users'
        unique_together = ('user', 'section')
        verbose_name = 'Section User'
        verbose_name_plural = 'Section Users'

    def __str__(self):
        return f"{self.user.username} - {self.section.section_name}"


class PasswordPolicy(models.Model):
    """
    Password Policy configuration
    Stores password expiry settings that can be changed dynamically
    """
    id = models.AutoField(primary_key=True)
    password_expiry_days = models.IntegerField(
        default=90,
        help_text='Password expires after this many days (1-90)'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='password_policy_updates'
    )

    class Meta:
        db_table = 'password_policy'
        verbose_name = 'Password Policy'
        verbose_name_plural = 'Password Policies'

    def __str__(self):
        return f"Password Expiry: {self.password_expiry_days} days"

    @classmethod
    def get_current_expiry_days(cls):
        """Get the current password expiry days"""
        policy = cls.objects.first()
        if policy:
            return policy.password_expiry_days
        return 90  # Default 90 days

    def save(self, *args, **kwargs):
        # Ensure only one PasswordPolicy instance exists (singleton pattern)
        if not self.pk and PasswordPolicy.objects.exists():
            raise ValueError('Only one PasswordPolicy instance can exist')
        # Validate expiry days is between 1 and 90
        if self.password_expiry_days < 1 or self.password_expiry_days > 90:
            raise ValueError('Password expiry days must be between 1 and 90')
        super().save(*args, **kwargs)


class SessionPolicy(models.Model):
    """
    Session Policy configuration
    Stores predefined session timeout settings that can be changed dynamically
    """
    TIMEOUT_CHOICES = [
        (5, '5 minutes'),
        (10, '10 minutes'),
        (15, '15 minutes'),
        (20, '20 minutes'),
        (25, '25 minutes'),
        (30, '30 minutes'),
    ]

    id = models.AutoField(primary_key=True)
    session_timeout_minutes = models.IntegerField(
        choices=TIMEOUT_CHOICES,
        default=30,
        help_text='Session timeout in minutes (automatically logs out inactive users)'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='session_policy_updates'
    )

    class Meta:
        db_table = 'session_policy'
        verbose_name = 'Session Policy'
        verbose_name_plural = 'Session Policies'

    def __str__(self):
        return f"Session Timeout: {self.session_timeout_minutes} minutes"

    @classmethod
    def get_current_timeout(cls):
        """Get the current session timeout in seconds (for Django SESSION_COOKIE_AGE)"""
        policy = cls.objects.first()
        if policy:
            return policy.session_timeout_minutes * 60
        return 30 * 60  # Default 30 minutes

    def save(self, *args, **kwargs):
        # Ensure only one SessionPolicy instance exists (singleton pattern)
        if not self.pk and SessionPolicy.objects.exists():
            raise ValueError('Only one SessionPolicy instance can exist')
        super().save(*args, **kwargs)


# Import Digital Signature models
from .models_signature import DigitalSignature, SignatureHistory

