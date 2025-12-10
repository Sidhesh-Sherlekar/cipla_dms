"""
Simple Password Verification for Request Authentication

Provides password verification before critical operations.
"""

from django.contrib.auth import authenticate


def verify_password(username, password, request_user):
    """
    Verify user password before proceeding with an operation

    Args:
        username: Username provided
        password: Password provided
        request_user: Currently authenticated user from request

    Returns:
        tuple: (is_valid, user_object_or_error_message)
    """
    # Verify username matches authenticated user
    if username != request_user.username:
        return False, "Username does not match authenticated user"

    # Verify user account is active
    if request_user.status != 'Active':
        return False, "User account is not active"

    # Verify password
    user = authenticate(username=username, password=password)

    if user is None:
        return False, "Invalid password"

    if user.id != request_user.id:
        return False, "Authentication failed"

    return True, user
