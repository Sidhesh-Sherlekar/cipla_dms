"""
WebSocket consumers for real-time updates.

This module handles WebSocket connections and broadcasts updates
to all connected clients when data changes occur.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model

User = get_user_model()


class UpdatesConsumer(AsyncWebsocketConsumer):
    """
    Consumer for broadcasting real-time updates to clients.

    Clients connect with JWT authentication and are grouped by their unit.
    When any data changes (requests, crates, etc.), all clients in the
    same unit are notified to refresh their data.
    """

    async def connect(self):
        """
        Handle WebSocket connection.

        Authenticates user via JWT token and subscribes them to
        their unit-specific channel group.
        """
        # Get the token from query string
        query_string = self.scope.get('query_string', b'').decode()
        token = None

        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break

        if not token:
            await self.close(code=4001)
            return

        # Authenticate user
        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        self.user = user
        self.unit_id = str(user.unit_id)
        self.user_id = str(user.id)

        # Create a unique group name for this unit
        self.group_name = f"unit_{self.unit_id}"

        # Create a unique group name for this user (for targeted messages)
        self.user_group_name = f"user_{self.user_id}"

        # Join the unit group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        # Join the user-specific group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

        # Send confirmation message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected to unit {self.unit_id} updates'
        }))

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.

        Removes the client from their unit group and user-specific group.
        """
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """
        Handle messages from WebSocket clients.

        Currently used for heartbeat/ping messages.
        """
        try:
            data = json.loads(text_data)

            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
        except json.JSONDecodeError:
            pass

    async def data_update(self, event):
        """
        Handle data update events from the channel layer.

        Broadcasts the update to the WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'data_update',
            'entity': event.get('entity'),
            'action': event.get('action'),
            'data': event.get('data'),
            'timestamp': event.get('timestamp'),
        }))

    async def force_logout(self, event):
        """
        Handle forced logout events from the channel layer.

        Sends logout command to the WebSocket client, typically when
        an administrator resets the user's password or locks their account.
        """
        await self.send(text_data=json.dumps({
            'type': 'force_logout',
            'reason': event.get('reason', 'Your session has been terminated.'),
            'timestamp': event.get('timestamp'),
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        """
        Validate JWT token and return the associated user.

        Args:
            token: JWT access token string

        Returns:
            User object if valid, None otherwise
        """
        try:
            access_token = AccessToken(token)
            user_id = access_token.get('user_id')
            user = User.objects.get(id=user_id)
            return user
        except (TokenError, User.DoesNotExist):
            return None
