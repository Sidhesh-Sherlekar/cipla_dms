from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.documents.views import DocumentViewSet, CrateViewSet
from apps.documents import barcode_views

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'crates', CrateViewSet, basename='crate')

urlpatterns = [
    path('', include(router.urls)),

    # Barcode endpoints
    path('barcode/scan/', barcode_views.scan_barcode, name='barcode_scan'),
    path('barcode/search/', barcode_views.search_by_barcode, name='barcode_search'),
    path('barcode/validate/', barcode_views.validate_barcode_view, name='barcode_validate'),
    path('barcode/requests/', barcode_views.get_crate_requests_by_barcode, name='barcode_requests'),
    path('barcode/bulk-print/', barcode_views.bulk_print_labels, name='barcode_bulk_print'),
    path('barcode/debug/recent/', barcode_views.list_recent_barcodes, name='barcode_debug_recent'),

    # Crate-specific barcode endpoints
    path('crates/<int:crate_id>/barcode/', barcode_views.generate_barcode, name='crate_barcode'),
    path('crates/<int:crate_id>/barcode/base64/', barcode_views.generate_barcode_base64_view, name='crate_barcode_base64'),
    path('crates/<int:crate_id>/print-label/', barcode_views.print_label, name='crate_print_label'),
]
