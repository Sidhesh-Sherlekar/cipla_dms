from django.contrib import admin
from .models import Storage


@admin.register(Storage)
class StorageAdmin(admin.ModelAdmin):
    list_display = ('id', 'unit', 'room_name', 'rack_name', 'compartment_name', 'shelf_name', 'get_full_location')
    list_filter = ('unit', 'room_name')
    search_fields = ('room_name', 'rack_name', 'compartment_name', 'shelf_name')

    def get_full_location(self, obj):
        return obj.get_full_location()
    get_full_location.short_description = 'Full Location'
