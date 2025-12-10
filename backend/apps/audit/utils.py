"""
Audit Trail Logging Utilities

CRITICAL: All user actions must be logged for 21 CFR Part 11 compliance.
These utilities create immutable audit trail entries.
"""

from apps.audit.models import AuditTrail
from apps.auth.request_utils import get_client_ip, get_user_agent
import logging

logger = logging.getLogger('apps.audit')


def log_audit_event(user, action, message, request=None, request_id=None,
                   storage_id=None, crate_id=None, document_id=None,
                   attempted_username=None):
    """
    Create an immutable audit trail entry.

    Once created, this record CANNOT be modified or deleted.

    Args:
        user: User object who performed the action (can be None for login failures)
        action: Action type (Created, Updated, Deleted, Viewed, Approved, etc.)
        message: Detailed message about what changed
        request: Django/DRF request object (optional, for IP/user agent)
        request_id: Request model ID (optional)
        storage_id: Storage model ID (optional)
        crate_id: Crate model ID (optional)
        document_id: Document model ID (optional)
        attempted_username: Username attempted during login (for failed logins)

    Returns:
        AuditTrail object
    """
    ip_address = None
    user_agent = None

    if request:
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)

    try:
        # Determine the username to record in audit trail
        # For normal actions: use user.username
        # For login failures (user=None): use attempted_username parameter
        username_to_record = user.username if user else (attempted_username or '')

        audit_entry = AuditTrail.objects.create(
            user=user,
            attempted_username=username_to_record,
            action=action,
            request_id=request_id,
            storage_id=storage_id,
            crate_id=crate_id,
            document_id=document_id,
            message=message,
            ip_address=ip_address,
            user_agent=user_agent
        )

        username = user.username if user else attempted_username or 'Unknown'
        logger.info(
            f'[AUDIT] {action} by {username} (IP: {ip_address}): {message}'
        )

        return audit_entry

    except Exception as e:
        logger.error(f'Failed to create audit entry: {str(e)}')
        raise


def log_request_created(user, request_obj, django_request=None):
    """Log when a request is created"""
    return log_audit_event(
        user=user,
        action='Created',
        message=f'{request_obj.request_type} request #{request_obj.id} created for Crate #{request_obj.crate.id}',
        request=django_request,
        request_id=request_obj.id,
        crate_id=request_obj.crate.id
    )


def log_request_approved(user, request_obj, django_request=None):
    """Log when a request is approved"""
    return log_audit_event(
        user=user,
        action='Approved',
        message=f'{request_obj.request_type} request #{request_obj.id} approved by {user.full_name}',
        request=django_request,
        request_id=request_obj.id,
        crate_id=request_obj.crate.id
    )


def log_request_rejected(user, request_obj, reason, django_request=None):
    """Log when a request is rejected"""
    return log_audit_event(
        user=user,
        action='Rejected',
        message=f'{request_obj.request_type} request #{request_obj.id} rejected. Reason: {reason}',
        request=django_request,
        request_id=request_obj.id,
        crate_id=request_obj.crate.id
    )


def log_storage_allocated(user, request_obj, storage, django_request=None):
    """Log when storage is allocated"""
    return log_audit_event(
        user=user,
        action='Allocated',
        message=f'Storage allocated for Crate #{request_obj.crate.id}: {storage.get_full_location()}',
        request=django_request,
        request_id=request_obj.id,
        storage_id=storage.id,
        crate_id=request_obj.crate.id
    )


def log_document_issued(user, request_obj, django_request=None):
    """Log when documents are issued"""
    return log_audit_event(
        user=user,
        action='Issued',
        message=f'Documents from Crate #{request_obj.crate.id} issued to {request_obj.withdrawn_by.full_name}',
        request=django_request,
        request_id=request_obj.id,
        crate_id=request_obj.crate.id
    )


def log_document_returned(user, request_obj, django_request=None):
    """Log when documents are returned"""
    return log_audit_event(
        user=user,
        action='Returned',
        message=f'Documents from Crate #{request_obj.crate.id} returned',
        request=django_request,
        request_id=request_obj.id,
        crate_id=request_obj.crate.id
    )


def log_crate_destroyed(user, crate, django_request=None):
    """Log when a crate is destroyed (CRITICAL - permanent record)"""
    return log_audit_event(
        user=user,
        action='Deleted',
        message=f'Crate #{crate.id} with {crate.get_document_count()} documents permanently destroyed',
        request=django_request,
        crate_id=crate.id
    )


def log_login_success(user, django_request=None):
    """Log successful user login"""
    return log_audit_event(
        user=user,
        action='Login',
        message=f'User {user.username} ({user.full_name}) logged in successfully',
        request=django_request
    )


def log_login_failed(user, reason, django_request=None, attempted_username=None):
    """
    Log failed login attempt

    Args:
        user: User object if exists, None for non-existent users
        reason: Reason for login failure (e.g., 'Invalid password', 'Account locked', 'User not found')
        django_request: Django/DRF request object
        attempted_username: Username that was attempted (for non-existent users)
    """
    if user:
        message = f'Failed login attempt for user {user.username} ({user.full_name}). Reason: {reason}'
        username_for_audit = None
    else:
        message = f'Failed login attempt for username "{attempted_username}". Reason: {reason}'
        username_for_audit = attempted_username

    return log_audit_event(
        user=user,
        action='LoginFailed',
        message=message,
        request=django_request,
        attempted_username=username_for_audit
    )


def log_logout(user, django_request=None):
    """Log user logout"""
    return log_audit_event(
        user=user,
        action='Logout',
        message=f'User {user.username} ({user.full_name}) logged out',
        request=django_request
    )


def log_session_timeout(user, django_request=None):
    """Log session timeout due to inactivity"""
    return log_audit_event(
        user=user,
        action='SessionTimeout',
        message=f'Session timeout for user {user.username} ({user.full_name}) due to inactivity',
        request=django_request
    )


def log_session_terminated(user, reason='Tab/window closed', django_request=None):
    """Log session termination (e.g., tab closed, browser closed)"""
    return log_audit_event(
        user=user,
        action='SessionTerminated',
        message=f'Session terminated for user {user.username} ({user.full_name}). Reason: {reason}',
        request=django_request
    )
