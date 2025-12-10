"""
Email Configuration for Cipla DMS

SMTP settings can be configured via environment variables or directly in code.
Environment variables take precedence over code defaults.

Environment Variables:
    EMAIL_HOST: SMTP server hostname
    EMAIL_PORT: SMTP server port (default: 587)
    EMAIL_USE_TLS: Use TLS encryption (default: True)
    EMAIL_USE_SSL: Use SSL encryption (default: False)
    EMAIL_HOST_USER: SMTP username/email
    EMAIL_HOST_PASSWORD: SMTP password
    EMAIL_FROM_NAME: Sender display name (default: Cipla DMS)
    EMAIL_FROM_ADDRESS: Sender email address
    EMAIL_ENABLED: Enable/disable email sending (default: True)

Code Configuration:
    Modify the FALLBACK_CONFIG dictionary below to set default values
    when environment variables are not set.
"""

import os
from django.conf import settings


# Fallback configuration when environment variables are not set
FALLBACK_CONFIG = {
    'EMAIL_HOST': 'smtp.gmail.com',  # Change to your SMTP server
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_USE_SSL': False,
    'EMAIL_HOST_USER': '',  # Set your email here if not using env vars
    'EMAIL_HOST_PASSWORD': '',  # Set your password here if not using env vars
    'EMAIL_FROM_NAME': 'Cipla DMS',
    'EMAIL_FROM_ADDRESS': 'noreply@cipla.com',
    # EMAIL NOTIFICATIONS DISABLED - Set to True to enable
    'EMAIL_ENABLED': False,
}


def get_email_config():
    """
    Get email configuration from environment or fallback to code defaults.

    Returns:
        dict: Email configuration dictionary
    """
    def get_bool(key, default):
        """Get boolean value from environment variable."""
        value = os.environ.get(key)
        if value is None:
            return default
        return value.lower() in ('true', '1', 'yes', 'on')

    def get_int(key, default):
        """Get integer value from environment variable."""
        value = os.environ.get(key)
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            return default

    return {
        'EMAIL_HOST': os.environ.get('EMAIL_HOST', FALLBACK_CONFIG['EMAIL_HOST']),
        'EMAIL_PORT': get_int('EMAIL_PORT', FALLBACK_CONFIG['EMAIL_PORT']),
        'EMAIL_USE_TLS': get_bool('EMAIL_USE_TLS', FALLBACK_CONFIG['EMAIL_USE_TLS']),
        'EMAIL_USE_SSL': get_bool('EMAIL_USE_SSL', FALLBACK_CONFIG['EMAIL_USE_SSL']),
        'EMAIL_HOST_USER': os.environ.get('EMAIL_HOST_USER', FALLBACK_CONFIG['EMAIL_HOST_USER']),
        'EMAIL_HOST_PASSWORD': os.environ.get('EMAIL_HOST_PASSWORD', FALLBACK_CONFIG['EMAIL_HOST_PASSWORD']),
        'EMAIL_FROM_NAME': os.environ.get('EMAIL_FROM_NAME', FALLBACK_CONFIG['EMAIL_FROM_NAME']),
        'EMAIL_FROM_ADDRESS': os.environ.get('EMAIL_FROM_ADDRESS', FALLBACK_CONFIG['EMAIL_FROM_ADDRESS']),
        'EMAIL_ENABLED': get_bool('EMAIL_ENABLED', FALLBACK_CONFIG['EMAIL_ENABLED']),
    }


def is_email_enabled():
    """Check if email sending is enabled."""
    config = get_email_config()
    # Email is enabled if EMAIL_ENABLED is True and credentials are configured
    return (
        config['EMAIL_ENABLED'] and
        config['EMAIL_HOST'] and
        config['EMAIL_HOST_USER']
    )


def get_from_email():
    """Get the formatted 'From' email address."""
    config = get_email_config()
    from_name = config['EMAIL_FROM_NAME']
    from_address = config['EMAIL_FROM_ADDRESS'] or config['EMAIL_HOST_USER']
    if from_name:
        return f"{from_name} <{from_address}>"
    return from_address


# Reminder configuration (in days)
REMINDER_DAYS = [10, 5, 3, 2, 1]

# Application URLs for email links
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'http://localhost:5173')
