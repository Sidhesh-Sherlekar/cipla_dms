"""
Digital Signature Decorator for 21 CFR Part 11 Compliance

This decorator requires users to re-enter their password to confirm critical actions,
implementing the digital signature requirement per 21 CFR Part 11.

All CREATE, UPDATE, APPROVE, REJECT, ISSUE, and DESTROY actions must use this decorator.
"""

from functools import wraps
from django.contrib.auth import authenticate
from rest_framework.response import Response
from rest_framework import status


def require_digital_signature(view_func):
    """
    Decorator to require password re-entry for critical actions.
    
    This implements the digital signature requirement per 21 CFR Part 11.
    The user must provide their password in the request data under 'digital_signature'.
    
    Usage:
        @require_digital_signature
        def my_view(request):
            # Your view logic here
            pass
    
    Request body must include:
        {
            "digital_signature": "user_password",
            ...other fields...
        }
    
    Returns:
        403 FORBIDDEN if digital_signature is not provided
        401 UNAUTHORIZED if password verification fails
        Original view response if verification succeeds
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        # Check if digital_signature (password) is provided
        signature_password = None
        
        # Handle both DRF Request and Django Request
        if hasattr(request, 'data'):
            signature_password = request.data.get('digital_signature')
        else:
            signature_password = request.POST.get('digital_signature')
        
        if not signature_password:
            return Response({
                'error': 'Digital signature required',
                'message': 'Please re-enter your password to confirm this action (21 CFR Part 11 compliance)',
                'field': 'digital_signature'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Verify password matches current user
        user = authenticate(
            username=request.user.username,
            password=signature_password
        )
        
        if user is None or user.id != request.user.id:
            return Response({
                'error': 'Invalid digital signature',
                'message': 'Password verification failed. Please check your password and try again.',
                'field': 'digital_signature'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Password verified - proceed with action
        return view_func(request, *args, **kwargs)
    
    return wrapper


def get_client_ip(request):
    """
    Extract client IP address from request.
    Handles proxy headers (X-Forwarded-For).
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    """
    Extract user agent string from request.
    """
    return request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit to 500 chars
