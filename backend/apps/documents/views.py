from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.db import transaction
from apps.documents.models import Document, Crate, CrateDocument
from apps.documents.serializers import (
    DocumentSerializer,
    CrateSerializer,
    CrateDocumentSerializer
)
from apps.auth.permissions import CanAllocateStorage, IsActiveUser
from apps.auth.decorators import require_digital_signature


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document CRUD operations
    GET /api/documents/ - List all documents
    POST /api/documents/ - Create new document
    GET /api/documents/{id}/ - Get document details
    PUT /api/documents/{id}/ - Update document
    DELETE /api/documents/{id}/ - Delete document
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Override create to add audit logging"""
        document = serializer.save()

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Created',
            message=f'Document created: {document.document_number} - {document.document_name} ({document.document_type})',
            request=self.request,
            document_id=document.id
        )

    def perform_update(self, serializer):
        """Override update to add audit logging"""
        old_doc = serializer.instance
        document = serializer.save()

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Updated',
            message=f'Document updated: {document.document_number}',
            request=self.request,
            document_id=document.id
        )

    def perform_destroy(self, instance):
        """Override destroy to add audit logging"""
        doc_id = instance.id
        doc_info = f'{instance.document_number} - {instance.document_name}'

        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Deleted',
            message=f'Document deleted: {doc_info}',
            request=self.request,
            document_id=doc_id
        )

        instance.delete()

    def get_queryset(self):
        """Filter documents based on query params"""
        queryset = Document.objects.all()

        # Filter by document type
        doc_type = self.request.query_params.get('document_type')
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)

        # Search by document number or name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(document_number__icontains=search) |
                Q(document_name__icontains=search)
            )

        return queryset.order_by('-created_at')


class CrateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Crate CRUD operations
    GET /api/crates/ - List all crates
    POST /api/crates/ - Create new crate
    GET /api/crates/{id}/ - Get crate details
    PUT /api/crates/{id}/ - Update crate
    DELETE /api/crates/{id}/ - Delete crate
    GET /api/crates/{id}/documents/ - Get all documents in a crate
    """
    queryset = Crate.objects.all()
    serializer_class = CrateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter crates based on query params and user's units"""
        queryset = Crate.objects.select_related(
            'created_by', 'unit', 'department', 'storage'
        ).prefetch_related('documents').all()

        # Filter by user's units (except System Admins who see all)
        if not (self.request.user.is_superuser or (hasattr(self.request.user, 'role') and self.request.user.role and self.request.user.role.role_name == 'System Admin')):
            # Get all units the user has access to via the units M2M relationship
            user_units = self.request.user.units.all()
            if user_units.exists():
                queryset = queryset.filter(unit__in=user_units)
            elif self.request.user.unit:
                # Fallback to deprecated single unit field for backward compatibility
                queryset = queryset.filter(unit=self.request.user.unit)
            else:
                # User has no unit assigned, return empty
                return Crate.objects.none()

        # Additional filter by unit_id if provided (for cascading dropdowns or specific queries)
        unit_id = self.request.query_params.get('unit_id')
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)

        # Filter by status
        crate_status = self.request.query_params.get('status')
        if crate_status:
            queryset = queryset.filter(status=crate_status)

        return queryset.order_by('-creation_date')

    def perform_create(self, serializer):
        """Set created_by to current user and add audit logging"""
        crate = serializer.save(created_by=self.request.user)

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Created',
            message=f'Crate created: Crate #{crate.id} for {crate.unit.unit_name if crate.unit else "No Unit"}',
            request=self.request,
            crate_id=crate.id
        )

    def perform_update(self, serializer):
        """Override update to add audit logging"""
        crate = serializer.save()

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Updated',
            message=f'Crate updated: Crate #{crate.id}, Status: {crate.status}',
            request=self.request,
            crate_id=crate.id
        )

    def perform_destroy(self, instance):
        """Override destroy to add audit logging"""
        crate_id = instance.id
        crate_info = f'Crate #{instance.id}'

        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Deleted',
            message=f'Crate deleted: {crate_info}',
            request=self.request,
            crate_id=crate_id
        )

        instance.delete()

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents in a specific crate"""
        crate = self.get_object()
        crate_documents = CrateDocument.objects.filter(crate=crate).select_related('document')
        serializer = CrateDocumentSerializer(crate_documents, many=True)
        return Response({
            'crate_id': crate.id,
            'document_count': crate_documents.count(),
            'documents': serializer.data
        })

    @action(detail=False, methods=['get'])
    def by_unit(self, request):
        """Get all crates for user's unit"""
        unit_id = request.query_params.get('unit_id')
        if not unit_id:
            return Response(
                {'error': 'unit_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        crates = self.get_queryset().filter(unit_id=unit_id)
        serializer = self.get_serializer(crates, many=True)
        return Response({
            'count': crates.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def due_for_destruction(self, request):
        """Get crates that are due for destruction"""
        from datetime import date
        crates = self.get_queryset().filter(
            destruction_date__lte=date.today(),
            status='Active'
        )
        serializer = self.get_serializer(crates, many=True)
        return Response({
            'count': crates.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def in_storage(self, request):
        """
        Get all Active or Archived crates that are currently in storage (have storage allocated)
        Used for withdrawal and destruction requests
        Excludes Withdrawn and Destroyed crates

        GET /api/documents/crates/in_storage/
        Query params:
        - unit_id: Filter by unit (optional, already handled by get_queryset)
        """
        # Get crates that are Active or Archived and have storage allocated
        # Exclude Withdrawn crates (currently out for withdrawal) and Destroyed crates
        # Note: Unit filtering is already handled by get_queryset() method
        crates = self.get_queryset().filter(
            status__in=['Active', 'Archived'],
            storage__isnull=False  # Only crates with storage allocated
        )

        serializer = self.get_serializer(crates, many=True)
        return Response({
            'count': crates.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='relocate', permission_classes=[CanAllocateStorage, IsActiveUser])
    @require_digital_signature
    def relocate(self, request, pk=None):
        """
        Relocate a crate to a new storage location

        Requires:
        - Store Head role (CanAllocateStorage permission)
        - Active user status
        - Digital signature (password re-entry)

        Validates:
        - Crate status must be Active or Archived
        - Crate must belong to user's unit (except System Admins)
        - New storage must belong to user's unit (except System Admins)
        - Storage location must exist

        Uses database locking to prevent concurrent relocations
        """
        from apps.storage.models import Storage
        from apps.audit.utils import log_audit_event

        # Validate storage_id parameter
        storage_id = request.data.get('storage_id')
        if not storage_id:
            return Response(
                {'error': 'storage_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use database transaction with row locking to prevent race conditions
        with transaction.atomic():
            # Lock the crate row to prevent concurrent modifications
            try:
                crate = Crate.objects.select_for_update().get(pk=pk)
            except Crate.DoesNotExist:
                return Response(
                    {'error': 'Crate not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Validate crate status - only Active or Archived crates can be relocated
            if crate.status not in ['Active', 'Archived']:
                return Response(
                    {'error': f'Cannot relocate crate in {crate.status} status. Only Active or Archived crates can be relocated.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate unit permissions - crate must belong to user's unit
            # System Admins can relocate any crate
            is_admin = request.user.is_superuser or (
                hasattr(request.user, 'role') and
                request.user.role and
                request.user.role.role_name == 'System Admin'
            )

            if not is_admin:
                if not request.user.unit:
                    return Response(
                        {'error': 'You are not assigned to any unit'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                if crate.unit != request.user.unit:
                    return Response(
                        {'error': 'You can only relocate crates from your own unit'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Validate new storage location exists
            try:
                new_storage = Storage.objects.get(id=storage_id)
            except Storage.DoesNotExist:
                return Response(
                    {'error': 'Storage location not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Validate new storage belongs to user's unit (except System Admins)
            if not is_admin:
                if new_storage.unit != request.user.unit:
                    return Response(
                        {'error': 'Storage location is not in your unit'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Store old location for audit trail
            old_storage = crate.storage

            # Update crate storage
            crate.storage = new_storage
            crate.save()

            # Audit logging with specific "Relocated" action
            log_audit_event(
                user=request.user,
                action='Relocated',
                message=f'Crate #{crate.id} relocated from {old_storage.get_full_location() if old_storage else "No Storage"} to {new_storage.get_full_location()}',
                request=request,
                crate_id=crate.id,
                storage_id=new_storage.id
            )

        return Response({
            'message': 'Crate relocated successfully',
            'crate_id': crate.id,
            'old_location': old_storage.get_full_location() if old_storage else None,
            'new_location': new_storage.get_full_location()
        })
