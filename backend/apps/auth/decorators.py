"""
Password verification decorator for request authentication
Requires password re-entry for critical operations
"""

from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.utils import timezone


def require_digital_signature(view_func):
    """
    Decorator that requires password re-entry before critical operations

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAuthenticated, CanApproveRequests])
        @require_digital_signature
        def approve_request(request, pk):
            # Password has been verified
            # Proceed with operation
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        # Get password from request data
        digital_signature = request.data.get('digital_signature')

        # Validate password presence
        if not digital_signature:
            return Response({
                'error': 'Password required',
                'detail': 'Please enter your password to confirm this action'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify user account is active
        if request.user.status != 'Active':
            return Response({
                'error': 'Account not active',
                'detail': 'Your account is not active. Please contact administrator.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Verify password
        user = authenticate(username=request.user.username, password=digital_signature)

        if user is None or user.id != request.user.id:
            return Response({
                'error': 'Authentication failed',
                'detail': 'Invalid password. Please try again.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Password verified - proceed with the view function
        return view_func(request, *args, **kwargs)

    return wrapper


def require_permission(permission_codename):
    """
    Decorator to require specific Django permission.

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAuthenticated])
        @require_permission('requests.add_request')
        def create_request(request):
            # Your view logic here
            pass

    Args:
        permission_codename: String in format 'app_label.permission_codename'
                           e.g., 'requests.add_request', 'documents.delete_document'
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.has_perm(permission_codename):
                return Response({
                    'error': 'Permission denied',
                    'message': f'You do not have permission: {permission_codename}'
                }, status=status.HTTP_403_FORBIDDEN)

            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


def require_group(group_name):
    """
    Decorator to require user to be in a specific group.

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAuthenticated])
        @require_group('Section Head')
        def create_request(request):
            # Your view logic here
            pass

    Args:
        group_name: String name of the Django group
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.groups.filter(name=group_name).exists() and not request.user.is_superuser:
                return Response({
                    'error': 'Permission denied',
                    'message': f'You must be in the "{group_name}" group to perform this action'
                }, status=status.HTTP_403_FORBIDDEN)

            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


def require_any_group(*group_names):
    """
    Decorator to require user to be in ANY of the specified groups.

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAuthenticated])
        @require_any_group('Section Head', 'Head QC', 'Admin')
        def create_request(request):
            # Your view logic here
            pass

    Args:
        *group_names: Variable number of group name strings
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.groups.filter(name__in=group_names).exists() and not request.user.is_superuser:
                return Response({
                    'error': 'Permission denied',
                    'message': f'You must be in one of these groups: {", ".join(group_names)}'
                }, status=status.HTTP_403_FORBIDDEN)

            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator
