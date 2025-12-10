from rest_framework import serializers
from apps.documents.models import Document, Crate, CrateDocument


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model"""

    class Meta:
        model = Document
        fields = ['id', 'document_name', 'document_number', 'document_type',
                 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentCreateSerializer(serializers.Serializer):
    """Serializer for creating documents within a crate"""
    document_name = serializers.CharField(max_length=255)
    document_number = serializers.CharField(max_length=100)
    document_type = serializers.ChoiceField(choices=['Physical', 'Digital'], default='Physical')
    description = serializers.CharField(required=False, allow_blank=True)


class CrateDocumentSerializer(serializers.ModelSerializer):
    """Serializer for Crate-Document relationship"""
    document = DocumentSerializer(read_only=True)

    class Meta:
        model = CrateDocument
        fields = ['id', 'document', 'added_at']


class CrateSerializer(serializers.ModelSerializer):
    """Serializer for Crate model with barcode support"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    unit_code = serializers.CharField(source='unit.unit_code', read_only=True)
    unit_name = serializers.CharField(source='unit.unit_name', read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    storage_location = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    barcode = serializers.CharField(read_only=True)

    class Meta:
        model = Crate
        fields = ['id', 'barcode', 'destruction_date', 'creation_date', 'created_by',
                 'created_by_name', 'status', 'storage', 'storage_location',
                 'unit', 'unit_code', 'unit_name', 'department', 'department_name',
                 'document_count', 'to_central', 'to_be_retained']
        read_only_fields = ['id', 'barcode', 'creation_date', 'created_by']

    def get_storage_location(self, obj):
        if obj.storage:
            return obj.storage.get_full_location()
        return None

    def get_document_count(self, obj):
        return obj.get_document_count()
