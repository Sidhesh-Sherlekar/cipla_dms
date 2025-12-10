"""
Password validation utilities for enforcing password policies
"""
import re
from django.conf import settings
from django.core.exceptions import ValidationError


def validate_password_policy(password):
    """
    Validate password against system security policies

    Args:
        password: The password string to validate

    Returns:
        tuple: (is_valid: bool, errors: list of error messages)
    """
    errors = []

    # Get password policy settings from Django settings
    min_length = getattr(settings, 'PASSWORD_MIN_LENGTH', 8)
    require_uppercase = getattr(settings, 'PASSWORD_REQUIRE_UPPERCASE', True)
    require_lowercase = getattr(settings, 'PASSWORD_REQUIRE_LOWERCASE', True)
    require_numbers = getattr(settings, 'PASSWORD_REQUIRE_NUMBERS', True)
    require_special = getattr(settings, 'PASSWORD_REQUIRE_SPECIAL', True)

    # Check minimum length
    if len(password) < min_length:
        errors.append(f'Password must be at least {min_length} characters long')

    # Check for uppercase letters
    if require_uppercase and not re.search(r'[A-Z]', password):
        errors.append('Password must contain at least one uppercase letter')

    # Check for lowercase letters
    if require_lowercase and not re.search(r'[a-z]', password):
        errors.append('Password must contain at least one lowercase letter')

    # Check for numbers
    if require_numbers and not re.search(r'\d', password):
        errors.append('Password must contain at least one number')

    # Check for special characters
    if require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')

    return len(errors) == 0, errors


def get_password_policy_description():
    """
    Get a human-readable description of the password policy

    Returns:
        str: Description of password requirements
    """
    min_length = getattr(settings, 'PASSWORD_MIN_LENGTH', 8)
    require_uppercase = getattr(settings, 'PASSWORD_REQUIRE_UPPERCASE', True)
    require_lowercase = getattr(settings, 'PASSWORD_REQUIRE_LOWERCASE', True)
    require_numbers = getattr(settings, 'PASSWORD_REQUIRE_NUMBERS', True)
    require_special = getattr(settings, 'PASSWORD_REQUIRE_SPECIAL', True)

    requirements = [f'at least {min_length} characters']

    if require_uppercase:
        requirements.append('one uppercase letter')
    if require_lowercase:
        requirements.append('one lowercase letter')
    if require_numbers:
        requirements.append('one number')
    if require_special:
        requirements.append('one special character')

    return f"Password must contain: {', '.join(requirements)}"
