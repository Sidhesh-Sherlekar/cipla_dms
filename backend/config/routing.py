"""
WebSocket URL routing configuration.

This module defines the WebSocket URL patterns for the Cipla DMS.
It routes WebSocket connections to appropriate consumers.
"""

from django.urls import re_path
from apps.requests.consumers import UpdatesConsumer

websocket_urlpatterns = [
    re_path(r'ws/updates/$', UpdatesConsumer.as_asgi()),
]
