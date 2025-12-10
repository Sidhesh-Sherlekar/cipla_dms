from django.db import models
from apps.auth.models import User, Unit
from apps.documents.models import Crate, Document


class Request(models.Model):
    """
    Request model for Storage, Withdrawal, and Destruction workflows
    Implements full lifecycle tracking with audit trail
    """
    id = models.AutoField(primary_key=True)
    request_type = models.CharField(
        max_length=50,
        choices=[
            ('Storage', 'Storage'),
            ('Withdrawal', 'Withdrawal'),
            ('Destruction', 'Destruction')
        ]
    )
    crate = models.ForeignKey(Crate, on_delete=models.CASCADE, related_name='requests')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='requests')
    request_date = models.DateTimeField(auto_now_add=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    issue_date = models.DateTimeField(null=True, blank=True)
    return_date = models.DateTimeField(null=True, blank=True)
    expected_return_date = models.DateTimeField(null=True, blank=True)
    
    # User relationships
    approved_by = models.ForeignKey(
        User,
        related_name='approved_requests',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    allocation_date = models.DateTimeField(null=True, blank=True)
    allocated_by = models.ForeignKey(
        User,
        related_name='allocated_requests',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=50,
        choices=[
            ('Pending', 'Pending'),
            ('Sent Back', 'Sent Back'),
            ('Approved', 'Approved'),
            ('Issued', 'Issued'),
            ('Returned', 'Returned'),
            ('Rejected', 'Rejected'),
            ('Completed', 'Completed')
        ],
        default='Pending'
    )
    withdrawn_by = models.ForeignKey(
        User,
        related_name='withdrawn_requests',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    purpose = models.TextField(blank=True)
    full_withdrawal = models.BooleanField(default=True)
    issued_by = models.ForeignKey(
        User,
        related_name='issued_requests',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Many-to-many relationship with documents (for partial withdrawals)
    documents = models.ManyToManyField(Document, through='RequestDocument', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'requests'
        verbose_name = 'Request'
        verbose_name_plural = 'Requests'
        indexes = [
            models.Index(fields=['request_type', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['request_date']),
            models.Index(fields=['unit']),
        ]

    def __str__(self):
        return f"{self.request_type} Request {self.id} - {self.status}"
    
    def is_overdue(self):
        """Check if a withdrawal request is overdue"""
        if self.request_type == 'Withdrawal' and self.status == 'Issued':
            from django.utils import timezone
            if self.expected_return_date and timezone.now() > self.expected_return_date:
                return True
        return False


class RequestDocument(models.Model):
    """
    Junction table between Request and Document
    Used for partial withdrawals where only specific documents are requested
    """
    id = models.AutoField(primary_key=True)
    request = models.ForeignKey(Request, on_delete=models.CASCADE)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'request_documents'
        unique_together = ('request', 'document')
        verbose_name = 'Request Document'
        verbose_name_plural = 'Request Documents'

    def __str__(self):
        return f"Request {self.request.id} - Document {self.document.document_number}"


class SendBack(models.Model):
    """
    SendBack model for requesting changes to a request
    Used when an approver sends a request back to the requester for corrections/modifications
    Also used for tracking return acknowledgements when documents are returned
    """
    id = models.AutoField(primary_key=True)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='sendbacks')
    reason = models.TextField(help_text='Reason for sending back or return notes')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_sendbacks',
        null=True
    )
    sendback_type = models.CharField(
        max_length=50,
        choices=[
            ('Change Request', 'Change Request'),
            ('Return Note', 'Return Note')
        ],
        default='Change Request',
        help_text='Type of sendback: Change Request or Return Note'
    )

    class Meta:
        db_table = 'sendbacks'
        verbose_name = 'SendBack'
        verbose_name_plural = 'SendBacks'
        ordering = ['-created_at']

    def __str__(self):
        return f"SendBack ({self.sendback_type}) for Request {self.request.id}"
