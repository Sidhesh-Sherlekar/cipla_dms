from django.contrib import admin
from .models import Request, RequestDocument, SendBack


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'request_type', 'crate', 'unit', 'status', 'withdrawn_by', 'request_date')
    list_filter = ('request_type', 'status', 'unit', 'request_date')
    search_fields = ('id', 'crate__id', 'purpose')
    raw_id_fields = ('crate', 'withdrawn_by', 'approved_by', 'allocated_by', 'issued_by')
    readonly_fields = ('request_date', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('request_type', 'crate', 'unit', 'purpose', 'status')
        }),
        ('Withdrawal Details', {
            'fields': ('withdrawn_by', 'full_withdrawal', 'expected_return_date', 'issue_date', 'return_date'),
            'classes': ('collapse',)
        }),
        ('Approval & Allocation', {
            'fields': ('approved_by', 'approval_date', 'allocated_by', 'allocation_date', 'issued_by'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('request_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(RequestDocument)
class RequestDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'request', 'document', 'added_at')
    list_filter = ('added_at',)
    search_fields = ('request__id', 'document__document_number')
    raw_id_fields = ('request', 'document')


@admin.register(SendBack)
class SendBackAdmin(admin.ModelAdmin):
    list_display = ('id', 'request', 'created_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('request__id', 'reason')
    raw_id_fields = ('request', 'created_by')
    readonly_fields = ('created_at',)
