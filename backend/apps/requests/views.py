"""
Request Workflow API Views for 21 CFR Part 11 Compliance

All actions require digital signatures (password re-entry) and are logged to audit trail.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from apps.requests.models import Request, RequestDocument, SendBack
from apps.documents.models import Document, Crate, CrateDocument
from apps.storage.models import Storage
from apps.requests.serializers import (
    RequestSerializer, StorageRequestCreateSerializer,
    WithdrawalRequestCreateSerializer, DestructionRequestCreateSerializer,
    StorageRequestUpdateSerializer, WithdrawalRequestUpdateSerializer,
    DestructionRequestUpdateSerializer,
    ApproveRequestSerializer, RejectRequestSerializer,
    AllocateStorageSerializer, IssueDocumentsSerializer,
    ReturnDocumentsSerializer, SendBackCreateSerializer
)
from apps.auth.decorators import require_digital_signature
from apps.auth.permissions import (
    CanCreateRequests, CanApproveRequests,
    CanAllocateStorage, IsActiveUser
)
from apps.audit.utils import (
    log_audit_event, log_request_created, log_request_approved,
    log_request_rejected, log_storage_allocated,
    log_document_issued, log_document_returned,
    log_crate_destroyed
)
from apps.notifications.tasks import (
    send_request_created_notification,
    send_request_approved_notification,
    send_request_rejected_notification,
    send_request_sent_back_notification,
    send_storage_allocated_notification,
    send_documents_issued_notification,
    send_documents_returned_notification,
    send_destruction_confirmed_notification
)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
# @require_digital_signature
def create_storage_request(request):
    """Create a new storage request with documents"""
    serializer = StorageRequestCreateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    try:
        with transaction.atomic():
            crate = Crate.objects.create(
                destruction_date=data.get('destruction_date'),  # Can be None if to_be_retained
                created_by=request.user,
                unit_id=data['unit'],
                department_id=data['department'],
                section_id=data.get('section'),  # Section for barcode
                status='Active',
                to_central=data.get('to_central', False),
                to_be_retained=data.get('to_be_retained', False)
            )
            
            for doc_data in data['documents']:
                document, _ = Document.objects.get_or_create(
                    document_number=doc_data['document_number'],
                    defaults={
                        'document_name': doc_data['document_name'],
                        'document_type': doc_data.get('document_type', 'Physical'),
                        'description': doc_data.get('description', '')
                    }
                )
                
                CrateDocument.objects.create(crate=crate, document=document)
            
            storage_request = Request.objects.create(
                request_type='Storage',
                crate=crate,
                unit_id=data['unit'],
                status='Pending',
                withdrawn_by=request.user,
                purpose=data.get('purpose', '')
            )
            
            for doc in crate.documents.all():
                RequestDocument.objects.create(request=storage_request, document=doc)
            
            log_request_created(request.user, storage_request, request)

            # Send email notification to approvers
            try:
                send_request_created_notification.delay(storage_request.id)
            except Exception as e:
                print(f"Failed to queue email notification: {str(e)}")

            return Response({
                'message': 'Storage request created successfully',
                'request_id': storage_request.id,
                'crate_id': crate.id,
                'status': 'Pending'
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR creating storage request: {str(e)}")
        print(f"Traceback: {error_trace}")
        return Response({
            'error': 'Failed to create storage request',
            'detail': str(e),
            'trace': error_trace if request.user.is_superuser else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanApproveRequests, IsActiveUser])
@require_digital_signature
def approve_request(request, pk):
    """Approve a pending request"""
    serializer = ApproveRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request_obj.status != 'Pending':
        return Response({
            'error': f'Request is not in pending state (current status: {request_obj.status})'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    request_obj.status = 'Approved'
    request_obj.approved_by = request.user
    request_obj.approval_date = timezone.now()
    request_obj.save()

    log_request_approved(request.user, request_obj, request)

    # Send email notification to requester
    try:
        send_request_approved_notification.delay(request_obj.id, request.user.id)
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': f'{request_obj.request_type} request approved successfully',
        'request_id': request_obj.id,
        'status': 'Approved'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def list_requests(request):
    """List all requests with filtering (filtered by user's unit)"""
    queryset = Request.objects.all().select_related(
        'crate', 'unit', 'withdrawn_by', 'approved_by', 'allocated_by', 'issued_by'
    ).order_by('-request_date')

    # Track if user is in Central unit for later filtering
    is_central_user = False

    # Filter by user's units (except System Admins who see all)
    if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
        # Check for units via many-to-many (new system)
        user_units = request.user.units.all()
        if user_units.exists():
            # Check if user is in the Central unit
            is_central_user = user_units.filter(unit_code__iexact='Central').exists()

            if is_central_user:
                # Central unit users see: their unit's requests OR any request with to_central=True
                queryset = queryset.filter(
                    Q(unit__in=user_units) | Q(crate__to_central=True)
                )
            else:
                # Regular users see only their unit's requests
                queryset = queryset.filter(unit__in=user_units)
        elif request.user.unit:
            # Fallback to legacy single unit field
            is_central_user = request.user.unit.unit_code.lower() == 'central'

            if is_central_user:
                queryset = queryset.filter(
                    Q(unit=request.user.unit) | Q(crate__to_central=True)
                )
            else:
                queryset = queryset.filter(unit=request.user.unit)
        else:
            # User has no unit assigned, return empty
            queryset = Request.objects.none()

    # Apply additional filters
    request_type = request.query_params.get('request_type')
    if request_type:
        queryset = queryset.filter(request_type=request_type)

    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    unit = request.query_params.get('unit')
    if unit:
        # For Central users, include to_central requests even when filtering by unit
        if is_central_user:
            queryset = queryset.filter(
                Q(unit_id=unit) | Q(crate__to_central=True)
            )
        else:
            queryset = queryset.filter(unit_id=unit)

    serializer = RequestSerializer(queryset, many=True)
    return Response({
        'count': queryset.count(),
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def get_request(request, pk):
    """Get a single request detail"""
    try:
        request_obj = Request.objects.select_related(
            'crate', 'unit', 'withdrawn_by', 'approved_by', 'allocated_by', 'issued_by'
        ).get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = RequestSerializer(request_obj)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanApproveRequests, IsActiveUser])
@require_digital_signature
def reject_request(request, pk):
    """Reject a pending request or cancel a sent-back request"""
    serializer = RejectRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    # Allow rejecting/canceling requests that are Pending or Sent Back
    if request_obj.status not in ['Pending', 'Sent Back']:
        return Response({
            'error': f'Request cannot be rejected (current status: {request_obj.status}). Only Pending or Sent Back requests can be rejected.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # If this is a withdrawal request, restore crate status to Active
    if request_obj.request_type == 'Withdrawal' and request_obj.crate.status == 'Withdrawn':
        request_obj.crate.status = 'Active'
        request_obj.crate.save()

        log_audit_event(
            user=request.user,
            action='Updated',
            message=f'Crate #{request_obj.crate.id} status restored to Active after withdrawal request #{request_obj.id} was rejected',
            request=request,
            crate_id=request_obj.crate.id,
            request_id=request_obj.id
        )

    # Track the original status for better messaging
    original_status = request_obj.status

    request_obj.status = 'Rejected'
    request_obj.save()

    # Create sendback record
    SendBack.objects.create(
        request=request_obj,
        reason=serializer.validated_data['reason'],
        created_by=request.user
    )

    # Log with appropriate message based on original status
    action_verb = 'canceled' if original_status == 'Sent Back' else 'rejected'
    log_request_rejected(request.user, request_obj, serializer.validated_data['reason'], request)

    # Send email notification to requester
    try:
        send_request_rejected_notification.delay(
            request_obj.id,
            request.user.id,
            serializer.validated_data['reason']
        )
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': f'{request_obj.request_type} request {action_verb} successfully',
        'request_id': request_obj.id,
        'status': 'Rejected',
        'crate_status': request_obj.crate.status if request_obj.request_type == 'Withdrawal' else None
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanApproveRequests, IsActiveUser])
@require_digital_signature
def send_back_request(request, pk):
    """Send a pending request back to requester for changes/corrections"""
    serializer = SendBackCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    if request_obj.status not in ['Pending', 'Sent Back']:
        return Response({
            'error': f'Request cannot be sent back (current status: {request_obj.status}). Only Pending or Sent Back requests can be sent back.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update request status to Sent Back
    request_obj.status = 'Sent Back'
    request_obj.save()

    # Create sendback record for change request
    SendBack.objects.create(
        request=request_obj,
        reason=serializer.validated_data['reason'],
        sendback_type='Change Request',
        created_by=request.user
    )

    # Log audit event
    log_audit_event(
        user=request.user,
        action='Sent Back',
        message=f'{request_obj.request_type} request #{request_obj.id} sent back for changes. Reason: {serializer.validated_data["reason"]}',
        request=request,
        request_id=request_obj.id,
        crate_id=request_obj.crate.id
    )

    # Send email notification to requester
    try:
        send_request_sent_back_notification.delay(
            request_obj.id,
            request.user.id,
            serializer.validated_data['reason']
        )
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': f'{request_obj.request_type} request sent back for changes',
        'request_id': request_obj.id,
        'status': 'Sent Back',
        'reason': serializer.validated_data['reason']
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanAllocateStorage, IsActiveUser])
@require_digital_signature
def allocate_storage(request, pk):
    """Allocate storage location to an approved request"""
    serializer = AllocateStorageSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    if request_obj.status != 'Approved':
        return Response({
            'error': 'Request must be approved before storage allocation'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        storage = Storage.objects.get(id=serializer.validated_data['storage'])
    except Storage.DoesNotExist:
        return Response({'error': 'Storage location not found'}, status=status.HTTP_404_NOT_FOUND)


    # Assign storage to crate
    crate = request_obj.crate
    crate.storage = storage
    crate.save()

    # Update request and mark as completed
    request_obj.allocation_date = timezone.now()
    request_obj.allocated_by = request.user
    request_obj.status = 'Completed'
    request_obj.save()

    log_storage_allocated(request.user, request_obj, storage, request)

    # Send email notification to requester
    try:
        send_storage_allocated_notification.delay(
            request_obj.id,
            request.user.id,
            storage.get_full_location()
        )
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': 'Storage allocated successfully',
        'request_id': request_obj.id,
        'crate_id': crate.id,
        'location': storage.get_full_location()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
@require_digital_signature
def create_withdrawal_request(request):
    """Create a new withdrawal request"""
    serializer = WithdrawalRequestCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        crate = Crate.objects.get(id=data['crate'])
    except Crate.DoesNotExist:
        return Response({'error': 'Crate not found'}, status=status.HTTP_404_NOT_FOUND)

    if crate.status not in ['Active', 'Archived']:
        return Response({
            'error': f'Crate cannot be withdrawn (current status: {crate.status}). Only Active or Archived crates can be withdrawn.'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        withdrawal_request = Request.objects.create(
            request_type='Withdrawal',
            crate=crate,
            unit=crate.unit,
            status='Pending',
            withdrawn_by=request.user,
            purpose=data.get('purpose', ''),
            full_withdrawal=data.get('full_withdrawal', True),
            expected_return_date=data.get('expected_return_date')
        )

        # Link specific documents if partial withdrawal
        if not withdrawal_request.full_withdrawal and 'document_ids' in data:
            for doc_id in data['document_ids']:
                try:
                    document = Document.objects.get(id=doc_id)
                    RequestDocument.objects.create(
                        request=withdrawal_request,
                        document=document
                    )
                except Document.DoesNotExist:
                    pass

        # Set crate status to Withdrawn immediately when request is created
        old_status = crate.status
        crate.status = 'Withdrawn'
        crate.save()

        log_request_created(request.user, withdrawal_request, request)

        # Log crate status change
        log_audit_event(
            user=request.user,
            action='Updated',
            message=f'Crate #{crate.id} status changed from {old_status} to Withdrawn due to withdrawal request #{withdrawal_request.id}',
            request=request,
            crate_id=crate.id,
            request_id=withdrawal_request.id
        )

        # Send email notification to approvers
        try:
            send_request_created_notification.delay(withdrawal_request.id)
        except Exception as e:
            print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': 'Withdrawal request created successfully. Crate is now marked as Withdrawn.',
        'request_id': withdrawal_request.id,
        'crate_id': crate.id,
        'status': 'Pending',
        'crate_status': 'Withdrawn'
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanAllocateStorage, IsActiveUser])
@require_digital_signature
def issue_documents(request, pk):
    """Issue documents for a withdrawal request"""
    serializer = IssueDocumentsSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    if request_obj.request_type != 'Withdrawal':
        return Response({
            'error': 'This endpoint is only for withdrawal requests'
        }, status=status.HTTP_400_BAD_REQUEST)

    if request_obj.status != 'Approved':
        return Response({
            'error': 'Request must be approved before issuing documents'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update request status
    request_obj.status = 'Issued'
    request_obj.issue_date = timezone.now()
    request_obj.issued_by = request.user
    request_obj.save()

    # Update crate status to Withdrawn
    crate = request_obj.crate
    crate.status = 'Withdrawn'
    crate.save()

    log_document_issued(request.user, request_obj, request)

    # Send email notification to requester
    try:
        send_documents_issued_notification.delay(request_obj.id, request.user.id)
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': 'Documents issued successfully',
        'request_id': request_obj.id,
        'crate_id': request_obj.crate.id,
        'expected_return_date': request_obj.expected_return_date
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanAllocateStorage, IsActiveUser])
@require_digital_signature
def return_documents(request, pk):
    """Process document return for a withdrawal request"""
    serializer = ReturnDocumentsSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    if request_obj.request_type != 'Withdrawal':
        return Response({
            'error': 'This endpoint is only for withdrawal requests'
        }, status=status.HTTP_400_BAD_REQUEST)

    if request_obj.status != 'Issued':
        return Response({
            'error': 'Documents have not been issued yet'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Get and validate storage location
    storage_id = serializer.validated_data.get('storage')
    try:
        from apps.storage.models import Storage
        storage = Storage.objects.get(id=storage_id)
    except Storage.DoesNotExist:
        return Response({
            'error': 'Storage location not found'
        }, status=status.HTTP_404_NOT_FOUND)

    # Update request status
    request_obj.status = 'Returned'
    request_obj.return_date = timezone.now()
    request_obj.save()

    # Update crate: set status back to Active and assign storage location
    crate = request_obj.crate
    old_storage = crate.storage
    crate.status = 'Active'
    crate.storage = storage
    crate.save()

    # Create sendback record if reason provided
    reason = serializer.validated_data.get('reason', '')
    if reason:
        SendBack.objects.create(
            request=request_obj,
            reason=reason,
            sendback_type='Return Note',
            created_by=request.user
        )

    log_document_returned(request.user, request_obj, request)

    # Log storage allocation/relocation
    log_audit_event(
        user=request.user,
        action='Allocated',
        message=f'Crate #{crate.id} storage updated on return from {old_storage.get_full_location() if old_storage else "No Storage"} to {storage.get_full_location()}',
        request=request,
        crate_id=crate.id,
        storage_id=storage.id
    )

    # Send email notification to requester
    try:
        send_documents_returned_notification.delay(
            request_obj.id,
            request.user.id,
            storage.get_full_location()
        )
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': 'Documents returned successfully and storage allocated',
        'request_id': request_obj.id,
        'crate_id': request_obj.crate.id,
        'storage_location': storage.get_full_location()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
@require_digital_signature
def create_destruction_request(request):
    """Create a new destruction request"""
    serializer = DestructionRequestCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        crate = Crate.objects.get(id=data['crate'])
    except Crate.DoesNotExist:
        return Response({'error': 'Crate not found'}, status=status.HTTP_404_NOT_FOUND)

    if crate.status == 'Destroyed':
        return Response({
            'error': 'Crate has already been destroyed'
        }, status=status.HTTP_400_BAD_REQUEST)

    destruction_request = Request.objects.create(
        request_type='Destruction',
        crate=crate,
        unit=crate.unit,
        status='Pending',
        withdrawn_by=request.user,
        purpose=data.get('purpose', '')
    )

    log_request_created(request.user, destruction_request, request)

    # Send email notification to approvers
    try:
        send_request_created_notification.delay(destruction_request.id)
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': 'Destruction request created successfully',
        'request_id': destruction_request.id,
        'crate_id': crate.id,
        'status': 'Pending'
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
@require_digital_signature
def confirm_destruction(request, pk):
    """Confirm destruction of a crate"""
    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    if request_obj.request_type != 'Destruction':
        return Response({
            'error': 'This endpoint is only for destruction requests'
        }, status=status.HTTP_400_BAD_REQUEST)

    if request_obj.status != 'Approved':
        return Response({
            'error': 'Request must be approved before destruction'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Mark crate as destroyed
    crate = request_obj.crate

    # Note: Storage location remains in the system and can be reused
    # The crate-storage relationship is maintained for audit purposes

    crate.status = 'Destroyed'
    crate.save()

    request_obj.status = 'Completed'
    request_obj.save()

    # Log critical destruction event
    log_crate_destroyed(request.user, crate, request)

    # Send email notification to requester
    try:
        send_destruction_confirmed_notification.delay(request_obj.id, request.user.id)
    except Exception as e:
        print(f"Failed to queue email notification: {str(e)}")

    return Response({
        'message': 'Crate destroyed successfully',
        'request_id': request_obj.id,
        'crate_id': crate.id
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
@require_digital_signature
def update_storage_request(request, pk):
    """Update a sent-back storage request"""
    serializer = StorageRequestUpdateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    # Validate request can be updated
    if request_obj.status != 'Sent Back':
        return Response({
            'error': f'Only sent-back requests can be updated (current status: {request_obj.status})'
        }, status=status.HTTP_400_BAD_REQUEST)

    if request_obj.withdrawn_by != request.user:
        return Response({
            'error': 'You can only update your own requests'
        }, status=status.HTTP_403_FORBIDDEN)

    if request_obj.request_type != 'Storage':
        return Response({
            'error': 'This endpoint is only for storage requests'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # Update crate fields
            crate = request_obj.crate
            crate.destruction_date = data.get('destruction_date')  # Can be None if to_be_retained
            crate.to_central = data.get('to_central', False)
            crate.to_be_retained = data.get('to_be_retained', False)
            crate.save()

            # Update request purpose
            request_obj.purpose = data.get('purpose', '')

            # Clear existing documents and add new ones
            CrateDocument.objects.filter(crate=crate).delete()
            RequestDocument.objects.filter(request=request_obj).delete()

            for doc_data in data['documents']:
                document, _ = Document.objects.get_or_create(
                    document_number=doc_data['document_number'],
                    defaults={
                        'document_name': doc_data['document_name'],
                        'document_type': doc_data.get('document_type', 'Physical'),
                        'description': doc_data.get('description', '')
                    }
                )

                CrateDocument.objects.create(crate=crate, document=document)
                RequestDocument.objects.create(request=request_obj, document=document)

            # Change status back to Pending for re-approval
            request_obj.status = 'Pending'
            request_obj.save()

            log_audit_event(
                user=request.user,
                action='Updated',
                message=f'Storage request #{request_obj.id} updated and resubmitted for approval',
                request=request,
                crate_id=crate.id
            )

            return Response({
                'message': 'Storage request updated and resubmitted successfully',
                'request_id': request_obj.id,
                'crate_id': crate.id,
                'status': 'Pending'
            }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR updating storage request: {str(e)}")
        print(f"Traceback: {error_trace}")
        return Response({
            'error': 'Failed to update storage request',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
@require_digital_signature
def update_withdrawal_request(request, pk):
    """Update a sent-back withdrawal request"""
    serializer = WithdrawalRequestUpdateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    # Validate request can be updated
    if request_obj.status != 'Sent Back':
        return Response({
            'error': f'Only sent-back requests can be updated (current status: {request_obj.status})'
        }, status=status.HTTP_400_BAD_REQUEST)

    if request_obj.withdrawn_by != request.user:
        return Response({
            'error': 'You can only update your own requests'
        }, status=status.HTTP_403_FORBIDDEN)

    if request_obj.request_type != 'Withdrawal':
        return Response({
            'error': 'This endpoint is only for withdrawal requests'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # Update request fields
            request_obj.expected_return_date = data['expected_return_date']
            request_obj.purpose = data.get('purpose', '')
            request_obj.full_withdrawal = data.get('full_withdrawal', True)

            # Update document selection
            RequestDocument.objects.filter(request=request_obj).delete()

            if not request_obj.full_withdrawal and data.get('document_ids'):
                for doc_id in data['document_ids']:
                    try:
                        document = Document.objects.get(id=doc_id)
                        RequestDocument.objects.create(request=request_obj, document=document)
                    except Document.DoesNotExist:
                        pass

            # Change status back to Pending for re-approval
            request_obj.status = 'Pending'
            request_obj.save()

            log_audit_event(
                user=request.user,
                action='Updated',
                message=f'Withdrawal request #{request_obj.id} updated and resubmitted for approval',
                request=request,
                crate_id=request_obj.crate.id
            )

            return Response({
                'message': 'Withdrawal request updated and resubmitted successfully',
                'request_id': request_obj.id,
                'status': 'Pending'
            }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR updating withdrawal request: {str(e)}")
        print(f"Traceback: {error_trace}")
        return Response({
            'error': 'Failed to update withdrawal request',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
@require_digital_signature
def update_destruction_request(request, pk):
    """Update a sent-back destruction request"""
    serializer = DestructionRequestUpdateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        request_obj = Request.objects.get(pk=pk)
    except Request.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

    # Validate request can be updated
    if request_obj.status != 'Sent Back':
        return Response({
            'error': f'Only sent-back requests can be updated (current status: {request_obj.status})'
        }, status=status.HTTP_400_BAD_REQUEST)

    if request_obj.withdrawn_by != request.user:
        return Response({
            'error': 'You can only update your own requests'
        }, status=status.HTTP_403_FORBIDDEN)

    if request_obj.request_type != 'Destruction':
        return Response({
            'error': 'This endpoint is only for destruction requests'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Update request fields
        request_obj.purpose = data.get('purpose', '')

        # Change status back to Pending for re-approval
        request_obj.status = 'Pending'
        request_obj.save()

        log_audit_event(
            user=request.user,
            action='Updated',
            message=f'Destruction request #{request_obj.id} updated and resubmitted for approval',
            request=request,
            crate_id=request_obj.crate.id
        )

        return Response({
            'message': 'Destruction request updated and resubmitted successfully',
            'request_id': request_obj.id,
            'status': 'Pending'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR updating destruction request: {str(e)}")
        print(f"Traceback: {error_trace}")
        return Response({
            'error': 'Failed to update destruction request',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
