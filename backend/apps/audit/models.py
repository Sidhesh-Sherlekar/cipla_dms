from django.db import models
from apps.auth.models import User
from apps.storage.models import Storage


class AuditTrail(models.Model):
    """
    CRITICAL: Immutable Audit Trail Model
    
    This model is compliant with 21 CFR Part 11 requirements.
    Once created, records CANNOT be modified or deleted.
    Database triggers enforce immutability at the PostgreSQL level.
    
    All user actions must be logged here for regulatory compliance.
    """
    id = models.AutoField(primary_key=True)
    action_time = models.DateTimeField(auto_now_add=True, editable=False)
    action = models.CharField(
        max_length=255,
        choices=[
            ('Created', 'Created'),
            ('Updated', 'Updated'),
            ('Deleted', 'Deleted'),
            ('Viewed', 'Viewed'),
            ('Approved', 'Approved'),
            ('Rejected', 'Rejected'),
            ('Issued', 'Issued'),
            ('Returned', 'Returned'),
            ('Allocated', 'Allocated'),
            ('Login', 'Login'),
            ('LoginFailed', 'LoginFailed'),
            ('Logout', 'Logout'),
            ('SessionTimeout', 'SessionTimeout'),
            ('SessionTerminated', 'SessionTerminated'),
        ],
        editable=False
    )
    user = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, editable=False)
    attempted_username = models.CharField(max_length=150, blank=True, editable=False)  # Username at time of action
    
    # Optional foreign keys to track what was affected
    request_id = models.IntegerField(null=True, blank=True, editable=False)
    storage_id = models.IntegerField(null=True, blank=True, editable=False)
    crate_id = models.IntegerField(null=True, blank=True, editable=False)
    document_id = models.IntegerField(null=True, blank=True, editable=False)
    
    message = models.TextField(editable=False)  # Details of what changed
    ip_address = models.GenericIPAddressField(null=True, blank=True, editable=False)
    user_agent = models.CharField(max_length=500, blank=True, editable=False)
    
    class Meta:
        db_table = 'audit_trail'
        verbose_name = 'Audit Trail'
        verbose_name_plural = 'Audit Trails'
        # Prevent any modifications through Django admin or ORM
        permissions = []
        indexes = [
            models.Index(fields=['action_time']),
            models.Index(fields=['user']),
            models.Index(fields=['action']),
            models.Index(fields=['request_id']),
        ]
        # Ordering by most recent first
        ordering = ['-action_time']

    def __str__(self):
        username = self.user.username if self.user else self.attempted_username or 'Unknown'
        return f"[{self.action_time}] {username} - {self.action}: {self.message[:50]}"
    
    def save(self, *args, **kwargs):
        """
        Override save to prevent updates
        Only allow creation (when pk is None)
        """
        if self.pk is not None:
            raise ValueError("Audit trail records cannot be modified once created (21 CFR Part 11 compliance)")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """
        Override delete to prevent deletion
        """
        raise ValueError("Audit trail records cannot be deleted (21 CFR Part 11 compliance)")
