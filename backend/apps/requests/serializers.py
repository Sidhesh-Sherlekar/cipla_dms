from rest_framework import serializers
from apps.requests.models import Request, RequestDocument, SendBack
from apps.documents.serializers import DocumentSerializer, DocumentCreateSerializer, CrateSerializer
from datetime import datetime
from django.utils import timezone


class RequestDocumentSerializer(serializers.ModelSerializer):
    """Serializer for Request-Document relationship"""
    document = DocumentSerializer(read_only=True)

    class Meta:
        model = RequestDocument
        fields = ['id', 'document', 'added_at']


class SendBackSerializer(serializers.ModelSerializer):
    """Serializer for SendBack (change requests and return notes)"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = SendBack
        fields = ['id', 'request', 'reason', 'sendback_type', 'created_at', 'created_by', 'created_by_name']
        read_only_fields = ['id', 'created_at', 'created_by']


class SendBackCreateSerializer(serializers.Serializer):
    """Serializer for sending a request back for changes"""
    reason = serializers.CharField(min_length=10, help_text='Reason for sending back (minimum 10 characters)')
    digital_signature = serializers.CharField(write_only=True)


class RequestSerializer(serializers.ModelSerializer):
    """Serializer for Request model"""
    crate_info = CrateSerializer(source='crate', read_only=True)
    withdrawn_by_name = serializers.CharField(source='withdrawn_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    allocated_by_name = serializers.CharField(source='allocated_by.full_name', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.full_name', read_only=True)
    unit_code = serializers.CharField(source='unit.unit_code', read_only=True)
    request_documents = RequestDocumentSerializer(source='requestdocument_set', many=True, read_only=True)
    sendbacks = SendBackSerializer(many=True, read_only=True)
    is_overdue = serializers.SerializerMethodField()
    storage_location = serializers.SerializerMethodField()
    sendback_reason = serializers.SerializerMethodField()

    class Meta:
        model = Request
        fields = [
            'id', 'request_type', 'crate', 'crate_info', 'unit', 'unit_code',
            'request_date', 'approval_date', 'issue_date', 'return_date',
            'expected_return_date', 'approved_by', 'approved_by_name',
            'allocation_date', 'allocated_by', 'allocated_by_name',
            'status', 'withdrawn_by', 'withdrawn_by_name',
            'purpose', 'full_withdrawal', 'issued_by', 'issued_by_name',
            'request_documents', 'sendbacks', 'sendback_reason', 'is_overdue', 'storage_location', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'request_date', 'created_at', 'updated_at']

    def get_is_overdue(self, obj):
        return obj.is_overdue()

    def get_storage_location(self, obj):
        """Get the storage location of the crate"""
        if obj.crate and obj.crate.storage:
            return obj.crate.storage.get_full_location()
        return None

    def get_sendback_reason(self, obj):
        """Get the most recent sendback reason for change requests"""
        latest_sendback = obj.sendbacks.filter(sendback_type='Change Request').order_by('-created_at').first()
        return latest_sendback.reason if latest_sendback else None


class StorageRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating storage requests"""
    unit = serializers.IntegerField()
    department = serializers.IntegerField()
    section = serializers.IntegerField(required=False, allow_null=True)  # Section for barcode
    destruction_date = serializers.DateField(required=False, allow_null=True)  # Optional for retained crates
    purpose = serializers.CharField(required=False, allow_blank=True)
    to_central = serializers.BooleanField(default=False)  # Send to central storage
    to_be_retained = serializers.BooleanField(default=False)  # No destruction date
    documents = serializers.ListField(
        child=DocumentCreateSerializer(),
        min_length=1
    )
    digital_signature = serializers.CharField(write_only=True)

    def validate(self, data):
        """Validate that destruction_date is required if to_be_retained is False"""
        if not data.get('to_be_retained') and not data.get('destruction_date'):
            raise serializers.ValidationError({
                'destruction_date': 'Destruction date is required unless "To Be Retained" is checked'
            })
        return data

    def validate_documents(self, value):
        """Validate that document numbers are unique"""
        doc_numbers = [doc['document_number'] for doc in value]
        if len(doc_numbers) != len(set(doc_numbers)):
            raise serializers.ValidationError("Document numbers must be unique")
        return value


class StorageRequestUpdateSerializer(serializers.Serializer):
    """Serializer for updating sent-back storage requests"""
    destruction_date = serializers.DateField(required=False, allow_null=True)  # Optional for retained crates
    purpose = serializers.CharField(required=False, allow_blank=True)
    to_central = serializers.BooleanField(default=False)  # Send to central storage
    to_be_retained = serializers.BooleanField(default=False)  # No destruction date
    documents = serializers.ListField(
        child=DocumentCreateSerializer(),
        min_length=1
    )
    digital_signature = serializers.CharField(write_only=True)

    def validate(self, data):
        """Validate that destruction_date is required if to_be_retained is False"""
        if not data.get('to_be_retained') and not data.get('destruction_date'):
            raise serializers.ValidationError({
                'destruction_date': 'Destruction date is required unless "To Be Retained" is checked'
            })
        return data

    def validate_documents(self, value):
        """Validate that document numbers are unique"""
        doc_numbers = [doc['document_number'] for doc in value]
        if len(doc_numbers) != len(set(doc_numbers)):
            raise serializers.ValidationError("Document numbers must be unique")
        return value


class WithdrawalRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating withdrawal requests"""
    crate_id = serializers.IntegerField(source='crate')
    expected_return_date = serializers.DateTimeField()
    purpose = serializers.CharField(required=False, allow_blank=True)
    full_withdrawal = serializers.BooleanField(default=True)
    document_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    digital_signature = serializers.CharField(write_only=True)

    def validate(self, data):
        """Validate withdrawal request data"""
        if not data.get('full_withdrawal') and not data.get('document_ids'):
            raise serializers.ValidationError(
                "For partial withdrawal, you must specify document_ids"
            )

        if data.get('expected_return_date') and data.get('expected_return_date') <= timezone.now():
            raise serializers.ValidationError(
                "Expected return date must be in the future"
            )

        return data


class WithdrawalRequestUpdateSerializer(serializers.Serializer):
    """Serializer for updating sent-back withdrawal requests"""
    expected_return_date = serializers.DateTimeField()
    purpose = serializers.CharField(required=False, allow_blank=True)
    full_withdrawal = serializers.BooleanField(default=True)
    document_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    digital_signature = serializers.CharField(write_only=True)

    def validate(self, data):
        """Validate withdrawal request data"""
        if not data.get('full_withdrawal') and not data.get('document_ids'):
            raise serializers.ValidationError(
                "For partial withdrawal, you must specify document_ids"
            )

        if data.get('expected_return_date') and data.get('expected_return_date') <= timezone.now():
            raise serializers.ValidationError(
                "Expected return date must be in the future"
            )

        return data


class DestructionRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating destruction requests"""
    crate_id = serializers.IntegerField(source='crate')
    purpose = serializers.CharField(required=False, allow_blank=True)
    digital_signature = serializers.CharField(write_only=True)


class DestructionRequestUpdateSerializer(serializers.Serializer):
    """Serializer for updating sent-back destruction requests"""
    purpose = serializers.CharField(required=False, allow_blank=True)
    digital_signature = serializers.CharField(write_only=True)


class ApproveRequestSerializer(serializers.Serializer):
    """Serializer for approving requests"""
    digital_signature = serializers.CharField(write_only=True)


class RejectRequestSerializer(serializers.Serializer):
    """Serializer for rejecting requests"""
    reason = serializers.CharField()
    digital_signature = serializers.CharField(write_only=True)


class AllocateStorageSerializer(serializers.Serializer):
    """Serializer for allocating storage to a crate"""
    storage = serializers.IntegerField()
    digital_signature = serializers.CharField(write_only=True)


class IssueDocumentsSerializer(serializers.Serializer):
    """Serializer for issuing documents"""
    digital_signature = serializers.CharField(write_only=True)


class ReturnDocumentsSerializer(serializers.Serializer):
    """Serializer for returning documents"""
    reason = serializers.CharField(required=False, allow_blank=True)
    storage = serializers.IntegerField(required=True)  # Storage location ID
    digital_signature = serializers.CharField(write_only=True)
