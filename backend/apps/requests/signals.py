"""
Django signals for broadcasting real-time updates.

This module listens to model changes (create, update, delete) and
broadcasts updates to all connected WebSocket clients in the same unit.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from datetime import datetime
import logging

from .models import Request, SendBack
from apps.documents.models import Crate

logger = logging.getLogger(__name__)


def broadcast_update(entity, action, instance, unit_id):
    """
    Broadcast an update to all WebSocket clients in a specific unit.

    Args:
        entity: The type of entity (e.g., 'request', 'sendback', 'crate')
        action: The action performed (e.g., 'created', 'updated', 'deleted')
        instance: The model instance that changed
        unit_id: The unit ID to broadcast to
    """
    try:
        channel_layer = get_channel_layer()

        if not channel_layer:
            logger.warning("Channel layer not configured, skipping broadcast")
            return

        # Prepare minimal data to send (avoid sending sensitive info)
        data = {
            'id': str(instance.id) if hasattr(instance, 'id') else None,
        }

        # Add entity-specific data
        if entity == 'request':
            data.update({
                'status': getattr(instance, 'status', None),
                'request_type': getattr(instance, 'request_type', None),
            })
        elif entity == 'crate':
            data.update({
                'crate_number': getattr(instance, 'crate_number', None),
                'status': getattr(instance, 'status', None),
            })

        # Broadcast to the unit's group
        group_name = f"unit_{unit_id}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'data_update',
                'entity': entity,
                'action': action,
                'data': data,
                'timestamp': datetime.utcnow().isoformat(),
            }
        )

        logger.debug(f"Broadcast {action} for {entity} to unit {unit_id}")

    except Exception as e:
        # Don't let broadcast errors break the main request
        logger.error(f"Error broadcasting update: {e}", exc_info=True)


# Request signals
@receiver(post_save, sender=Request)
def request_saved(sender, instance, created, **kwargs):
    """Broadcast when a request is created or updated."""
    action = 'created' if created else 'updated'
    broadcast_update('request', action, instance, instance.unit_id)


@receiver(post_delete, sender=Request)
def request_deleted(sender, instance, **kwargs):
    """Broadcast when a request is deleted."""
    broadcast_update('request', 'deleted', instance, instance.unit_id)


# SendBack signals
@receiver(post_save, sender=SendBack)
def sendback_saved(sender, instance, created, **kwargs):
    """Broadcast when a send-back is created or updated."""
    action = 'created' if created else 'updated'
    # Get the unit_id from the related request
    if hasattr(instance.request, 'unit_id'):
        broadcast_update('sendback', action, instance, instance.request.unit_id)


@receiver(post_delete, sender=SendBack)
def sendback_deleted(sender, instance, **kwargs):
    """Broadcast when a send-back is deleted."""
    if hasattr(instance.request, 'unit_id'):
        broadcast_update('sendback', 'deleted', instance, instance.request.unit_id)


# Crate signals
@receiver(post_save, sender=Crate)
def crate_saved(sender, instance, created, **kwargs):
    """Broadcast when a crate is created or updated."""
    action = 'created' if created else 'updated'
    broadcast_update('crate', action, instance, instance.unit_id)


@receiver(post_delete, sender=Crate)
def crate_deleted(sender, instance, **kwargs):
    """Broadcast when a crate is deleted."""
    broadcast_update('crate', 'deleted', instance, instance.unit_id)
