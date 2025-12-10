from django.contrib import admin
from .models import AuditTrail


@admin.register(AuditTrail)
class AuditTrailAdmin(admin.ModelAdmin):
    """
    CRITICAL: Read-only admin for Audit Trail
    No modifications allowed - 21 CFR Part 11 compliance
    """
    list_display = ('id', 'action_time', 'user', 'action', 'get_short_message', 'request_id', 'crate_id')
    list_filter = ('action', 'action_time', 'user')
    search_fields = ('message', 'user__username', 'request_id', 'crate_id')
    readonly_fields = ('action_time', 'action', 'user', 'request_id', 'storage_id', 
                      'crate_id', 'document_id', 'message', 'ip_address', 'user_agent')
    ordering = ('-action_time',)
    
    def get_short_message(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    get_short_message.short_description = 'Message'
    
    def has_add_permission(self, request):
        """Prevent manual creation through admin"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent modifications"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletions"""
        return False
