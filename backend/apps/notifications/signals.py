"""
Django Signals for Email Notifications

This module connects Django signals to email notification tasks.
Notifications are triggered automatically when model events occur.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from .email_config import is_email_enabled

logger = logging.getLogger(__name__)


def trigger_notification_task(task_func, *args, **kwargs):
    """
    Safely trigger a Celery task for email notification.
    Falls back to synchronous execution if Celery is not available.
    """
    if not is_email_enabled():
        logger.debug("Email notifications disabled, skipping")
        return

    try:
        # Try to use Celery async
        task_func.delay(*args, **kwargs)
        logger.debug(f"Queued notification task: {task_func.name}")
    except Exception as e:
        logger.warning(f"Celery not available, running synchronously: {str(e)}")
        try:
            # Fallback to synchronous execution
            task_func(*args, **kwargs)
        except Exception as sync_error:
            logger.error(f"Failed to send notification: {str(sync_error)}")


# Note: Most notification triggers are called explicitly from views
# rather than using signals, to have better control over when emails are sent.
# The signals below are optional and can be enabled if automatic notifications are desired.

# Uncomment to enable automatic notifications on model saves:

# @receiver(post_save, sender='requests.Request')
# def request_saved_handler(sender, instance, created, **kwargs):
#     """Handle Request model save events."""
#     from .tasks import send_request_created_notification
#
#     if created:
#         trigger_notification_task(send_request_created_notification, instance.id)
