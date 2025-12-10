from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from .models import Role, Unit, Department, Section, UserUnit, SessionPolicy, PasswordPolicy, Privilege, RolePrivilege

User = get_user_model()


class PrivilegeSerializer(serializers.ModelSerializer):
    """Serializer for Privilege model"""

    class Meta:
        model = Privilege
        fields = ['id', 'codename', 'name', 'description', 'category', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PrivilegeSimpleSerializer(serializers.ModelSerializer):
    """Simple serializer for Privilege (used in lists)"""

    class Meta:
        model = Privilege
        fields = ['id', 'codename', 'name', 'category']


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model with privileges"""
    privileges = PrivilegeSimpleSerializer(many=True, read_only=True)
    privilege_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    privilege_codenames = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    privilege_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'role_name', 'description', 'is_core_role', 'is_active', 'privileges', 'privilege_ids',
                  'privilege_codenames', 'privilege_count', 'user_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_privilege_codenames(self, obj):
        """Return list of privilege codenames for this role"""
        return obj.get_privilege_codenames()

    def get_user_count(self, obj):
        """Return count of users with this role"""
        return obj.users.count()

    def get_privilege_count(self, obj):
        """Return count of privileges for this role"""
        return obj.privileges.filter(is_active=True).count()

    def create(self, validated_data):
        """Create role with privileges"""
        privilege_ids = validated_data.pop('privilege_ids', [])
        role = super().create(validated_data)

        if privilege_ids:
            privileges = Privilege.objects.filter(id__in=privilege_ids, is_active=True)
            for privilege in privileges:
                RolePrivilege.objects.create(role=role, privilege=privilege)

        return role

    def update(self, instance, validated_data):
        """Update role with privileges"""
        privilege_ids = validated_data.pop('privilege_ids', None)
        role = super().update(instance, validated_data)

        if privilege_ids is not None:
            # Clear existing privileges and set new ones
            RolePrivilege.objects.filter(role=role).delete()
            privileges = Privilege.objects.filter(id__in=privilege_ids, is_active=True)
            for privilege in privileges:
                RolePrivilege.objects.create(role=role, privilege=privilege)

        return role


class UnitSerializer(serializers.ModelSerializer):
    """Serializer for Unit model"""

    class Meta:
        model = Unit
        fields = ['id', 'unit_code', 'unit_name', 'location', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DepartmentSerializerBasic(serializers.ModelSerializer):
    """Basic Department serializer without user reference"""
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Department
        fields = [
            'id',
            'department_name',
            'unit',
            'unit_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SectionSerializer(serializers.ModelSerializer):
    """Serializer for Section model"""
    department = DepartmentSerializerBasic(read_only=True)
    department_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Section
        fields = ['id', 'section_name', 'department', 'department_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GroupSerializer(serializers.ModelSerializer):
    """Serializer for Django Groups (primary RBAC mechanism)"""
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions']

    def get_permissions(self, obj):
        return list(obj.permissions.values_list('codename', flat=True))


class UserUnitSerializer(serializers.ModelSerializer):
    """Serializer for UserUnit assignments (user assigned to units with departments)"""
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.IntegerField(write_only=True)
    department_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    departments = DepartmentSerializerBasic(many=True, read_only=True)

    class Meta:
        model = UserUnit
        fields = ['id', 'unit', 'unit_id', 'departments', 'department_ids', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    Uses Django's built-in groups for RBAC
    Supports multiple unit assignments with departments
    """
    groups = GroupSerializer(many=True, read_only=True)
    role_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    privileges = serializers.SerializerMethodField()

    # Legacy single fields (for backward compatibility)
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    section = SectionSerializer(read_only=True)
    section_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    # New multi-select fields
    units = serializers.SerializerMethodField()  # Read-only: list of all units
    sections = SectionSerializer(many=True, read_only=True)  # Read-only: list of all sections
    departments = serializers.SerializerMethodField()  # Read-only: list of all departments

    # Unit assignments (nested format)
    unit_assignments = serializers.SerializerMethodField()
    unit_assignments_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    # Flat array format (write-only) - for frontend cascading selection
    unit_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    department_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    section_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'status',
            'failed_login_attempts',
            'locked_until',
            'must_change_password',
            'password_changed_at',
            'password_expired',
            'last_login',
            'last_login_ip',
            'is_staff',
            'is_superuser',
            'groups',  # Django groups (primary RBAC)
            'role',  # Legacy role field (for backward compatibility)
            'role_name',  # Convenience field
            'unit',  # Legacy: User's primary unit
            'unit_id',  # Write-only unit ID
            'section',  # Legacy: User's primary section
            'section_id',  # Write-only section ID
            'units',  # New: List of all units (read-only)
            'sections',  # New: List of all sections (read-only)
            'departments',  # New: List of all departments (read-only)
            'unit_assignments',  # Nested: List of unit assignments with departments
            'unit_assignments_data',  # Write-only: for creating/updating assignments (nested)
            'unit_ids',  # Write-only: flat array of unit IDs
            'department_ids',  # Write-only: flat array of department IDs
            'section_ids',  # Write-only: flat array of section IDs
            'permissions',
            'privileges',  # User's privileges from their role
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'last_login', 'last_login_ip', 'failed_login_attempts', 'locked_until', 'must_change_password', 'password_changed_at', 'password_expired', 'created_at', 'updated_at']

    def validate_email(self, value):
        """Validate email is unique"""
        if not value:
            raise serializers.ValidationError("Email is required")

        # Normalize email to lowercase for case-insensitive uniqueness
        value = value.lower()

        # Check for existing email (exclude current user during updates)
        user_queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            user_queryset = user_queryset.exclude(pk=self.instance.pk)

        if user_queryset.exists():
            raise serializers.ValidationError("A user with this email already exists")

        return value

    def get_role_name(self, obj):
        """Get primary role name - either from groups or legacy role field"""
        if obj.groups.exists():
            # Return first group name if exists
            return obj.groups.first().name
        elif hasattr(obj, 'role') and obj.role:
            # Fallback to legacy role
            return obj.role.role_name
        return None

    def get_permissions(self, obj):
        """Get all user permissions (from groups and direct permissions)"""
        return list(obj.get_all_permissions())

    def get_privileges(self, obj):
        """Get all user privileges from their role"""
        if hasattr(obj, 'role') and obj.role:
            return obj.role.get_privilege_codenames()
        return []

    def get_units(self, obj):
        """Get all units the user is assigned to (via UserUnit)"""
        from apps.auth.models import UserUnit
        unit_assignments = UserUnit.objects.filter(user=obj).select_related('unit')
        return UnitSerializer([assignment.unit for assignment in unit_assignments], many=True).data

    def get_departments(self, obj):
        """Get all departments from all unit assignments"""
        from apps.auth.models import UserUnit
        departments = []
        unit_assignments = UserUnit.objects.filter(user=obj).prefetch_related('departments')
        for assignment in unit_assignments:
            departments.extend(assignment.departments.all())
        return DepartmentSerializerBasic(departments, many=True).data

    def get_unit_assignments(self, obj):
        """Get all unit assignments with departments"""
        from apps.auth.models import UserUnit
        assignments = UserUnit.objects.filter(user=obj).prefetch_related('unit', 'departments')
        return [{
            'id': assignment.id,
            'unit': UnitSerializer(assignment.unit).data,
            'departments': DepartmentSerializerBasic(assignment.departments.all(), many=True).data
        } for assignment in assignments]

    def create(self, validated_data):
        """Override create to handle unit_ids, department_ids, section_ids separately"""
        # Extract the write-only array fields
        unit_ids = validated_data.pop('unit_ids', None)
        department_ids = validated_data.pop('department_ids', None)
        section_ids = validated_data.pop('section_ids', None)
        unit_assignments_data = validated_data.pop('unit_assignments_data', None)

        # Create the user (without the array fields)
        user = super().create(validated_data)

        # The actual unit/department/section assignment is handled in views.py
        # This just ensures the fields don't cause errors during creation

        return user

    def update(self, instance, validated_data):
        """Override update to handle unit_ids, department_ids, section_ids separately"""
        # Extract the write-only array fields
        unit_ids = validated_data.pop('unit_ids', None)
        department_ids = validated_data.pop('department_ids', None)
        section_ids = validated_data.pop('section_ids', None)
        unit_assignments_data = validated_data.pop('unit_assignments_data', None)

        # Update the user (without the array fields)
        user = super().update(instance, validated_data)

        # The actual unit/department/section assignment is handled in views.py
        # This just ensures the fields don't cause errors during update

        return user


class DepartmentSerializer(serializers.ModelSerializer):
    """Full Department serializer with user reference"""
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.IntegerField(write_only=True)
    department_head = UserSerializer(read_only=True)
    department_head_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Department
        fields = [
            'id',
            'department_name',
            'department_head',
            'department_head_id',
            'unit',
            'unit_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Django Permissions"""

    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']


class PasswordPolicySerializer(serializers.ModelSerializer):
    """Serializer for Password Policy"""
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PasswordPolicy
        fields = [
            'id',
            'password_expiry_days',
            'updated_at',
            'updated_by',
            'updated_by_name'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by', 'updated_by_name']

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.full_name
        return None

    def validate_password_expiry_days(self, value):
        """Validate password expiry days is between 1 and 90"""
        if value < 1 or value > 90:
            raise serializers.ValidationError("Password expiry must be between 1 and 90 days")
        return value


class SessionPolicySerializer(serializers.ModelSerializer):
    """Serializer for Session Policy"""
    updated_by_name = serializers.SerializerMethodField()
    timeout_options = serializers.SerializerMethodField()

    class Meta:
        model = SessionPolicy
        fields = [
            'id',
            'session_timeout_minutes',
            'updated_at',
            'updated_by',
            'updated_by_name',
            'timeout_options'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by', 'updated_by_name', 'timeout_options']

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.full_name
        return None

    def get_timeout_options(self, obj):
        """Return available timeout options"""
        return [
            {'value': value, 'label': label}
            for value, label in SessionPolicy.TIMEOUT_CHOICES
        ]
