from rest_framework import serializers
from apps.storage.models import Storage


class StorageSerializer(serializers.ModelSerializer):
    """Serializer for Storage model"""
    unit_code = serializers.CharField(source='unit.unit_code', read_only=True)
    full_location = serializers.SerializerMethodField()

    class Meta:
        model = Storage
        fields = ['id', 'unit', 'unit_code', 'room_name', 'rack_name',
                 'compartment_name', 'shelf_name', 'full_location',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_location(self, obj):
        return obj.get_full_location()
