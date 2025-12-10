"""
Session Timeout Middleware

Dynamically enforces session timeout based on the SessionPolicy model.
This allows administrators to change session timeout without restarting the server.
"""

from django.conf import settings
from django.contrib.sessions.middleware import SessionMiddleware
from apps.auth.models import SessionPolicy


class DynamicSessionTimeoutMiddleware:
    """
    Middleware to dynamically set session timeout based on SessionPolicy model

    This middleware runs after Django's SessionMiddleware and updates the
    session cookie age based on the current SessionPolicy setting.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get current session timeout from database
        try:
            session_policy = SessionPolicy.objects.first()
            if session_policy:
                # Convert minutes to seconds
                timeout_seconds = session_policy.session_timeout_minutes * 60

                # Update session cookie age if session exists
                if hasattr(request, 'session'):
                    request.session.set_expiry(timeout_seconds)
        except Exception as e:
            # If anything goes wrong, use default timeout from settings
            pass

        response = self.get_response(request)
        return response
