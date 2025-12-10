from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.storage.models import Storage
from apps.storage.serializers import StorageSerializer


def number_to_letter(num):
    """
    Convert a number to alphabetical representation.
    1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, etc.
    """
    result = ""
    while num > 0:
        num -= 1
        result = chr(65 + (num % 26)) + result
        num //= 26
    return result


class StorageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Storage CRUD operations
    GET /api/storage/ - List all storage locations
    POST /api/storage/ - Create new storage location
    GET /api/storage/{id}/ - Get storage location details
    PUT /api/storage/{id}/ - Update storage location
    DELETE /api/storage/{id}/ - Delete storage location
    GET /api/storage/by-unit/{unit_id}/ - Get storage locations by unit
    POST /api/storage/bulk-create/ - Bulk create storage locations
    """
    queryset = Storage.objects.all()
    serializer_class = StorageSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Override create to add audit logging"""
        storage = serializer.save()

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Created',
            message=f'Storage location created: {storage.get_full_location()}',
            request=self.request,
            storage_id=storage.id
        )

    def perform_update(self, serializer):
        """Override update to add audit logging"""
        old_location = serializer.instance.get_full_location()
        storage = serializer.save()

        # Audit logging
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Updated',
            message=f'Storage location updated: {old_location} → {storage.get_full_location()}',
            request=self.request,
            storage_id=storage.id
        )

    def perform_destroy(self, instance):
        """Override destroy to add audit logging"""
        location = instance.get_full_location()
        storage_id = instance.id

        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=self.request.user,
            action='Deleted',
            message=f'Storage location deleted: {location}',
            request=self.request,
            storage_id=storage_id
        )

        instance.delete()

    def get_queryset(self):
        """Filter storage locations based on user's accessible units"""
        queryset = Storage.objects.select_related('unit').all()

        # Filter by user's accessible units (except System Admins who see all)
        if not (self.request.user.is_superuser or (hasattr(self.request.user, 'role') and self.request.user.role and self.request.user.role.role_name in ['System Admin', 'Admin'])):
            # Get user's accessible unit IDs from user_unit_assignments
            user_unit_ids = list(self.request.user.user_unit_assignments.values_list('unit_id', flat=True))

            # Also include deprecated unit field for backward compatibility
            if self.request.user.unit_id and self.request.user.unit_id not in user_unit_ids:
                user_unit_ids.append(self.request.user.unit_id)

            if user_unit_ids:
                queryset = queryset.filter(unit_id__in=user_unit_ids)
            else:
                # User has no units assigned, return empty
                return Storage.objects.none()

        # Additional filter by unit_id if provided (for cascading dropdowns)
        unit_id = self.request.query_params.get('unit_id')
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)

        return queryset.order_by('unit__unit_code', 'room_name', 'rack_name', 'compartment_name', 'shelf_name')

    @action(detail=False, methods=['get'], url_path='by-unit/(?P<unit_id>[^/.]+)')
    def by_unit(self, request, unit_id=None):
        """Get all storage locations for a specific unit"""
        storages = self.get_queryset().filter(unit_id=unit_id)
        serializer = self.get_serializer(storages, many=True)
        return Response({
            'count': storages.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        Bulk create storage locations based on dynamic parameters

        POST /api/storage/bulk-create/
        Body:
        {
            "unit_id": 1,
            "room_numbers": ["101", "102", "201"],  // Array of room numbers/names
            "racks_per_room": 20,
            "compartments_per_rack": 20,
            "shelves_per_compartment": 4  // Optional - omit for 3-level storage
        }
        """
        unit_id = request.data.get('unit_id')
        room_numbers = request.data.get('room_numbers', [])
        racks_per_room = request.data.get('racks_per_room', 1)
        compartments_per_rack = request.data.get('compartments_per_rack', 1)
        shelves_per_compartment = request.data.get('shelves_per_compartment')  # Optional

        # Get alphabetical flags
        alphabetical_rack = request.data.get('alphabetical_rack', False)
        alphabetical_compartment = request.data.get('alphabetical_compartment', False)
        alphabetical_shelf = request.data.get('alphabetical_shelf', False)

        # Validation
        if not unit_id:
            return Response(
                {'error': 'unit_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not room_numbers or not isinstance(room_numbers, list) or len(room_numbers) == 0:
            return Response(
                {'error': 'room_numbers is required and must be a non-empty array'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            racks_per_room = int(racks_per_room)
            compartments_per_rack = int(compartments_per_rack)
            if shelves_per_compartment is not None:
                shelves_per_compartment = int(shelves_per_compartment)
        except (ValueError, TypeError):
            return Response(
                {'error': 'All numeric values must be valid integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create storage locations
        storage_locations = []

        for room_number in room_numbers:
            room_name = str(room_number).strip()

            for rack_num in range(1, racks_per_room + 1):
                # Generate rack name based on alphabetical flag (just number or letter)
                if alphabetical_rack:
                    rack_name = number_to_letter(rack_num)
                else:
                    rack_name = str(rack_num)

                for comp_num in range(1, compartments_per_rack + 1):
                    # Generate compartment name based on alphabetical flag (just number or letter)
                    if alphabetical_compartment:
                        compartment_name = number_to_letter(comp_num)
                    else:
                        compartment_name = str(comp_num)

                    if shelves_per_compartment is not None:
                        # 4-level storage: Room -> Rack -> Compartment -> Shelf
                        for shelf_num in range(1, shelves_per_compartment + 1):
                            # Generate shelf name based on alphabetical flag (just number or letter)
                            if alphabetical_shelf:
                                shelf_name = number_to_letter(shelf_num)
                            else:
                                shelf_name = str(shelf_num)
                            storage_locations.append(
                                Storage(
                                    unit_id=unit_id,
                                    room_name=room_name,
                                    rack_name=rack_name,
                                    compartment_name=compartment_name,
                                    shelf_name=shelf_name
                                )
                            )
                    else:
                        # 3-level storage: Room -> Rack -> Compartment (no shelf)
                        storage_locations.append(
                            Storage(
                                unit_id=unit_id,
                                room_name=room_name,
                                rack_name=rack_name,
                                compartment_name=compartment_name,
                                shelf_name=None
                            )
                        )

        # Bulk create all storage locations
        try:
            Storage.objects.bulk_create(storage_locations, ignore_conflicts=True)
            created_count = len(storage_locations)

            # Audit logging
            from apps.audit.utils import log_audit_event
            from apps.auth.models import Unit
            unit = Unit.objects.get(id=unit_id)
            room_list = ', '.join(room_numbers)
            log_audit_event(
                user=request.user,
                action='Created',
                message=f'Bulk created {created_count} storage locations for {unit.unit_name} (rooms: {room_list}, {racks_per_room} racks/room, {compartments_per_rack} compartments/rack)',
                request=request
            )

            return Response({
                'message': f'Successfully created {created_count} storage locations',
                'count': created_count,
                'details': {
                    'unit_id': unit_id,
                    'room_numbers': room_numbers,
                    'racks_per_room': racks_per_room,
                    'compartments_per_rack': compartments_per_rack,
                    'shelves_per_compartment': shelves_per_compartment,
                    'storage_levels': 4 if shelves_per_compartment else 3
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Failed to create storage locations: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
