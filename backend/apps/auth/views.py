from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group, Permission
from .serializers import UserSerializer, RoleSerializer, PrivilegeSerializer
from .models import Role, Privilege, RolePrivilege
from .permissions import CanManageUsers, CanManageMasterData

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user information
    """

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add user info to token response
        data['user'] = UserSerializer(self.user).data

        # Update last login IP (will be done in view)
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that logs IP address
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # Log IP address if login successful
        if response.status_code == 200:
            username = request.data.get('username')
            user = User.objects.filter(username=username).first()

            if user:
                # Get client IP
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0]
                else:
                    ip = request.META.get('REMOTE_ADDR')

                from django.utils import timezone
                user.last_login_ip = ip
                user.last_login = timezone.now()
                user.save(update_fields=['last_login_ip', 'last_login'])

        return response


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login endpoint that returns JWT tokens and user info
    Implements account lockout after 5 failed attempts

    POST /api/auth/login/
    {
        "username": "string",
        "password": "string"
    }

    Returns:
    {
        "access": "jwt_access_token",
        "refresh": "jwt_refresh_token",
        "user": {user_object}
    }
    """
    from django.utils import timezone
    from datetime import timedelta

    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Import audit logging functions
    from apps.audit.utils import log_login_success, log_login_failed

    # Try to get the user first to check account status
    try:
        user = User.objects.get(username=username)

        # Check if password has expired
        if user.check_password_expiry():
            # Log failed login attempt - password expired
            log_login_failed(
                user=user,
                reason='Password has expired',
                django_request=request
            )
            return Response(
                {'error': 'Your password has expired. Please contact an administrator to unlock your account.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if account is manually locked by administrator
        if user.status == 'Locked':
            # Log failed login attempt - account locked
            log_login_failed(
                user=user,
                reason='Account is locked',
                django_request=request
            )
            return Response(
                {'error': 'Account is locked. Please contact an administrator to unlock your account.'},
                status=status.HTTP_403_FORBIDDEN
            )
    except User.DoesNotExist:
        # Log failed login attempt - user not found
        log_login_failed(
            user=None,
            reason='User not found',
            django_request=request,
            attempted_username=username
        )
        # Don't reveal that the user doesn't exist
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Authenticate user
    authenticated_user = authenticate(username=username, password=password)

    if authenticated_user is None:
        # Increment failed login attempts (for audit purposes only, no automatic lockout)
        user.failed_login_attempts += 1
        user.save(update_fields=['failed_login_attempts'])

        # Log failed login attempt - invalid password
        log_login_failed(
            user=user,
            reason=f'Invalid password (attempt #{user.failed_login_attempts})',
            django_request=request
        )

        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Reset failed login attempts on successful login
    user.failed_login_attempts = 0

    # Check if user is active
    if user.status != 'Active':
        # Log failed login attempt - account not active
        log_login_failed(
            user=user,
            reason=f'Account status is {user.status}',
            django_request=request
        )
        return Response(
            {'error': f'User account is {user.status}'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)

    # Get client IP
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')

    # Update last login IP and reset failed login attempts
    user.last_login_ip = ip
    user.last_login = timezone.now()
    user.save(update_fields=['last_login_ip', 'last_login', 'failed_login_attempts'])

    # Log successful login
    log_login_success(user=user, django_request=request)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout endpoint (optional - tokens are stateless)
    Client should delete tokens from localStorage

    POST /api/auth/logout/
    """
    # Log the logout event
    from apps.audit.utils import log_logout
    log_logout(user=request.user, django_request=request)

    # In a blacklist implementation, you would blacklist the refresh token here
    # For now, we just return success
    return Response(
        {'message': 'Logout successful'},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_terminate(request):
    """
    Session termination endpoint for tab/window close
    Logs when a user's session is terminated due to tab/window closing

    POST /api/auth/session-terminate/
    Body:
    {
        "reason": "Tab closed" (optional)
    }
    """
    reason = request.data.get('reason', 'Tab/window closed')

    # Log the session termination event
    from apps.audit.utils import log_session_terminated
    log_session_terminated(user=request.user, reason=reason, django_request=request)

    return Response(
        {'message': 'Session terminated successfully'},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Get current authenticated user info

    GET /api/auth/me/
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_permissions(request):
    """
    Get current user's permissions

    GET /api/auth/permissions/

    Returns:
    {
        "groups": ["group1", "group2"],
        "permissions": ["app.permission1", "app.permission2"]
    }
    """
    user = request.user

    # Get user's groups
    groups = list(user.groups.values_list('name', flat=True))

    # Get user's permissions (both direct and from groups)
    permissions = list(user.get_all_permissions())

    return Response({
        'groups': groups,
        'permissions': permissions,
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff
    }, status=status.HTTP_200_OK)


# User Management Endpoints

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, CanManageUsers])
def user_list(request):
    """
    Get list of users or create new user

    GET /api/auth/users/
    POST /api/auth/users/
    """
    if request.method == 'GET':
        users = User.objects.all().order_by('-created_at')

        # Filter by status
        status_param = request.query_params.get('status')
        if status_param:
            users = users.filter(status=status_param)

        # Search by username or full name
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            users = users.filter(
                Q(username__icontains=search) |
                Q(full_name__icontains=search) |
                Q(email__icontains=search)
            )

        serializer = UserSerializer(users, many=True)
        return Response({
            'count': users.count(),
            'results': serializer.data
        })

    elif request.method == 'POST':
        # Prepare data for serializer
        user_data = request.data.copy()
        
        # Handle role assignment - convert role name to role ID if needed
        role_value = user_data.get('role')
        if role_value:
            # If role is a string (role name), find the Role object
            if isinstance(role_value, str):
                try:
                    from .models import Role
                    role = Role.objects.get(role_name=role_value)
                    user_data['role'] = role.id
                except Role.DoesNotExist:
                    # If role doesn't exist, try to create it
                    from .models import Role
                    role, _ = Role.objects.get_or_create(
                        role_name=role_value,
                        defaults={'description': f'Auto-created role: {role_value}'}
                    )
                    user_data['role'] = role.id
            # If role is already an ID, keep it as is
        else:
            # If no role provided, assign a default role (Section Head)
            from .models import Role
            default_role, _ = Role.objects.get_or_create(
                role_name='Section Head',
                defaults={'description': 'Default role for new users'}
            )
            user_data['role'] = default_role.id
        
        serializer = UserSerializer(data=user_data)
        if serializer.is_valid():
            user = serializer.save()

            # Generate temporary password for new user
            import secrets
            import string

            # Generate a secure random temporary password (8 characters: letters + digits)
            alphabet = string.ascii_letters + string.digits
            temp_password = ''.join(secrets.choice(alphabet) for _ in range(8))

            # Set password if provided (for admin override), otherwise use generated temp password
            password = request.data.get('password')
            if password:
                user.set_password(password)
                # If admin provides password, still require change on first login
                user.must_change_password = True
            else:
                user.set_password(temp_password)
                user.must_change_password = True

            user.save()

            # Refresh user from database to ensure role relationship is loaded
            user.refresh_from_db()

            # Assign user to Django Group based on role name
            if user.role:
                role_name = user.role.role_name
                try:
                    group = Group.objects.get(name=role_name)
                    user.groups.add(group)
                except Group.DoesNotExist:
                    # Create group if it doesn't exist
                    group = Group.objects.create(name=role_name)
                    user.groups.add(group)

            # Handle unit assignments (multiple units with departments)
            # Support both old format (unit_assignments_data) and new format (flat arrays)
            unit_assignments_data = request.data.get('unit_assignments_data', [])
            unit_ids = request.data.get('unit_ids', [])
            department_ids = request.data.get('department_ids', [])
            section_ids = request.data.get('section_ids', [])

            if unit_ids or unit_assignments_data:
                from .models import UserUnit, Department, Section

                # Clear existing unit assignments
                UserUnit.objects.filter(user=user).delete()

                # Handle new flat array format
                if unit_ids:
                    # Group departments by their units
                    departments_by_unit = {}
                    if department_ids:
                        departments = Department.objects.filter(
                            id__in=department_ids
                        ).select_related('unit')

                        for dept in departments:
                            unit_id = dept.unit.id
                            if unit_id not in departments_by_unit:
                                departments_by_unit[unit_id] = []
                            departments_by_unit[unit_id].append(dept.id)

                    # Create UserUnit for each selected unit
                    for unit_id in unit_ids:
                        user_unit = UserUnit.objects.create(
                            user=user,
                            unit_id=unit_id
                        )

                        # Assign departments that belong to this unit
                        if unit_id in departments_by_unit:
                            dept_ids = departments_by_unit[unit_id]
                            depts = Department.objects.filter(id__in=dept_ids)
                            user_unit.departments.set(depts)

                # Handle old nested format (for backward compatibility)
                elif unit_assignments_data:
                    for assignment in unit_assignments_data:
                        unit_id = assignment.get('unit_id')
                        dept_ids = assignment.get('department_ids', [])

                        if unit_id:
                            user_unit = UserUnit.objects.create(
                                user=user,
                                unit_id=unit_id
                            )
                            if dept_ids:
                                departments = Department.objects.filter(id__in=dept_ids)
                                user_unit.departments.set(departments)

                # Assign sections to user (M2M relationship)
                if section_ids:
                    sections = Section.objects.filter(id__in=section_ids)
                    user.sections.set(sections)

            # Audit logging
            from apps.audit.utils import log_audit_event

            # Build unit assignments message for audit
            unit_assignments_msg = ""
            if unit_assignments_data:
                from .models import UserUnit
                assignments = UserUnit.objects.filter(user=user).prefetch_related('unit', 'departments')
                unit_details = []
                for ua in assignments:
                    dept_names = ', '.join([d.department_name for d in ua.departments.all()])
                    unit_details.append(f"{ua.unit.unit_name} (Depts: {dept_names if dept_names else 'All'})")
                unit_assignments_msg = f", Unit Assignments: [{'; '.join(unit_details)}]"

            log_audit_event(
                user=request.user,
                action='Created',
                message=f'User created: {user.username} ({user.full_name}) with role {user.role.role_name if user.role else "None"}, Unit: {user.unit.unit_name if user.unit else "None"}, Section: {user.section.section_name if user.section else "None"}{unit_assignments_msg}. Temporary password assigned.',
                request=request
            )

            # Send email notification to user with temporary password
            try:
                from apps.notifications.tasks import send_user_created_notification
                send_user_created_notification.delay(user.id, temp_password if not password else '[Admin Provided]')
            except Exception as e:
                print(f"Failed to queue user creation email: {str(e)}")

            # Prepare response with temporary password (will be removed once email is implemented)
            response_data = serializer.data
            if not password:  # Only include temp password in response if it was auto-generated
                response_data['temporary_password'] = temp_password
                response_data['message'] = 'User created successfully. Temporary password generated. Please send this password to the user securely.'
            else:
                response_data['message'] = 'User created successfully. User must change password on first login.'

            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, CanManageUsers])
def user_detail(request, pk):
    """
    Get, update or delete a specific user

    GET /api/auth/users/{id}/
    PUT /api/auth/users/{id}/
    DELETE /api/auth/users/{id}/
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Store old values for audit logging
        old_role = user.role.role_name if user.role else "None"
        old_unit = user.unit.unit_name if user.unit else "None"
        old_section = user.section.section_name if user.section else "None"
        old_status = user.status

        # Prepare data for serializer
        user_data = request.data.copy()

        # Handle role assignment - convert role name to role ID if needed
        role_value = user_data.get('role')
        if role_value:
            # If role is a string (role name), find the Role object
            if isinstance(role_value, str):
                try:
                    from .models import Role
                    role = Role.objects.get(role_name=role_value)
                    user_data['role'] = role.id
                except Role.DoesNotExist:
                    # If role doesn't exist, try to create it
                    from .models import Role
                    role, _ = Role.objects.get_or_create(
                        role_name=role_value,
                        defaults={'description': f'Auto-created role: {role_value}'}
                    )
                    user_data['role'] = role.id

        serializer = UserSerializer(user, data=user_data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # Refresh user from database to get updated role
            user.refresh_from_db()

            # Update password if provided
            password = request.data.get('password')
            if password:
                user.set_password(password)
                user.save()

            # Update Django Group assignment if role was updated
            if role_value and user.role:
                role_name = user.role.role_name
                # Remove user from all groups first
                user.groups.clear()
                # Add to new group
                try:
                    group = Group.objects.get(name=role_name)
                    user.groups.add(group)
                except Group.DoesNotExist:
                    # Create group if it doesn't exist
                    group = Group.objects.create(name=role_name)
                    user.groups.add(group)

            # Handle unit assignments (multiple units with departments)
            # Support both old format (unit_assignments_data) and new format (flat arrays)
            unit_assignments_data = request.data.get('unit_assignments_data')
            unit_ids = request.data.get('unit_ids')
            department_ids = request.data.get('department_ids')
            section_ids = request.data.get('section_ids')

            # Check if any unit assignment data was provided
            has_unit_data = (unit_ids is not None) or (unit_assignments_data is not None)

            if has_unit_data:
                from .models import UserUnit, Department, Section

                # Clear existing unit assignments
                UserUnit.objects.filter(user=user).delete()

                # Handle new flat array format
                if unit_ids is not None:
                    # Group departments by their units
                    departments_by_unit = {}
                    if department_ids:
                        departments = Department.objects.filter(
                            id__in=department_ids
                        ).select_related('unit')

                        for dept in departments:
                            unit_id = dept.unit.id
                            if unit_id not in departments_by_unit:
                                departments_by_unit[unit_id] = []
                            departments_by_unit[unit_id].append(dept.id)

                    # Create UserUnit for each selected unit
                    for unit_id in unit_ids:
                        user_unit = UserUnit.objects.create(
                            user=user,
                            unit_id=unit_id
                        )

                        # Assign departments that belong to this unit
                        if unit_id in departments_by_unit:
                            dept_ids = departments_by_unit[unit_id]
                            depts = Department.objects.filter(id__in=dept_ids)
                            user_unit.departments.set(depts)

                # Handle old nested format (for backward compatibility)
                elif unit_assignments_data is not None:
                    for assignment in unit_assignments_data:
                        unit_id = assignment.get('unit_id')
                        dept_ids = assignment.get('department_ids', [])

                        if unit_id:
                            user_unit = UserUnit.objects.create(
                                user=user,
                                unit_id=unit_id
                            )
                            if dept_ids:
                                departments = Department.objects.filter(id__in=dept_ids)
                                user_unit.departments.set(departments)

            # Assign sections to user (M2M relationship)
            if section_ids is not None:
                from .models import Section
                if section_ids:
                    sections = Section.objects.filter(id__in=section_ids)
                    user.sections.set(sections)
                else:
                    user.sections.clear()

            # Audit logging - capture changes
            from apps.audit.utils import log_audit_event
            changes = []
            new_role = user.role.role_name if user.role else "None"
            new_unit = user.unit.unit_name if user.unit else "None"
            new_section = user.section.section_name if user.section else "None"
            new_status = user.status

            if old_role != new_role:
                changes.append(f'Role: {old_role} → {new_role}')
            if old_unit != new_unit:
                changes.append(f'Unit: {old_unit} → {new_unit}')
            if old_section != new_section:
                changes.append(f'Section: {old_section} → {new_section}')
            if old_status != new_status:
                changes.append(f'Status: {old_status} → {new_status}')

            # Add unit assignments changes to audit log
            if unit_assignments_data is not None:
                from .models import UserUnit
                assignments = UserUnit.objects.filter(user=user).prefetch_related('unit', 'departments')
                unit_details = []
                for ua in assignments:
                    dept_names = ', '.join([d.department_name for d in ua.departments.all()])
                    unit_details.append(f"{ua.unit.unit_name} (Departments: {dept_names if dept_names else 'All'})")
                changes.append(f"Unit Assignments: [{'; '.join(unit_details) if unit_details else 'None'}]")

            change_details = ', '.join(changes) if changes else 'Profile updated'
            log_audit_event(
                user=request.user,
                action='Updated',
                message=f'User updated: {user.username} ({user.full_name}) - {change_details}',
                request=request
            )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='Deleted',
            message=f'User deleted: {user.username} ({user.full_name}), Role: {user.role.role_name if user.role else "None"}',
            request=request
        )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Master Data Endpoints

from .models import Unit, Department, Section
from .serializers import UnitSerializer, DepartmentSerializer, SectionSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def unit_list(request):
    """
    GET /api/auth/units/ - All authenticated users (filtered by user's unit)
    POST /api/auth/units/ - System Admin only
    """
    if request.method == 'GET':
        # All users can read, but filtered by their units (except System Admins who see all)
        units = Unit.objects.all().order_by('unit_code')

        # Non-System Admin users only see their assigned units
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            # Check for units via many-to-many (new system)
            user_units = request.user.units.all()
            if user_units.exists():
                units = user_units.order_by('unit_code')
            elif request.user.unit:
                # Fallback to legacy single unit field
                units = units.filter(id=request.user.unit.id)
            else:
                # User has no unit assigned, return empty
                units = Unit.objects.none()

        serializer = UnitSerializer(units, many=True)
        return Response({
            'count': units.count(),
            'results': serializer.data
        })

    elif request.method == 'POST':
        # Only System Admin can create units
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can create units'}, status=status.HTTP_403_FORBIDDEN)

        serializer = UnitSerializer(data=request.data)
        if serializer.is_valid():
            unit = serializer.save()

            # Audit logging
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Created',
                message=f'Unit created: {unit.unit_name} ({unit.unit_code})',
                request=request
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, CanManageMasterData])
def unit_detail(request, pk):
    """
    GET /api/auth/units/{id}/
    PUT /api/auth/units/{id}/
    DELETE /api/auth/units/{id}/
    """
    try:
        unit = Unit.objects.get(pk=pk)
    except Unit.DoesNotExist:
        return Response({'error': 'Unit not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = UnitSerializer(unit)
        return Response(serializer.data)

    elif request.method == 'PUT':
        old_name = unit.unit_name
        serializer = UnitSerializer(unit, data=request.data, partial=True)
        if serializer.is_valid():
            unit = serializer.save()

            # Audit logging
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Updated',
                message=f'Unit updated: {old_name} → {unit.unit_name} ({unit.unit_code})',
                request=request
            )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='Deleted',
            message=f'Unit deleted: {unit.unit_name} ({unit.unit_code})',
            request=request
        )

        unit.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def department_list(request):
    """
    GET /api/auth/departments/ - All authenticated users (filtered by user's unit)
    POST /api/auth/departments/ - System Admin only
    """
    if request.method == 'GET':
        departments = Department.objects.select_related('unit', 'department_head').all()

        # Filter by user's units (except System Admins who see all)
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            # Check for units via many-to-many (new system)
            user_units = request.user.units.all()
            if user_units.exists():
                departments = departments.filter(unit__in=user_units)
            elif request.user.unit:
                # Fallback to legacy single unit field
                departments = departments.filter(unit=request.user.unit)
            else:
                # User has no unit assigned, return empty
                departments = Department.objects.none()

        # Additional filter by unit_id if provided (for cascading dropdowns)
        unit_id = request.query_params.get('unit_id')
        if unit_id:
            departments = departments.filter(unit_id=unit_id)

        departments = departments.order_by('department_name')
        serializer = DepartmentSerializer(departments, many=True)
        return Response({
            'count': departments.count(),
            'results': serializer.data
        })

    elif request.method == 'POST':
        # Only System Admin can create departments
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can create departments'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            dept = serializer.save()

            # Audit logging
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Created',
                message=f'Department created: {dept.department_name} under {dept.unit.unit_name if dept.unit else "No Unit"}',
                request=request
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, CanManageMasterData])
def department_detail(request, pk):
    """
    GET /api/auth/departments/{id}/
    PUT /api/auth/departments/{id}/
    DELETE /api/auth/departments/{id}/
    """
    try:
        department = Department.objects.select_related('unit', 'department_head').get(pk=pk)
    except Department.DoesNotExist:
        return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = DepartmentSerializer(department)
        return Response(serializer.data)

    elif request.method == 'PUT':
        old_name = department.department_name
        serializer = DepartmentSerializer(department, data=request.data, partial=True)
        if serializer.is_valid():
            dept = serializer.save()

            # Audit logging
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Updated',
                message=f'Department updated: {old_name} → {dept.department_name}',
                request=request
            )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='Deleted',
            message=f'Department deleted: {department.department_name}',
            request=request
        )

        department.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def section_list(request):
    """
    GET /api/auth/sections/ - All authenticated users (filtered by user's unit)
    POST /api/auth/sections/ - System Admin only
    """
    if request.method == 'GET':
        sections = Section.objects.select_related('department__unit').all()

        # Filter by user's units (except System Admins who see all)
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            # Check for units via many-to-many (new system)
            user_units = request.user.units.all()
            if user_units.exists():
                sections = sections.filter(department__unit__in=user_units)
            elif request.user.unit:
                # Fallback to legacy single unit field
                sections = sections.filter(department__unit=request.user.unit)
            else:
                # User has no unit assigned, return empty
                sections = Section.objects.none()

        # Additional filters for cascading dropdowns
        unit_id = request.query_params.get('unit_id')
        if unit_id:
            sections = sections.filter(department__unit_id=unit_id)

        department_id = request.query_params.get('department_id')
        if department_id:
            sections = sections.filter(department_id=department_id)

        sections = sections.order_by('section_name')
        serializer = SectionSerializer(sections, many=True)
        return Response({
            'count': sections.count(),
            'results': serializer.data
        })

    elif request.method == 'POST':
        # Only System Admin can create sections
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can create sections'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SectionSerializer(data=request.data)
        if serializer.is_valid():
            section = serializer.save()

            # Audit logging
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Created',
                message=f'Section created: {section.section_name} under {section.department.department_name if section.department else "No Department"}',
                request=request
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, CanManageMasterData])
def section_detail(request, pk):
    """
    GET /api/auth/sections/{id}/
    PUT /api/auth/sections/{id}/
    DELETE /api/auth/sections/{id}/
    """
    try:
        section = Section.objects.select_related('department__unit').get(pk=pk)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = SectionSerializer(section)
        return Response(serializer.data)

    elif request.method == 'PUT':
        old_name = section.section_name
        serializer = SectionSerializer(section, data=request.data, partial=True)
        if serializer.is_valid():
            section = serializer.save()

            # Audit logging
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Updated',
                message=f'Section updated: {old_name} → {section.section_name}',
                request=request
            )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='Deleted',
            message=f'Section deleted: {section.section_name}',
            request=request
        )

        section.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def role_list(request):
    """
    GET /api/auth/roles/ - List all roles (Groups)
    POST /api/auth/roles/ - Create new role (System Admin only)

    This endpoint manages Django Groups which serve as roles in the system.
    The 4 core roles (System Admin, Section Head, Store Head, User) cannot be deleted.
    """
    if request.method == 'GET':
        # Return all roles with privileges
        roles = Role.objects.filter(is_active=True).prefetch_related('privileges', 'users').order_by('role_name')

        data = []
        for role in roles:
            privilege_data = [
                {'id': p.id, 'codename': p.codename, 'name': p.name, 'category': p.category}
                for p in role.privileges.filter(is_active=True)
            ]
            privilege_ids = [p.id for p in role.privileges.filter(is_active=True)]

            # Get corresponding Django Group for backward compatibility
            try:
                group = Group.objects.get(name=role.role_name)
                group_id = group.id
                permission_count = group.permissions.count()
            except Group.DoesNotExist:
                group_id = None
                permission_count = 0

            data.append({
                "id": group_id or role.id,  # Use Group ID if exists, otherwise Role ID
                "role_id": role.id,  # Always include the Role ID
                "role_name": role.role_name,
                "description": role.description,
                "user_count": role.users.count(),
                "permission_count": permission_count,
                "privilege_count": len(privilege_data),
                "privileges": privilege_data,
                "privilege_ids": privilege_ids,
                "is_core_role": role.is_core_role,
                "is_active": role.is_active
            })

        return Response({
            "count": len(data),
            "results": data,
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        # Only System Admin can create new roles
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can create roles'}, status=status.HTTP_403_FORBIDDEN)

        role_name = request.data.get('role_name')
        description = request.data.get('description', '')
        permission_ids = request.data.get('permission_ids', [])
        privilege_ids = request.data.get('privilege_ids', [])

        if not role_name:
            return Response({'error': 'role_name is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if role already exists
        if Group.objects.filter(name=role_name).exists():
            return Response({'error': f'Role "{role_name}" already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # Create Django Group
        group = Group.objects.create(name=role_name)

        # Assign permissions if provided
        if permission_ids:
            permissions = Permission.objects.filter(id__in=permission_ids)
            group.permissions.set(permissions)

        # Create corresponding Role entry for backward compatibility
        role = Role.objects.create(
            role_name=role_name,
            description=description
        )

        # Assign privileges if provided
        if privilege_ids:
            privileges = Privilege.objects.filter(id__in=privilege_ids, is_active=True)
            for privilege in privileges:
                RolePrivilege.objects.create(role=role, privilege=privilege)

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='Created',
            message=f'New role created: {role_name} with {group.permissions.count()} permissions and {len(privilege_ids)} privileges',
            request=request
        )

        # Get privilege data for response
        privilege_data = [
            {'id': p.id, 'codename': p.codename, 'name': p.name, 'category': p.category}
            for p in role.privileges.filter(is_active=True)
        ]

        return Response({
            "id": group.id,
            "role_id": role.id,
            "role_name": group.name,
            "description": description,
            "user_count": 0,
            "permission_count": group.permissions.count(),
            "privilege_count": len(privilege_data),
            "privileges": privilege_data,
            "privilege_ids": privilege_ids,
            "is_core_role": False,
            "message": "Role created successfully"
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def role_detail(request, pk):
    """
    GET /api/auth/roles/{id}/ - Get role details
    PUT /api/auth/roles/{id}/ - Update role (System Admin only)
    DELETE /api/auth/roles/{id}/ - Delete role (System Admin only, not core 4 roles)

    Core 4 roles that cannot be deleted or renamed:
    - System Admin
    - Section Head
    - Store Head
    - User
    """
    CORE_ROLES = ['System Admin', 'Section Head', 'Store Head', 'User']

    try:
        group = Group.objects.prefetch_related('permissions').get(pk=pk)
    except Group.DoesNotExist:
        return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        # Get corresponding Role entry
        role_obj = None
        try:
            role_obj = Role.objects.prefetch_related('privileges').get(role_name=group.name)
        except Role.DoesNotExist:
            pass

        group_data = GroupSerializer(group).data
        group_data['user_count'] = group.user_set.count()
        group_data['users'] = list(group.user_set.values('id', 'username', 'full_name', 'email'))
        group_data['is_core_role'] = group.name in CORE_ROLES
        group_data['description'] = role_obj.description if role_obj else ""
        group_data['permission_ids'] = list(group.permissions.values_list('id', flat=True))
        group_data['role_id'] = role_obj.id if role_obj else None

        # Add privilege information
        if role_obj:
            group_data['privileges'] = [
                {'id': p.id, 'codename': p.codename, 'name': p.name, 'category': p.category}
                for p in role_obj.privileges.filter(is_active=True)
            ]
            group_data['privilege_ids'] = list(role_obj.privileges.filter(is_active=True).values_list('id', flat=True))
            group_data['privilege_count'] = role_obj.privileges.filter(is_active=True).count()
        else:
            group_data['privileges'] = []
            group_data['privilege_ids'] = []
            group_data['privilege_count'] = 0

        return Response(group_data)

    elif request.method == 'PUT':
        # Only System Admin can update roles
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can update roles'}, status=status.HTTP_403_FORBIDDEN)

        # Prevent renaming of core roles
        role_name = request.data.get('role_name')
        if role_name and role_name != group.name:
            if group.name in CORE_ROLES:
                return Response(
                    {'error': f'Cannot rename core role: {group.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Check if new name already exists
            if Group.objects.filter(name=role_name).exists():
                return Response(
                    {'error': f'Role "{role_name}" already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Update group name if provided
        old_name = group.name
        if role_name:
            group.name = role_name
            group.save()

            # Update corresponding Role entry
            try:
                role_obj = Role.objects.get(role_name=old_name)
                role_obj.role_name = role_name
                role_obj.save()
            except Role.DoesNotExist:
                # Create if doesn't exist
                Role.objects.create(role_name=role_name, description=request.data.get('description', ''))

        # Update description in Role model
        description = request.data.get('description')
        if description is not None:
            role_obj, _ = Role.objects.get_or_create(
                role_name=group.name,
                defaults={'description': description}
            )
            if not _:  # If not created, update existing
                role_obj.description = description
                role_obj.save()

        # Update permissions if provided
        permission_ids = request.data.get('permission_ids')
        if permission_ids is not None:
            permissions = Permission.objects.filter(id__in=permission_ids)
            group.permissions.set(permissions)

        # Update privileges if provided
        privilege_ids = request.data.get('privilege_ids')
        role_obj = Role.objects.filter(role_name=group.name).first()
        if privilege_ids is not None and role_obj:
            # Clear existing privileges and set new ones
            RolePrivilege.objects.filter(role=role_obj).delete()
            privileges = Privilege.objects.filter(id__in=privilege_ids, is_active=True)
            for privilege in privileges:
                RolePrivilege.objects.create(role=role_obj, privilege=privilege)

        # Audit logging
        from apps.audit.utils import log_audit_event
        privilege_count = role_obj.privileges.count() if role_obj else 0
        log_audit_event(
            user=request.user,
            action='Updated',
            message=f'Role updated: {old_name} → {group.name}, Permissions: {group.permissions.count()}, Privileges: {privilege_count}',
            request=request
        )

        # Return updated data
        role_obj = Role.objects.prefetch_related('privileges').filter(role_name=group.name).first()
        privilege_data = []
        returned_privilege_ids = []
        if role_obj:
            privilege_data = [
                {'id': p.id, 'codename': p.codename, 'name': p.name, 'category': p.category}
                for p in role_obj.privileges.filter(is_active=True)
            ]
            returned_privilege_ids = list(role_obj.privileges.filter(is_active=True).values_list('id', flat=True))

        return Response({
            'id': group.id,
            'role_id': role_obj.id if role_obj else None,
            'role_name': group.name,
            'description': role_obj.description if role_obj else "",
            'user_count': group.user_set.count(),
            'permission_count': group.permissions.count(),
            'privilege_count': len(privilege_data),
            'privileges': privilege_data,
            'privilege_ids': returned_privilege_ids,
            'is_core_role': group.name in CORE_ROLES,
            'message': 'Role updated successfully'
        })

    elif request.method == 'DELETE':
        # Only System Admin can delete roles
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can delete roles'}, status=status.HTTP_403_FORBIDDEN)

        # Prevent deletion of core 4 roles
        if group.name in CORE_ROLES:
            return Response(
                {'error': f'Cannot delete core role: {group.name}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if role has users
        user_count = group.user_set.count()
        if user_count > 0:
            return Response(
                {'error': f'Cannot delete role with {user_count} active users. Reassign users first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        role_name = group.name
        perm_count = group.permissions.count()

        log_audit_event(
            user=request.user,
            action='Deleted',
            message=f'Role deleted: {role_name} ({perm_count} permissions)',
            request=request
        )

        # Delete corresponding Role entry
        Role.objects.filter(role_name=role_name).delete()

        # Delete group
        group.delete()

        return Response({'message': f'Role "{role_name}" deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# Groups/Roles Management (Django Groups for RBAC)

from .serializers import GroupSerializer, PermissionSerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def group_list(request):
    """
    GET /api/auth/groups/ - List all groups
    POST /api/auth/groups/ - Create new group (System Admin only)

    Manage Django Groups (used for RBAC)
    """
    if request.method == 'GET':
        # Return all groups
        groups = Group.objects.all().prefetch_related('permissions').order_by('name')

        # Get user count for each group
        result = []
        for group in groups:
            group_data = GroupSerializer(group).data
            group_data['user_count'] = group.user_set.count()
            result.append(group_data)

        return Response({
            'count': groups.count(),
            'results': result
        })

    elif request.method == 'POST':
        # Only System Admin can create groups
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can create groups'}, status=status.HTTP_403_FORBIDDEN)

        # Create new group
        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            group = serializer.save()

            # Log group creation
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Created',
                message=f'Group "{group.name}" created by {request.user.username}',
                request=request
            )

            group_data = GroupSerializer(group).data
            group_data['user_count'] = 0
            return Response(group_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def group_detail(request, pk):
    """
    GET /api/auth/groups/{id}/ - Get group details
    PUT /api/auth/groups/{id}/ - Update group (System Admin only)
    DELETE /api/auth/groups/{id}/ - Delete group (System Admin only, not core 4 roles)

    Core 4 roles that cannot be deleted or renamed:
    - System Admin
    - Section Head
    - Store Head
    - User
    """
    # Define the 4 core Cipla roles (new system)
    CORE_ROLES = [
        'System Admin',
        'Section Head',
        'Store Head',
        'User'
    ]

    try:
        # Allow access to all groups (not just core roles)
        group = Group.objects.prefetch_related('permissions').get(pk=pk)
    except Group.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        group_data = GroupSerializer(group).data
        group_data['user_count'] = group.user_set.count()
        group_data['users'] = list(group.user_set.values('id', 'username', 'full_name'))
        group_data['is_core_role'] = group.name in CORE_ROLES
        return Response(group_data)

    elif request.method == 'PUT':
        # Only System Admin can update groups
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can update groups'}, status=status.HTTP_403_FORBIDDEN)

        # Prevent renaming of core roles
        if 'name' in request.data and request.data['name'] != group.name:
            if group.name in CORE_ROLES:
                return Response(
                    {'error': f'Cannot rename core role: {group.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        old_perm_count = group.permissions.count()
        serializer = GroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            group = serializer.save()

            # Update permissions if provided
            permission_ids = request.data.get('permission_ids')
            if permission_ids is not None:
                permissions = Permission.objects.filter(id__in=permission_ids)
                group.permissions.set(permissions)

            # Audit logging
            from apps.audit.utils import log_audit_event
            new_perm_count = group.permissions.count()
            log_audit_event(
                user=request.user,
                action='Updated',
                message=f'Group updated: {group.name}, Permissions: {old_perm_count} → {new_perm_count}',
                request=request
            )

            group_data = GroupSerializer(group).data
            group_data['user_count'] = group.user_set.count()
            group_data['is_core_role'] = group.name in CORE_ROLES
            return Response(group_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Only System Admin can delete groups
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can delete groups'}, status=status.HTTP_403_FORBIDDEN)

        # Prevent deletion of core 4 roles
        if group.name in CORE_ROLES:
            return Response(
                {'error': f'Cannot delete core role: {group.name}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if group has users
        user_count = group.user_set.count()
        if user_count > 0:
            return Response(
                {'error': f'Cannot delete group with {user_count} active users. Reassign users first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        group_name = group.name
        perm_count = group.permissions.count()

        log_audit_event(
            user=request.user,
            action='Deleted',
            message=f'Group deleted: {group_name} ({perm_count} permissions)',
            request=request
        )

        group.delete()
        return Response({'message': f'Group "{group_name}" deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def permission_list(request):
    """
    GET /api/auth/permissions/

    List all available permissions in the system
    """
    permissions = Permission.objects.select_related('content_type').all().order_by('content_type__app_label', 'codename')

    # Filter by app if specified
    app_label = request.query_params.get('app')
    if app_label:
        permissions = permissions.filter(content_type__app_label=app_label)

    serializer = PermissionSerializer(permissions, many=True)

    # Group permissions by app
    grouped_permissions = {}
    for perm in serializer.data:
        app = perm['content_type']
        if app not in grouped_permissions:
            grouped_permissions[app] = []
        grouped_permissions[app].append(perm)

    return Response({
        'count': permissions.count(),
        'results': serializer.data,
        'grouped': grouped_permissions
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanManageUsers])
def assign_user_to_group(request):
    """
    POST /api/auth/groups/assign-user/

    Assign a user to one or more groups

    Body:
    {
        "user_id": 1,
        "group_ids": [1, 2, 3]
    }
    """
    user_id = request.data.get('user_id')
    group_ids = request.data.get('group_ids', [])

    if not user_id:
        return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Clear existing groups
    user.groups.clear()

    # Add new groups
    if group_ids:
        groups = Group.objects.filter(id__in=group_ids)
        user.groups.add(*groups)

    # Audit logging
    from apps.audit.utils import log_audit_event
    group_names = ', '.join([g.name for g in user.groups.all()])
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'User groups updated: {user.username} assigned to groups: {group_names or "None"}',
        request=request
    )

    return Response({
        'message': 'User groups updated successfully',
        'user': UserSerializer(user).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanManageUsers])
def remove_user_from_group(request):
    """
    POST /api/auth/groups/remove-user/

    Remove a user from a group

    Body:
    {
        "user_id": 1,
        "group_id": 1
    }
    """
    user_id = request.data.get('user_id')
    group_id = request.data.get('group_id')

    if not user_id or not group_id:
        return Response({'error': 'user_id and group_id are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
        group = Group.objects.get(pk=group_id)
    except (User.DoesNotExist, Group.DoesNotExist):
        return Response({'error': 'User or Group not found'}, status=status.HTTP_404_NOT_FOUND)

    user.groups.remove(group)

    # Audit logging
    from apps.audit.utils import log_audit_event
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'User removed from group: {user.username} removed from {group.name}',
        request=request
    )

    return Response({
        'message': 'User removed from group successfully',
        'user': UserSerializer(user).data
    })


# Security Policies

from django.conf import settings

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def security_policies(request):
    """
    GET /api/auth/security-policies/
    PUT /api/auth/security-policies/

    Get or update system security policies
    Note: GET is available to all authenticated users, PUT requires CanManageUsers
    """
    from apps.auth.models import SessionPolicy, PasswordPolicy

    if request.method == 'GET':
        # Get current session timeout from database
        session_policy = SessionPolicy.objects.first()
        current_timeout = session_policy.session_timeout_minutes if session_policy else 30

        # Get current password expiry from database
        password_policy = PasswordPolicy.objects.first()
        current_expiry_days = password_policy.password_expiry_days if password_policy else 90

        # Get available timeout options
        timeout_options = [
            {'value': value, 'label': label}
            for value, label in SessionPolicy.TIMEOUT_CHOICES
        ]

        # Return current security policies
        policies = {
            'password_policy': {
                'min_length': getattr(settings, 'PASSWORD_MIN_LENGTH', 8),
                'require_uppercase': getattr(settings, 'PASSWORD_REQUIRE_UPPERCASE', True),
                'require_lowercase': getattr(settings, 'PASSWORD_REQUIRE_LOWERCASE', True),
                'require_numbers': getattr(settings, 'PASSWORD_REQUIRE_NUMBERS', True),
                'require_special': getattr(settings, 'PASSWORD_REQUIRE_SPECIAL', True),
                'password_expiry_days': current_expiry_days,
                'can_update_expiry': True,  # Indicates this can be updated dynamically
            },
            'session_policy': {
                'session_timeout_minutes': current_timeout,
                'max_concurrent_sessions': getattr(settings, 'MAX_CONCURRENT_SESSIONS', 1),
                'timeout_options': timeout_options,
                'can_update': True,  # Indicates this can be updated dynamically
            },
            'account_policy': {
                'max_login_attempts': getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5),
                'lockout_duration_minutes': getattr(settings, 'LOCKOUT_DURATION_MINUTES', 30),
                'require_email_verification': getattr(settings, 'REQUIRE_EMAIL_VERIFICATION', False),
            },
            'audit_policy': {
                'log_all_access': getattr(settings, 'LOG_ALL_ACCESS', True),
                'log_retention_days': getattr(settings, 'LOG_RETENTION_DAYS', 365),
            },
            'two_factor': {
                'enabled': getattr(settings, 'TWO_FACTOR_ENABLED', False),
                'required_for_admin': getattr(settings, 'TWO_FACTOR_REQUIRED_FOR_ADMIN', False),
            }
        }

        return Response(policies)

    elif request.method == 'PUT':
        # Check if user has permission to manage users
        permission_check = CanManageUsers()
        if not permission_check.has_permission(request, None):
            return Response(
                {'error': 'You do not have permission to update security policies. Only System Admins can update these settings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Audit logging for security policy change attempt
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='Updated',
            message=f'Security policy update attempted by {request.user.username}',
            request=request
        )

        # Note: Updating security policies would typically require writing to settings
        # or a separate SecurityPolicy model. For now, we'll return a message.
        return Response({
            'message': 'Security policy updates require server restart. Please contact system administrator.',
            'note': 'In production, policies would be stored in database and applied dynamically.'
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_password_expiry(request):
    """
    POST /api/auth/password-expiry/

    Update the system-wide password expiry setting
    Requires CanManageUsers permission

    Body:
    {
        "password_expiry_days": 60
    }
    """
    from apps.auth.models import PasswordPolicy
    from apps.audit.utils import log_audit_event

    # Check if user has permission to manage users
    permission_check = CanManageUsers()
    if not permission_check.has_permission(request, None):
        return Response(
            {'error': 'You do not have permission to update password expiry. Only System Admins can update this setting.'},
            status=status.HTTP_403_FORBIDDEN
        )

    expiry_days = request.data.get('password_expiry_days')

    if not expiry_days:
        return Response({
            'error': 'password_expiry_days is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate expiry is between 1 and 90
    if expiry_days < 1 or expiry_days > 90:
        return Response({
            'error': 'Invalid expiry value. Must be between 1 and 90 days.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Get or create password policy
    password_policy = PasswordPolicy.objects.first()
    old_expiry = None

    if password_policy:
        old_expiry = password_policy.password_expiry_days
        password_policy.password_expiry_days = expiry_days
        password_policy.updated_by = request.user
        password_policy.save()
    else:
        password_policy = PasswordPolicy.objects.create(
            password_expiry_days=expiry_days,
            updated_by=request.user
        )
        old_expiry = 90  # Default

    # Log the change in audit trail
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'Password expiry changed from {old_expiry} days to {expiry_days} days by {request.user.username}',
        request=request
    )

    return Response({
        'message': 'Password expiry updated successfully',
        'old_expiry': old_expiry,
        'new_expiry': expiry_days,
        'note': 'New expiry will apply to all password changes from now on.'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_session_timeout(request):
    """
    POST /api/auth/session-timeout/

    Update the system-wide session timeout setting
    Requires CanManageUsers permission

    Body:
    {
        "session_timeout_minutes": 60
    }
    """
    from apps.auth.models import SessionPolicy
    from apps.audit.utils import log_audit_event

    # Check if user has permission to manage users
    permission_check = CanManageUsers()
    if not permission_check.has_permission(request, None):
        return Response(
            {'error': 'You do not have permission to update session timeout. Only System Admins can update this setting.'},
            status=status.HTTP_403_FORBIDDEN
        )

    timeout_minutes = request.data.get('session_timeout_minutes')

    if not timeout_minutes:
        return Response({
            'error': 'session_timeout_minutes is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate timeout is one of the allowed choices
    valid_choices = [choice[0] for choice in SessionPolicy.TIMEOUT_CHOICES]
    if timeout_minutes not in valid_choices:
        return Response({
            'error': f'Invalid timeout value. Must be one of: {valid_choices}'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Get or create session policy
    session_policy = SessionPolicy.objects.first()
    old_timeout = None

    if session_policy:
        old_timeout = session_policy.session_timeout_minutes
        session_policy.session_timeout_minutes = timeout_minutes
        session_policy.updated_by = request.user
        session_policy.save()
    else:
        session_policy = SessionPolicy.objects.create(
            session_timeout_minutes=timeout_minutes,
            updated_by=request.user
        )
        old_timeout = 30  # Default

    # Log the change in audit trail
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'Session timeout changed from {old_timeout} minutes to {timeout_minutes} minutes by {request.user.username}',
        request=request
    )

    return Response({
        'message': 'Session timeout updated successfully',
        'old_timeout': old_timeout,
        'new_timeout': timeout_minutes,
        'note': 'New timeout will apply to all new sessions. Existing sessions will retain their original timeout.'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanManageUsers])
def reset_user_password(request):
    """
    POST /api/auth/users/reset-password/

    Admin endpoint to reset a user's password

    Body:
    {
        "user_id": 1,
        "new_password": "new_temp_password",
        "reason": "User forgot password"
    }
    """
    user_id = request.data.get('user_id')
    new_password = request.data.get('new_password')
    reason = request.data.get('reason', '')

    if not user_id or not new_password:
        return Response({'error': 'user_id and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Set new password and flag for password change
    user.set_password(new_password)
    user.must_change_password = True
    user.save()

    # Send forced logout to all active sessions for this user via WebSocket
    from apps.auth.websocket_utils import send_force_logout
    logout_sent = send_force_logout(
        user_id=user.id,
        reason="Your password has been reset by an administrator. Please log in with your new password."
    )

    # Log password reset in audit trail
    from apps.audit.utils import log_audit_event
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'Password reset for user {user.username}. Reason: {reason}. User must change password on next login. Forced logout sent: {logout_sent}',
        request=request
    )

    # Send email notification to user with new password
    try:
        from apps.notifications.tasks import send_password_reset_notification
        send_password_reset_notification.delay(user.id, new_password)
    except Exception as e:
        print(f"Failed to queue password reset email: {str(e)}")

    return Response({
        'message': f'Password reset successfully for user {user.username}. Active sessions have been terminated and user must change password on next login.',
        'user': UserSerializer(user).data,
        'must_change_password': True,
        'sessions_terminated': logout_sent
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unlock_user(request):
    """
    POST /api/auth/users/unlock/

    Admin endpoint to unlock a locked user account
    Also resets password expiry if the account was locked due to expired password

    Body:
    {
        "user_id": 1,
        "reason": "Manual unlock by administrator"
    }
    """
    user_id = request.data.get('user_id')
    reason = request.data.get('reason', '')

    if not user_id:
        return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if account was locked due to password expiry
    was_password_expired = user.password_expired

    # Unlock the user and reset password expiry
    user.unlock()
    if was_password_expired:
        from django.utils import timezone
        user.password_expired = False
        user.password_changed_at = timezone.now()  # Reset password change time
        user.save(update_fields=['password_expired', 'password_changed_at'])

    # Log unlock in audit trail
    from apps.audit.utils import log_audit_event
    expiry_note = ' (password expiry reset)' if was_password_expired else ''
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'Account unlocked for user {user.username}{expiry_note}. Reason: {reason}',
        request=request
    )

    return Response({
        'message': f'User {user.username} unlocked successfully' + ('. Password expiry has been reset.' if was_password_expired else ''),
        'user': UserSerializer(user).data
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def request_account_unlock(request):
    """
    POST /api/auth/request-unlock/

    Public endpoint for users to request account unlock
    Creates an audit log entry for admins to review

    Body:
    {
        "username": "john.doe",
        "email": "john.doe@company.com",
        "reason": "My password has expired"
    }
    """
    username = request.data.get('username')
    email = request.data.get('email')
    reason = request.data.get('reason', 'Account unlock request')

    if not username or not email:
        return Response({'error': 'username and email are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username, email__iexact=email)

        # Check if user is actually locked
        if user.status != 'Locked':
            return Response({'error': 'Your account is not locked.'}, status=status.HTTP_400_BAD_REQUEST)

        # Log the unlock request in audit trail
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=user,
            action='Request',
            message=f'Account unlock requested by {user.username} ({user.email}). Reason: {reason}',
            request=request
        )

        # TODO: Send notification to administrators
        # from apps.notifications.tasks import send_unlock_request_notification
        # send_unlock_request_notification.delay(user.id)

        return Response({
            'message': 'Your unlock request has been submitted. An administrator will review it shortly.'
        })
    except User.DoesNotExist:
        return Response({
            'error': 'User not found with the provided username and email.'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/auth/change-password/

    User endpoint to change their own password

    Body:
    {
        "old_password": "current_password",
        "new_password": "new_password",
        "refresh_token": "optional_refresh_token_to_blacklist"
    }
    """
    from django.contrib.auth import authenticate

    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    refresh_token = request.data.get('refresh_token')

    if not old_password or not new_password:
        return Response(
            {'error': 'Both old_password and new_password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify old password
    user = authenticate(username=request.user.username, password=old_password)
    if user is None:
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate new password strength
    if len(new_password) < 8:
        return Response(
            {'error': 'New password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set new password
    request.user.set_password(new_password)
    request.user.must_change_password = False
    request.user.save()

    # Blacklist the current refresh token to invalidate the session
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as e:
            # Log the error but don't fail the password change
            pass

    # Log password change in audit trail
    from apps.audit.utils import log_audit_event
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'Password changed by user {request.user.username}. Session invalidated.',
        request=request
    )

    return Response({
        'message': 'Password changed successfully. Please log in again with your new password.',
        'user': UserSerializer(request.user).data,
        'session_invalidated': True
    })


# Privilege Management Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def privilege_list(request):
    """
    GET /api/auth/privileges/ - List all privileges

    Query parameters:
    - category: Filter by category (requests, storage, users, master_data, reports, system)
    - grouped: If 'true', return privileges grouped by category

    Returns all active privileges in the system.
    """
    privileges = Privilege.objects.filter(is_active=True).order_by('category', 'name')

    # Filter by category if provided
    category = request.query_params.get('category')
    if category:
        privileges = privileges.filter(category=category)

    # Group by category if requested
    grouped = request.query_params.get('grouped', 'false').lower() == 'true'

    if grouped:
        # Return privileges grouped by category
        grouped_data = {}
        for privilege in privileges:
            if privilege.category not in grouped_data:
                grouped_data[privilege.category] = {
                    'category': privilege.category,
                    'category_display': dict(Privilege.CATEGORY_CHOICES).get(privilege.category, privilege.category),
                    'privileges': []
                }
            grouped_data[privilege.category]['privileges'].append({
                'id': privilege.id,
                'codename': privilege.codename,
                'name': privilege.name,
                'description': privilege.description,
            })

        return Response({
            'count': privileges.count(),
            'grouped': list(grouped_data.values()),
            'categories': [
                {'value': choice[0], 'label': choice[1]}
                for choice in Privilege.CATEGORY_CHOICES
            ]
        })

    # Return flat list
    serializer = PrivilegeSerializer(privileges, many=True)
    return Response({
        'count': privileges.count(),
        'results': serializer.data,
        'categories': [
            {'value': choice[0], 'label': choice[1]}
            for choice in Privilege.CATEGORY_CHOICES
        ]
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def privilege_detail(request, pk):
    """
    GET /api/auth/privileges/{id}/ - Get privilege details
    PUT /api/auth/privileges/{id}/ - Update privilege (System Admin only)

    Privileges are system-defined and cannot be created or deleted through the API.
    Only the name and description can be updated.
    """
    try:
        privilege = Privilege.objects.get(pk=pk)
    except Privilege.DoesNotExist:
        return Response({'error': 'Privilege not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = PrivilegeSerializer(privilege)
        data = serializer.data
        # Add roles that have this privilege
        data['roles'] = [
            {'id': rp.role.id, 'role_name': rp.role.role_name}
            for rp in privilege.privilege_roles.select_related('role').all()
        ]
        return Response(data)

    elif request.method == 'PUT':
        # Only System Admin can update privileges
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can update privileges'}, status=status.HTTP_403_FORBIDDEN)

        # Only allow updating name and description
        if 'name' in request.data:
            privilege.name = request.data['name']
        if 'description' in request.data:
            privilege.description = request.data['description']

        privilege.save()

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='Updated',
            message=f'Privilege updated: {privilege.codename}',
            request=request
        )

        serializer = PrivilegeSerializer(privilege)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_privileges(request):
    """
    GET /api/auth/user/privileges/ - Get current user's privileges

    Returns all privilege codenames for the authenticated user based on their role.
    """
    user = request.user
    privileges = []

    if hasattr(user, 'role') and user.role:
        privileges = user.role.get_privilege_codenames()

    return Response({
        'user_id': user.id,
        'username': user.username,
        'role': user.role.role_name if hasattr(user, 'role') and user.role else None,
        'privileges': privileges
    })
