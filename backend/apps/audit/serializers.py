from rest_framework import serializers
from apps.audit.models import AuditTrail


class AuditTrailSerializer(serializers.ModelSerializer):
    """Serializer for AuditTrail model (read-only)"""
    user_name = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditTrail
        fields = [
            'id',
            'action_time',
            'action',
            'user',
            'user_name',
            'username',
            'user_email',
            'attempted_username',
            'request_id',
            'storage_id',
            'crate_id',
            'document_id',
            'message',
            'ip_address',
            'user_agent'
        ]
        read_only_fields = fields  # All fields are read-only (immutable audit log)

    def get_user_name(self, obj):
        """Return user's full name or attempted username for failed logins"""
        if obj.user:
            return obj.user.full_name
        return obj.attempted_username or 'Unknown'

    def get_username(self, obj):
        """Return username or attempted username for failed logins"""
        if obj.user:
            return obj.user.username
        return obj.attempted_username or 'Unknown'

    def get_user_email(self, obj):
        """Return user's email or None for failed logins"""
        if obj.user:
            return obj.user.email
        return None
