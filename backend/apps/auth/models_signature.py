"""
Digital Signature Model for 21 CFR Part 11 Compliance

This module implements electronic signatures with:
- Cryptographic binding to signed data
- Two-factor authentication (username + password)
- Tamper-evident storage
- Complete audit trail
- Non-repudiation
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import hashlib
import json

User = get_user_model()


class DigitalSignature(models.Model):
    """
    Electronic Signature Model - 21 CFR Part 11 Compliant

    Each signature captures:
    1. Signer identity (unique user ID + full name + role)
    2. Authentication (password verification at time of signing)
    3. Timestamp (exact date and time)
    4. Purpose (action being signed: Approved, Rejected, Acknowledged, etc.)
    5. Data binding (cryptographic hash of signed data)
    6. Context (what record was signed)
    """

    # Signature Types
    SIGNATURE_TYPES = [
        ('APPROVE', 'Approved'),
        ('REJECT', 'Rejected'),
        ('ACKNOWLEDGE', 'Acknowledged'),
        ('CREATE', 'Created'),
        ('ALLOCATE', 'Allocated'),
        ('ISSUE', 'Issued'),
        ('RETURN', 'Returned'),
        ('DESTROY', 'Destroyed'),
        ('MODIFY', 'Modified'),
        ('REVIEW', 'Reviewed'),
    ]

    # Signer Information (stored at time of signing - immutable)
    signer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,  # NEVER delete signatures, even if user is deleted
        related_name='digital_signatures'
    )
    signer_username = models.CharField(max_length=150)  # Stored separately for permanence
    signer_full_name = models.CharField(max_length=255)
    signer_role = models.CharField(max_length=100)  # Role at time of signing
    signer_email = models.EmailField()

    # Authentication Proof
    # Password is verified at signing but NOT stored (only verification timestamp)
    password_verified_at = models.DateTimeField(auto_now_add=True)
    authentication_method = models.CharField(
        max_length=50,
        default='PASSWORD',
        choices=[('PASSWORD', 'Password'), ('CERTIFICATE', 'Certificate')]
    )

    # Signature Details
    signature_type = models.CharField(max_length=20, choices=SIGNATURE_TYPES)
    signature_purpose = models.TextField()  # Detailed reason/purpose
    signature_timestamp = models.DateTimeField(auto_now_add=True)

    # Signed Record Context (polymorphic - can sign any model)
    signed_model = models.CharField(max_length=100)  # Model name (e.g., 'Request', 'Crate')
    signed_record_id = models.IntegerField()  # Primary key of signed record
    signed_record_description = models.TextField()  # Human-readable description

    # Cryptographic Binding (ensures tamper detection)
    data_hash = models.CharField(max_length=64, unique=True)  # SHA-256 hash of signed data
    signature_data = models.JSONField()  # Complete snapshot of signed record
    signature_hash = models.CharField(max_length=64, unique=True)  # Hash of entire signature

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Compliance Fields
    is_valid = models.BooleanField(default=True)  # Can be invalidated if tampering detected
    invalidation_reason = models.TextField(blank=True)
    invalidated_at = models.DateTimeField(null=True, blank=True)
    invalidated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='invalidated_signatures',
        null=True,
        blank=True
    )

    # Linked to audit trail entry
    audit_trail_id = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'digital_signatures'
        ordering = ['-signature_timestamp']
        indexes = [
            models.Index(fields=['signer', 'signature_timestamp']),
            models.Index(fields=['signed_model', 'signed_record_id']),
            models.Index(fields=['signature_type']),
            models.Index(fields=['data_hash']),
        ]
        # Prevent modification after creation
        permissions = [
            ('view_all_signatures', 'Can view all digital signatures'),
            ('invalidate_signature', 'Can invalidate signatures (QA only)'),
        ]

    def __str__(self):
        return f"{self.signature_type} by {self.signer_full_name} on {self.signature_timestamp.strftime('%Y-%m-%d %H:%M:%S')}"

    def save(self, *args, **kwargs):
        """
        Override save to ensure signature immutability and generate hashes
        """
        if self.pk:  # If already exists (update attempt)
            raise ValueError("Digital signatures are immutable and cannot be modified after creation")

        # Generate signature hash (hash of all signature fields)
        signature_string = f"{self.signer_username}|{self.signer_full_name}|{self.signer_role}|" \
                          f"{self.signature_type}|{self.signature_timestamp}|{self.signed_model}|" \
                          f"{self.signed_record_id}|{self.data_hash}"
        self.signature_hash = hashlib.sha256(signature_string.encode()).hexdigest()

        super().save(*args, **kwargs)

    @staticmethod
    def create_signature(user, signature_type, purpose, signed_model, signed_record_id,
                        signed_data, description, request=None):
        """
        Create a new digital signature

        Args:
            user: User object (already authenticated)
            signature_type: Type of signature (APPROVE, REJECT, etc.)
            purpose: Detailed purpose/reason for signature
            signed_model: Model name being signed
            signed_record_id: Record ID being signed
            signed_data: Dictionary of data being signed
            description: Human-readable description
            request: HTTP request object (for IP, user agent)

        Returns:
            DigitalSignature object
        """
        # Generate cryptographic hash of signed data
        data_string = json.dumps(signed_data, sort_keys=True)
        data_hash = hashlib.sha256(data_string.encode()).hexdigest()

        # Create signature
        signature = DigitalSignature(
            signer=user,
            signer_username=user.username,
            signer_full_name=user.full_name,
            signer_role=user.role.role_name if user.role else 'No Role',
            signer_email=user.email,
            signature_type=signature_type,
            signature_purpose=purpose,
            signed_model=signed_model,
            signed_record_id=signed_record_id,
            signed_record_description=description,
            data_hash=data_hash,
            signature_data=signed_data,
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if request else '',
        )

        signature.save()
        return signature

    def verify_integrity(self):
        """
        Verify that the signature has not been tampered with

        Returns:
            tuple: (is_valid, message)
        """
        # Recalculate data hash
        data_string = json.dumps(self.signature_data, sort_keys=True)
        calculated_hash = hashlib.sha256(data_string.encode()).hexdigest()

        if calculated_hash != self.data_hash:
            return False, "Data hash mismatch - signature data has been tampered with"

        # Recalculate signature hash
        signature_string = f"{self.signer_username}|{self.signer_full_name}|{self.signer_role}|" \
                          f"{self.signature_type}|{self.signature_timestamp}|{self.signed_model}|" \
                          f"{self.signed_record_id}|{self.data_hash}"
        calculated_sig_hash = hashlib.sha256(signature_string.encode()).hexdigest()

        if calculated_sig_hash != self.signature_hash:
            return False, "Signature hash mismatch - signature has been altered"

        if not self.is_valid:
            return False, f"Signature invalidated: {self.invalidation_reason}"

        return True, "Signature is valid and intact"

    def get_signature_display(self):
        """
        Get formatted signature for display

        Returns:
            dict: Formatted signature information
        """
        return {
            'id': self.id,
            'signer': {
                'username': self.signer_username,
                'full_name': self.signer_full_name,
                'role': self.signer_role,
                'email': self.signer_email,
            },
            'action': self.get_signature_type_display(),
            'purpose': self.signature_purpose,
            'timestamp': self.signature_timestamp.strftime('%Y-%m-%d %H:%M:%S %Z'),
            'signed_record': {
                'model': self.signed_model,
                'id': self.signed_record_id,
                'description': self.signed_record_description,
            },
            'authentication': {
                'method': self.authentication_method,
                'verified_at': self.password_verified_at.strftime('%Y-%m-%d %H:%M:%S %Z'),
            },
            'integrity': {
                'data_hash': self.data_hash,
                'signature_hash': self.signature_hash,
                'is_valid': self.is_valid,
            },
            'metadata': {
                'ip_address': self.ip_address,
                'user_agent': self.user_agent[:100] if self.user_agent else None,
            }
        }


class SignatureHistory(models.Model):
    """
    Track all signature verification attempts and integrity checks
    """
    signature = models.ForeignKey(
        DigitalSignature,
        on_delete=models.CASCADE,
        related_name='verification_history'
    )
    verified_by = models.ForeignKey(User, on_delete=models.PROTECT)
    verification_timestamp = models.DateTimeField(auto_now_add=True)
    verification_result = models.BooleanField()
    verification_message = models.TextField()

    class Meta:
        db_table = 'signature_verification_history'
        ordering = ['-verification_timestamp']
