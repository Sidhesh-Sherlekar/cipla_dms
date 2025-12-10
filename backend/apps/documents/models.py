from django.db import models
from django.db.models import Max
from apps.auth.models import User, Unit, Department, Section
from apps.storage.models import Storage


class Document(models.Model):
    """
    Document model for tracking physical and digital documents
    """
    id = models.AutoField(primary_key=True)
    document_name = models.CharField(max_length=255)
    document_number = models.CharField(max_length=100, unique=True)
    document_type = models.CharField(
        max_length=100,
        choices=[
            ('Physical', 'Physical'),
            ('Digital', 'Digital')
        ],
        default='Physical'
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        indexes = [
            models.Index(fields=['document_number']),
            models.Index(fields=['document_type']),
        ]

    def __str__(self):
        return f"{self.document_number} - {self.document_name}"


class Crate(models.Model):
    """
    Crate model for storing multiple documents together
    Each crate has a destruction date and tracks its lifecycle
    Includes barcode for easy scanning and tracking
    Barcode Format: [unit_code]/[dept_name]/[year]/[number]
    Example: MFG01/QC/2025/00001
    """
    id = models.AutoField(primary_key=True)
    barcode = models.CharField(max_length=100, unique=True, db_index=True, editable=False)
    destruction_date = models.DateField(null=True, blank=True)  # Nullable for retained crates
    creation_date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_crates')
    status = models.CharField(
        max_length=50,
        choices=[
            ('Active', 'Active'),
            ('Withdrawn', 'Withdrawn'),
            ('Archived', 'Archived'),
            ('Destroyed', 'Destroyed')
        ],
        default='Active'
    )
    storage = models.ForeignKey(
        Storage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='crates'
    )
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='crates')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='crates')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='crates', null=True, blank=True)
    documents = models.ManyToManyField(Document, through='CrateDocument')

    # New checkbox fields
    to_central = models.BooleanField(
        default=False,
        help_text='If checked, crate will be sent to central storage instead of unit storage'
    )
    to_be_retained = models.BooleanField(
        default=False,
        help_text='If checked, crate will be retained indefinitely (no destruction date)'
    )

    class Meta:
        db_table = 'crates'
        verbose_name = 'Crate'
        verbose_name_plural = 'Crates'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['destruction_date']),
            models.Index(fields=['unit']),
        ]

    def save(self, *args, **kwargs):
        """
        Override save to generate barcode if not exists
        Barcode Format: [unit_code]/[dept_name]/[section_name]/[year]/[number]
        Example: MFG01/QC/Lab1/2025/00001
        """
        if not self.barcode:
            from django.utils import timezone
            import uuid

            # For new crates, we need to save first to get ID
            if not self.pk:
                # Temporarily set a unique placeholder barcode using UUID
                self.barcode = f"TEMP-{uuid.uuid4().hex}"
                super().save(*args, **kwargs)

                # Now use the actual ID to make it even more unique
                self.barcode = f"TEMP-{self.pk}-{uuid.uuid4().hex[:8]}"

                # Get the current year
                current_year = timezone.now().year

                # Get department name (remove spaces and special characters for barcode)
                dept_name_clean = self.department.department_name.replace(' ', '').replace('-', '')[:10]

                # Get section name (remove spaces and special characters for barcode)
                section_name_clean = ''
                if self.section:
                    section_name_clean = self.section.section_name.replace(' ', '').replace('-', '')[:10]

                # Build barcode prefix based on whether section exists
                if section_name_clean:
                    barcode_prefix = f"{self.unit.unit_code}/{dept_name_clean}/{section_name_clean}/{current_year}"
                else:
                    barcode_prefix = f"{self.unit.unit_code}/{dept_name_clean}/{current_year}"

                # Find the next sequential number for this unit/department/section/year combination
                max_barcode = Crate.objects.filter(
                    unit=self.unit,
                    department=self.department,
                    section=self.section,
                    barcode__startswith=f"{barcode_prefix}/"
                ).exclude(
                    id=self.id  # Exclude current crate
                ).aggregate(
                    Max('barcode')
                )['barcode__max']

                if max_barcode:
                    # Extract the number from the last barcode
                    try:
                        last_number = int(max_barcode.split('/')[-1])
                        next_number = last_number + 1
                    except (ValueError, IndexError):
                        next_number = 1
                else:
                    next_number = 1

                # Generate the new barcode with zero-padded number (5 digits)
                self.barcode = f"{barcode_prefix}/{next_number:05d}"
                kwargs['force_insert'] = False  # Ensure update instead of insert

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Crate {self.id} - {self.unit.unit_code} ({self.status})"

    def get_document_count(self):
        """Returns the number of documents in this crate"""
        return self.documents.count()

    def get_barcode(self):
        """Returns the barcode for this crate"""
        return self.barcode


class CrateDocument(models.Model):
    """
    Junction table between Crate and Document
    Tracks which documents are in which crate
    """
    id = models.AutoField(primary_key=True)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    crate = models.ForeignKey(Crate, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'crate_documents'
        unique_together = ('document', 'crate')
        verbose_name = 'Crate Document'
        verbose_name_plural = 'Crate Documents'

    def __str__(self):
        return f"{self.crate.id} - {self.document.document_number}"
