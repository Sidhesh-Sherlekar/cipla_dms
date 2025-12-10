"""
Utility functions for sending WebSocket messages to specific users.

This module provides functions to send targeted WebSocket messages
for authentication and session management purposes.
"""

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def send_force_logout(user_id, reason="Your session has been terminated."):
    """
    Send a forced logout message to all active WebSocket connections for a specific user.

    This is typically used when:
    - An administrator resets the user's password
    - An administrator locks/unlocks the user's account
    - Security policies require immediate session termination

    Args:
        user_id: The ID of the user to logout
        reason: The reason for the forced logout (shown to the user)

    Returns:
        bool: True if message was sent successfully, False otherwise
    """
    try:
        channel_layer = get_channel_layer()

        if not channel_layer:
            logger.warning("Channel layer not configured, skipping WebSocket logout notification")
            return False

        # Send to user-specific group
        group_name = f"user_{user_id}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'force_logout',  # Maps to force_logout() method in UpdatesConsumer
                'reason': reason,
                'timestamp': datetime.utcnow().isoformat(),
            }
        )

        logger.info(f"Forced logout notification sent to user {user_id}: {reason}")
        return True

    except Exception as e:
        logger.error(f"Error sending forced logout notification to user {user_id}: {e}", exc_info=True)
        return False
