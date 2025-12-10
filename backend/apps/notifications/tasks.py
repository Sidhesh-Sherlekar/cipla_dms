"""
Celery Tasks for Email Notifications

This module contains all Celery tasks for sending emails asynchronously.
"""

import logging
from datetime import timedelta
from celery import shared_task
from django.core.mail import EmailMessage
from django.utils import timezone
from django.conf import settings

from .email_config import get_email_config, is_email_enabled, get_from_email, REMINDER_DAYS
from . import email_templates

logger = logging.getLogger(__name__)


def send_email(subject, html_content, recipient_list, fail_silently=True):
    """
    Send an email using Django's email backend.

    Args:
        subject: Email subject
        html_content: HTML content of the email
        recipient_list: List of recipient email addresses
        fail_silently: Whether to suppress exceptions

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not is_email_enabled():
        logger.warning("Email sending is disabled. Skipping email.")
        return False

    if not recipient_list:
        logger.warning("No recipients specified. Skipping email.")
        return False

    try:
        email = EmailMessage(
            subject=subject,
            body=html_content,
            from_email=get_from_email(),
            to=recipient_list,
        )
        email.content_subtype = 'html'
        email.send(fail_silently=fail_silently)
        logger.info(f"Email sent successfully to {recipient_list}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        if not fail_silently:
            raise
        return False


# ==================== REQUEST NOTIFICATION TASKS ====================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_request_created_notification(self, request_id):
    """Send notification when a new request is created."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'unit', 'withdrawn_by'
        ).get(pk=request_id)

        # Get approvers (Section Heads and Store Heads in the unit)
        approvers = User.objects.filter(
            units=request_obj.unit,
            status='Active',
            role__role_name__in=['Section Head', 'Store Head', 'System Admin']
        ).values_list('email', flat=True)

        approver_emails = list(filter(None, approvers))

        if not approver_emails:
            logger.warning(f"No approvers found for request {request_id}")
            return False

        html_content = email_templates.request_created_template(
            request_type=request_obj.request_type,
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            requester_name=request_obj.withdrawn_by.full_name if request_obj.withdrawn_by else "Unknown",
            unit_name=request_obj.unit.unit_name if request_obj.unit else "Unknown",
            purpose=request_obj.purpose or ""
        )

        return send_email(
            subject=f"[Cipla DMS] New {request_obj.request_type} Request #{request_id}",
            html_content=html_content,
            recipient_list=approver_emails
        )

    except Exception as e:
        logger.error(f"Error sending request created notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_request_approved_notification(self, request_id, approver_id):
    """Send notification when a request is approved."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'withdrawn_by', 'approved_by'
        ).get(pk=request_id)

        approver = User.objects.get(pk=approver_id)

        # Notify the requester
        recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
        if not recipient_email:
            logger.warning(f"No requester email for request {request_id}")
            return False

        html_content = email_templates.request_approved_template(
            request_type=request_obj.request_type,
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            approver_name=approver.full_name,
            requester_name=request_obj.withdrawn_by.full_name
        )

        return send_email(
            subject=f"[Cipla DMS] {request_obj.request_type} Request #{request_id} Approved",
            html_content=html_content,
            recipient_list=[recipient_email]
        )

    except Exception as e:
        logger.error(f"Error sending request approved notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_request_rejected_notification(self, request_id, rejector_id, reason=""):
    """Send notification when a request is rejected."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'withdrawn_by'
        ).get(pk=request_id)

        rejector = User.objects.get(pk=rejector_id)

        recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
        if not recipient_email:
            logger.warning(f"No requester email for request {request_id}")
            return False

        html_content = email_templates.request_rejected_template(
            request_type=request_obj.request_type,
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            rejector_name=rejector.full_name,
            requester_name=request_obj.withdrawn_by.full_name,
            reason=reason
        )

        return send_email(
            subject=f"[Cipla DMS] {request_obj.request_type} Request #{request_id} Rejected",
            html_content=html_content,
            recipient_list=[recipient_email]
        )

    except Exception as e:
        logger.error(f"Error sending request rejected notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_request_sent_back_notification(self, request_id, sender_id, reason=""):
    """Send notification when a request is sent back."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'withdrawn_by'
        ).get(pk=request_id)

        sender = User.objects.get(pk=sender_id)

        recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
        if not recipient_email:
            logger.warning(f"No requester email for request {request_id}")
            return False

        html_content = email_templates.request_sent_back_template(
            request_type=request_obj.request_type,
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            sender_name=sender.full_name,
            requester_name=request_obj.withdrawn_by.full_name,
            reason=reason
        )

        return send_email(
            subject=f"[Cipla DMS] {request_obj.request_type} Request #{request_id} Needs Revision",
            html_content=html_content,
            recipient_list=[recipient_email]
        )

    except Exception as e:
        logger.error(f"Error sending request sent back notification: {str(e)}")
        self.retry(exc=e)


# ==================== STORAGE NOTIFICATION TASKS ====================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_storage_allocated_notification(self, request_id, allocator_id, storage_location):
    """Send notification when storage is allocated."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'withdrawn_by'
        ).get(pk=request_id)

        allocator = User.objects.get(pk=allocator_id)

        recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
        if not recipient_email:
            logger.warning(f"No requester email for request {request_id}")
            return False

        html_content = email_templates.storage_allocated_template(
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            storage_location=storage_location,
            allocated_by=allocator.full_name,
            requester_name=request_obj.withdrawn_by.full_name
        )

        return send_email(
            subject=f"[Cipla DMS] Storage Allocated - Request #{request_id}",
            html_content=html_content,
            recipient_list=[recipient_email]
        )

    except Exception as e:
        logger.error(f"Error sending storage allocated notification: {str(e)}")
        self.retry(exc=e)


# ==================== WITHDRAWAL NOTIFICATION TASKS ====================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_documents_issued_notification(self, request_id, issuer_id):
    """Send notification when documents are issued."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'withdrawn_by', 'issued_by'
        ).get(pk=request_id)

        issuer = User.objects.get(pk=issuer_id)

        recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
        if not recipient_email:
            logger.warning(f"No requester email for request {request_id}")
            return False

        expected_return = request_obj.expected_return_date.strftime('%Y-%m-%d') if request_obj.expected_return_date else "Not specified"

        html_content = email_templates.documents_issued_template(
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            issued_by=issuer.full_name,
            requester_name=request_obj.withdrawn_by.full_name,
            expected_return_date=expected_return
        )

        return send_email(
            subject=f"[Cipla DMS] Documents Issued - Request #{request_id}",
            html_content=html_content,
            recipient_list=[recipient_email]
        )

    except Exception as e:
        logger.error(f"Error sending documents issued notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_documents_returned_notification(self, request_id, receiver_id, storage_location):
    """Send notification when documents are returned."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'withdrawn_by'
        ).get(pk=request_id)

        receiver = User.objects.get(pk=receiver_id)

        recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
        if not recipient_email:
            logger.warning(f"No requester email for request {request_id}")
            return False

        html_content = email_templates.documents_returned_template(
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            returned_to=receiver.full_name,
            storage_location=storage_location,
            requester_name=request_obj.withdrawn_by.full_name
        )

        return send_email(
            subject=f"[Cipla DMS] Documents Returned - Request #{request_id}",
            html_content=html_content,
            recipient_list=[recipient_email]
        )

    except Exception as e:
        logger.error(f"Error sending documents returned notification: {str(e)}")
        self.retry(exc=e)


# ==================== DESTRUCTION NOTIFICATION TASKS ====================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_destruction_confirmed_notification(self, request_id, destroyer_id):
    """Send notification when crate destruction is confirmed."""
    try:
        from apps.requests.models import Request
        from apps.auth.models import User

        request_obj = Request.objects.select_related(
            'crate', 'withdrawn_by'
        ).get(pk=request_id)

        destroyer = User.objects.get(pk=destroyer_id)

        recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
        if not recipient_email:
            logger.warning(f"No requester email for request {request_id}")
            return False

        html_content = email_templates.destruction_confirmed_template(
            request_id=request_obj.id,
            crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
            destroyed_by=destroyer.full_name,
            requester_name=request_obj.withdrawn_by.full_name
        )

        return send_email(
            subject=f"[Cipla DMS] Destruction Confirmed - Request #{request_id}",
            html_content=html_content,
            recipient_list=[recipient_email]
        )

    except Exception as e:
        logger.error(f"Error sending destruction confirmed notification: {str(e)}")
        self.retry(exc=e)


# ==================== REMINDER TASKS (SCHEDULED) ====================

@shared_task
def send_return_reminders():
    """
    Send reminders for upcoming return dates.
    This task runs daily and checks for returns due in REMINDER_DAYS (10, 5, 3, 2, 1).
    """
    from apps.requests.models import Request

    now = timezone.now()
    reminders_sent = 0

    # Get all issued withdrawal requests
    issued_requests = Request.objects.filter(
        request_type='Withdrawal',
        status='Issued',
        expected_return_date__isnull=False
    ).select_related('crate', 'withdrawn_by')

    for request_obj in issued_requests:
        if not request_obj.expected_return_date:
            continue

        days_until_due = (request_obj.expected_return_date.date() - now.date()).days

        # Send reminders for configured days and overdue
        if days_until_due in REMINDER_DAYS or days_until_due < 0:
            recipient_email = request_obj.withdrawn_by.email if request_obj.withdrawn_by else None
            if not recipient_email:
                continue

            expected_return = request_obj.expected_return_date.strftime('%Y-%m-%d')

            if days_until_due < 0:
                # Overdue
                html_content = email_templates.overdue_return_template(
                    request_id=request_obj.id,
                    crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
                    requester_name=request_obj.withdrawn_by.full_name,
                    expected_return_date=expected_return,
                    days_overdue=abs(days_until_due)
                )
                subject = f"[Cipla DMS] OVERDUE - Request #{request_obj.id}"
            else:
                # Reminder
                html_content = email_templates.return_reminder_template(
                    request_id=request_obj.id,
                    crate_barcode=request_obj.crate.barcode if request_obj.crate else "N/A",
                    requester_name=request_obj.withdrawn_by.full_name,
                    expected_return_date=expected_return,
                    days_remaining=days_until_due
                )
                subject = f"[Cipla DMS] Return Reminder - {days_until_due} Day(s) Left - Request #{request_obj.id}"

            if send_email(subject, html_content, [recipient_email]):
                reminders_sent += 1

    logger.info(f"Sent {reminders_sent} return reminders")
    return reminders_sent


@shared_task
def send_destruction_reminders():
    """
    Send reminders for upcoming destruction dates.
    This task runs daily and checks for destructions due in REMINDER_DAYS (10, 5, 3, 2, 1).
    """
    from apps.documents.models import Crate
    from apps.auth.models import User

    now = timezone.now()
    reminders_sent = 0

    # Get crates with upcoming destruction dates
    crates = Crate.objects.filter(
        status='Active',
        destruction_date__isnull=False,
        to_be_retained=False
    ).select_related('unit', 'department')

    for crate in crates:
        if not crate.destruction_date:
            continue

        days_until_destruction = (crate.destruction_date - now.date()).days

        # Send reminders for configured days
        if days_until_destruction in REMINDER_DAYS:
            # Get Store Heads and Section Heads for the unit
            recipients = User.objects.filter(
                units=crate.unit,
                status='Active',
                role__role_name__in=['Section Head', 'Store Head', 'System Admin']
            ).values_list('email', flat=True)

            recipient_emails = list(filter(None, recipients))
            if not recipient_emails:
                continue

            html_content = email_templates.destruction_reminder_template(
                crate_barcode=crate.barcode,
                destruction_date=crate.destruction_date.strftime('%Y-%m-%d'),
                days_remaining=days_until_destruction,
                unit_name=crate.unit.unit_name if crate.unit else "Unknown",
                department_name=crate.department.department_name if crate.department else "Unknown"
            )

            subject = f"[Cipla DMS] Destruction Reminder - {days_until_destruction} Day(s) - Crate {crate.barcode}"

            if send_email(subject, html_content, recipient_emails):
                reminders_sent += 1

    logger.info(f"Sent {reminders_sent} destruction reminders")
    return reminders_sent


# ==================== USER NOTIFICATION TASKS ====================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_user_created_notification(self, user_id, temp_password):
    """Send notification when a new user account is created."""
    try:
        from apps.auth.models import User

        user = User.objects.select_related('role').get(pk=user_id)

        if not user.email:
            logger.warning(f"No email for user {user_id}")
            return False

        html_content = email_templates.user_account_created_template(
            username=user.username,
            temp_password=temp_password,
            full_name=user.full_name,
            role_name=user.role.role_name if user.role else "User"
        )

        return send_email(
            subject=f"[Cipla DMS] Welcome - Your Account Has Been Created",
            html_content=html_content,
            recipient_list=[user.email]
        )

    except Exception as e:
        logger.error(f"Error sending user created notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_notification(self, user_id, new_password):
    """Send notification when a user's password is reset."""
    try:
        from apps.auth.models import User

        user = User.objects.get(pk=user_id)

        if not user.email:
            logger.warning(f"No email for user {user_id}")
            return False

        html_content = email_templates.password_reset_template(
            username=user.username,
            new_password=new_password,
            full_name=user.full_name
        )

        return send_email(
            subject=f"[Cipla DMS] Password Reset Notification",
            html_content=html_content,
            recipient_list=[user.email]
        )

    except Exception as e:
        logger.error(f"Error sending password reset notification: {str(e)}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_account_locked_notification(self, user_id, reason="Too many failed login attempts"):
    """Send notification when a user account is locked."""
    try:
        from apps.auth.models import User

        user = User.objects.get(pk=user_id)

        if not user.email:
            logger.warning(f"No email for user {user_id}")
            return False

        html_content = email_templates.account_locked_template(
            username=user.username,
            full_name=user.full_name,
            reason=reason
        )

        return send_email(
            subject=f"[Cipla DMS] Account Locked",
            html_content=html_content,
            recipient_list=[user.email]
        )

    except Exception as e:
        logger.error(f"Error sending account locked notification: {str(e)}")
        self.retry(exc=e)
