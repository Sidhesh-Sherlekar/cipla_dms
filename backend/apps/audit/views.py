from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from apps.audit.models import AuditTrail
from apps.audit.serializers import AuditTrailSerializer
from apps.auth.permissions import IsActiveUser
from datetime import datetime


class AuditTrailPagination(PageNumberPagination):
    """Custom pagination class for audit trail"""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def list_audit_trail(request):
    """
    List audit trail entries with filtering and pagination

    Query parameters:
    - action: Filter by action type (Created, Updated, Deleted, etc.)
    - user_id: Filter by user ID
    - request_id: Filter by request ID
    - date_from: Filter entries from this date (YYYY-MM-DD)
    - date_to: Filter entries until this date (YYYY-MM-DD)
    - search: Search in username, user full name, user email, action, message, crate_id, request_id
    - page: Page number (default: 1)
    - page_size: Number of items per page (default: 50, max: 100)
    """
    # Start with all entries, ordered by latest first
    queryset = AuditTrail.objects.all().select_related('user').order_by('-action_time')

    # Apply search filter
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(user__username__icontains=search) |
            Q(user__full_name__icontains=search) |
            Q(user__email__icontains=search) |
            Q(action__icontains=search) |
            Q(message__icontains=search) |
            Q(crate_id__icontains=search) |
            Q(request_id__icontains=search) |
            Q(attempted_username__icontains=search)
        )

    # Apply action filter
    action = request.query_params.get('action')
    if action:
        queryset = queryset.filter(action=action)

    # Apply user filter
    user_id = request.query_params.get('user_id')
    if user_id:
        queryset = queryset.filter(user_id=user_id)

    # Apply request filter
    request_id = request.query_params.get('request_id')
    if request_id:
        queryset = queryset.filter(request_id=request_id)

    # Apply date range filters
    date_from = request.query_params.get('date_from')
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
            queryset = queryset.filter(action_time__gte=date_from_obj)
        except ValueError:
            pass

    date_to = request.query_params.get('date_to')
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
            queryset = queryset.filter(action_time__lte=date_to_obj)
        except ValueError:
            pass

    # Apply pagination
    paginator = AuditTrailPagination()
    paginated_queryset = paginator.paginate_queryset(queryset, request)

    # Serialize the paginated data
    serializer = AuditTrailSerializer(paginated_queryset, many=True)

    # Return paginated response
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def get_audit_entry(request, pk):
    """Get a specific audit trail entry by ID"""
    try:
        audit_entry = AuditTrail.objects.select_related('user').get(pk=pk)
        serializer = AuditTrailSerializer(audit_entry)
        return Response(serializer.data)
    except AuditTrail.DoesNotExist:
        return Response({'error': 'Audit entry not found'}, status=404)
