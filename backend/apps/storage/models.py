from django.db import models
from apps.auth.models import Unit


class Storage(models.Model):
    """
    Storage hierarchy model representing physical storage locations
    Flexible structure: Unit -> Room -> Rack -> Compartment -> Shelf (optional)
    Some units may only have 3 levels (no shelf), others may have all 4 levels
    """
    id = models.AutoField(primary_key=True)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='storages')
    room_name = models.CharField(max_length=100)
    rack_name = models.CharField(max_length=100)
    compartment_name = models.CharField(max_length=100)
    shelf_name = models.CharField(max_length=100, null=True, blank=True)  # Optional for 3-level storage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'storages'
        unique_together = ('unit', 'room_name', 'rack_name', 'compartment_name', 'shelf_name')
        verbose_name = 'Storage'
        verbose_name_plural = 'Storages'
        indexes = [
            models.Index(fields=['unit', 'room_name']),
        ]

    def __str__(self):
        if self.shelf_name:
            return f"{self.unit.unit_code}/{self.room_name}/{self.rack_name}/{self.compartment_name}/{self.shelf_name}"
        return f"{self.unit.unit_code}/{self.room_name}/{self.rack_name}/{self.compartment_name}"

    def get_full_location(self):
        """Returns the full storage location path in compact format"""
        # Compact format: U3-R1-1A1 (unit-room-rack+compartment+shelf)
        if self.shelf_name:
            return f"{self.unit.unit_code}-{self.room_name}-{self.rack_name}{self.compartment_name}{self.shelf_name}"
        return f"{self.unit.unit_code}-{self.room_name}-{self.rack_name}{self.compartment_name}"
