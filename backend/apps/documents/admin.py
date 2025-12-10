from django.contrib import admin
from .models import Document, Crate, CrateDocument


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'document_number', 'document_name', 'document_type', 'created_at')
    list_filter = ('document_type', 'created_at')
    search_fields = ('document_number', 'document_name')


@admin.register(Crate)
class CrateAdmin(admin.ModelAdmin):
    list_display = ('id', 'unit', 'status', 'destruction_date', 'storage', 'created_by', 'creation_date')
    list_filter = ('status', 'unit', 'destruction_date')
    search_fields = ('id',)
    raw_id_fields = ('created_by', 'storage')
    readonly_fields = ('creation_date', 'created_by')
    
    def get_document_count(self, obj):
        return obj.get_document_count()
    get_document_count.short_description = 'Documents'


@admin.register(CrateDocument)
class CrateDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'crate', 'document', 'added_at')
    list_filter = ('added_at',)
    search_fields = ('crate__id', 'document__document_number')
    raw_id_fields = ('crate', 'document')
