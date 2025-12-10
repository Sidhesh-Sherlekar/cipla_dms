"""
Barcode API Views

Provides endpoints for barcode generation, scanning, and crate lookup.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Q, Prefetch

from .models import Crate
from apps.requests.models import Request
from .barcode_utils import (
    generate_barcode_image,
    generate_barcode_base64,
    generate_qr_code_base64,
    generate_printable_label,
    parse_barcode,
    validate_barcode_format
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scan_barcode(request):
    """
    Scan/lookup barcode and return crate information with all related requests.

    GET /api/documents/barcode/scan/?barcode=UNIT-CRATE-ID

    Returns:
    {
        "crate": {crate_details},
        "requests": [{request_details}],
        "current_request": {active_request} or null,
        "history": [{historical_requests}]
    }
    """
    barcode_value = request.query_params.get('barcode', '').strip()

    if not barcode_value:
        return Response(
            {'error': 'Barcode parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Normalize the barcode input (remove spaces from department name part)
    # This helps match barcodes where department names had spaces removed
    if '/' in barcode_value:
        parts = barcode_value.split('/')
        if len(parts) == 4:
            # Clean department name the same way as in save()
            parts[1] = parts[1].replace(' ', '').replace('-', '')[:10]
            barcode_value = '/'.join(parts)

    # Validate barcode format
    if not validate_barcode_format(barcode_value):
        return Response(
            {'error': 'Invalid barcode format. Expected: UNIT/DEPT/YEAR/NUMBER (e.g., MFG01/QC/2025/00001)'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find crate by barcode (case-insensitive search)
    try:
        crate = Crate.objects.select_related(
            'unit', 'department', 'storage', 'storage__unit', 'created_by'
        ).prefetch_related(
            'documents'
        ).get(barcode__iexact=barcode_value)
    except Crate.DoesNotExist:
        # Try to find similar barcodes to help the user
        similar_crates = Crate.objects.filter(
            barcode__icontains=barcode_value[:10]  # Search by first 10 chars
        ).values_list('barcode', flat=True)[:5]

        error_message = f'No crate found with barcode: {barcode_value}'
        if similar_crates:
            similar_list = ', '.join(similar_crates)
            error_message += f'. Did you mean one of these? {similar_list}'

        return Response(
            {'error': error_message},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get all requests related to this crate
    requests = Request.objects.filter(crate=crate).select_related(
        'unit',
        'approved_by',
        'allocated_by',
        'withdrawn_by',
        'issued_by'
    ).order_by('-request_date')

    # Separate current request from history
    current_request = None
    historical_requests = []

    for req in requests:
        if req.status in ['Pending', 'Approved', 'Issued']:
            current_request = req
        else:
            historical_requests.append(req)

    # Serialize crate data
    from .serializers import CrateSerializer
    from apps.requests.serializers import RequestSerializer

    crate_data = CrateSerializer(crate).data
    current_request_data = RequestSerializer(current_request).data if current_request else None
    historical_requests_data = RequestSerializer(historical_requests, many=True).data

    # Add barcode image
    crate_data['barcode_image'] = generate_barcode_base64(barcode_value, format='svg')
    crate_data['qr_code'] = generate_qr_code_base64(barcode_value)

    # Audit logging
    from apps.audit.utils import log_audit_event
    log_audit_event(
        user=request.user,
        action='Scanned',
        message=f'Barcode scanned: {barcode_value} for Crate #{crate.id}',
        request=request
    )

    return Response({
        'crate': crate_data,
        'current_request': current_request_data,
        'history': historical_requests_data,
        'total_requests': len(requests)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_barcode(request, crate_id):
    """
    Generate barcode image for a specific crate.

    GET /api/documents/crates/{crate_id}/barcode/?format=svg|png

    Returns barcode image file.
    """
    crate = get_object_or_404(Crate, pk=crate_id)

    format_type = request.query_params.get('format', 'svg').lower()

    if format_type not in ['svg', 'png']:
        return Response(
            {'error': 'Invalid format. Use "svg" or "png"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    image_bytes, mime_type = generate_barcode_image(crate.barcode, format=format_type)

    if not image_bytes:
        return Response(
            {'error': 'Failed to generate barcode image'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    response = HttpResponse(image_bytes, content_type=mime_type)
    response['Content-Disposition'] = f'inline; filename="crate_{crate.id}_barcode.{format_type}"'

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_barcode_base64_view(request, crate_id):
    """
    Generate barcode as base64 string for embedding.

    GET /api/documents/crates/{crate_id}/barcode/base64/?format=svg|png

    Returns:
    {
        "barcode": "data:image/svg+xml;base64,...",
        "qr_code": "data:image/png;base64,...",
        "crate_id": 123,
        "barcode_value": "UNIT-CRATE-20250112-000123"
    }
    """
    crate = get_object_or_404(Crate, pk=crate_id)

    format_type = request.query_params.get('format', 'svg').lower()

    if format_type not in ['svg', 'png']:
        return Response(
            {'error': 'Invalid format. Use "svg" or "png"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    barcode_b64 = generate_barcode_base64(crate.barcode, format=format_type)
    qr_code_b64 = generate_qr_code_base64(crate.barcode)

    if not barcode_b64:
        return Response(
            {'error': 'Failed to generate barcode'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response({
        'barcode': barcode_b64,
        'qr_code': qr_code_b64,
        'crate_id': crate.id,
        'barcode_value': crate.barcode
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def print_label(request, crate_id):
    """
    Generate printable label with barcode for a crate.

    GET /api/documents/crates/{crate_id}/print-label/

    Returns HTML page for printing.
    """
    crate = get_object_or_404(
        Crate.objects.select_related('unit', 'department', 'storage'),
        pk=crate_id
    )

    storage_location = None
    if crate.storage:
        storage_location = crate.storage.get_full_location()

    html = generate_printable_label(
        crate_id=crate.id,
        barcode_value=crate.barcode,
        unit_name=f"{crate.unit.unit_code} - {crate.unit.unit_name}",
        destruction_date=crate.destruction_date.strftime('%Y-%m-%d'),
        storage_location=storage_location
    )

    return HttpResponse(html, content_type='text/html')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_by_barcode(request):
    """
    Search for crates by partial barcode match.

    GET /api/documents/barcode/search/?q=UNIT-CRATE

    Returns list of matching crates.
    """
    query = request.query_params.get('q', '').strip()

    if not query or len(query) < 3:
        return Response(
            {'error': 'Query must be at least 3 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Search crates with barcode containing query
    crates = Crate.objects.filter(
        barcode__icontains=query
    ).select_related('unit', 'department', 'storage')[:20]  # Limit to 20 results

    from .serializers import CrateSerializer
    results = CrateSerializer(crates, many=True).data

    return Response({
        'count': len(results),
        'results': results
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_barcode_view(request):
    """
    Validate barcode format and check if it exists.

    GET /api/documents/barcode/validate/?barcode=UNIT-CRATE-ID

    Returns:
    {
        "valid": true/false,
        "exists": true/false,
        "message": "...",
        "parsed": {parsed_data} or null
    }
    """
    barcode_value = request.query_params.get('barcode', '').strip()

    if not barcode_value:
        return Response(
            {'error': 'Barcode parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate format
    is_valid = validate_barcode_format(barcode_value)

    response_data = {
        'valid': is_valid,
        'exists': False,
        'message': '',
        'parsed': None
    }

    if not is_valid:
        response_data['message'] = 'Invalid barcode format. Expected: UNIT/DEPT/YEAR/NUMBER (e.g., MFG01/QC/2025/00001)'
        return Response(response_data)

    # Parse barcode
    parsed = parse_barcode(barcode_value)
    response_data['parsed'] = parsed

    # Check if exists (case-insensitive)
    exists = Crate.objects.filter(barcode__iexact=barcode_value).exists()
    response_data['exists'] = exists

    if exists:
        response_data['message'] = 'Barcode exists in system'
    else:
        response_data['message'] = 'Barcode does not exist in system'

    return Response(response_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_crate_requests_by_barcode(request):
    """
    Get all requests for a crate identified by barcode.

    GET /api/documents/barcode/requests/?barcode=UNIT-CRATE-ID

    Returns list of all requests for the crate.
    """
    barcode_value = request.query_params.get('barcode', '').strip()

    if not barcode_value:
        return Response(
            {'error': 'Barcode parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        crate = Crate.objects.get(barcode__iexact=barcode_value)
    except Crate.DoesNotExist:
        return Response(
            {'error': f'No crate found with barcode: {barcode_value}'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get all requests
    requests = Request.objects.filter(crate=crate).select_related(
        'unit',
        'approved_by',
        'allocated_by',
        'withdrawn_by',
        'issued_by'
    ).order_by('-request_date')

    from apps.requests.serializers import RequestSerializer
    requests_data = RequestSerializer(requests, many=True).data

    return Response({
        'crate_id': crate.id,
        'barcode': barcode_value,
        'count': len(requests_data),
        'requests': requests_data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_print_labels(request):
    """
    Generate bulk printable labels for multiple crates.

    POST /api/documents/barcode/bulk-print/
    {
        "crate_ids": [1, 2, 3, 4, 5]
    }

    Returns HTML with all labels for printing.
    """
    crate_ids = request.data.get('crate_ids', [])

    if not crate_ids or not isinstance(crate_ids, list):
        return Response(
            {'error': 'crate_ids must be a non-empty array'},
            status=status.HTTP_400_BAD_REQUEST
        )

    crates = Crate.objects.filter(
        id__in=crate_ids
    ).select_related('unit', 'department', 'storage')

    if not crates.exists():
        return Response(
            {'error': 'No crates found with provided IDs'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Generate labels for all crates
    labels_html = []

    for crate in crates:
        storage_location = None
        if crate.storage:
            storage_location = crate.storage.get_full_location()

        label_html = generate_printable_label(
            crate_id=crate.id,
            barcode_value=crate.barcode,
            unit_name=f"{crate.unit.unit_code} - {crate.unit.unit_name}",
            destruction_date=crate.destruction_date.strftime('%Y-%m-%d'),
            storage_location=storage_location
        )

        labels_html.append(label_html)

    # Combine all labels with page breaks
    combined_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Bulk Crate Labels</title>
        <style>
            .page-break {
                page-break-after: always;
            }
        </style>
    </head>
    <body>
    """ + "\n<div class='page-break'></div>\n".join(labels_html) + """
    </body>
    </html>
    """

    # Audit logging
    from apps.audit.utils import log_audit_event
    log_audit_event(
        user=request.user,
        action='Printed',
        message=f'Bulk printed {len(crates)} crate labels',
        request=request
    )

    return HttpResponse(combined_html, content_type='text/html')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_recent_barcodes(request):
    """
    List recent crates with their barcodes for debugging.

    GET /api/documents/barcode/debug/recent/?limit=20

    Returns list of recent crates with their barcode format.
    """
    limit = int(request.query_params.get('limit', 20))
    unit_filter = request.query_params.get('unit', None)

    # Get recent crates
    crates = Crate.objects.select_related(
        'unit', 'department'
    ).order_by('-creation_date')

    # Filter by unit if specified
    if unit_filter:
        crates = crates.filter(unit__unit_code__iexact=unit_filter)

    # Filter by user's unit if not admin
    elif request.user.unit:
        crates = crates.filter(unit=request.user.unit)

    crates = crates[:limit]

    results = []
    for crate in crates:
        results.append({
            'id': crate.id,
            'barcode': crate.barcode,
            'unit': crate.unit.unit_code,
            'department': crate.department.department_name,
            'status': crate.status,
            'creation_date': crate.creation_date,
            'has_requests': crate.requests.exists()
        })

    return Response({
        'count': len(results),
        'results': results
    })
