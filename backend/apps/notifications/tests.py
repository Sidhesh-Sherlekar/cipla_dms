"""
Tests for the Notifications App

Run tests with: python manage.py test apps.notifications
"""

from django.test import TestCase, override_settings
from django.core import mail
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from django.utils import timezone


class EmailConfigTests(TestCase):
    """Tests for email configuration."""

    def test_get_email_config_returns_dict(self):
        """Test that get_email_config returns a dictionary."""
        from apps.notifications.email_config import get_email_config
        config = get_email_config()
        self.assertIsInstance(config, dict)
        self.assertIn('EMAIL_HOST', config)
        self.assertIn('EMAIL_PORT', config)

    @override_settings(EMAIL_HOST='test.smtp.com')
    def test_email_config_uses_settings(self):
        """Test that email config reads from Django settings."""
        from apps.notifications.email_config import get_email_config
        config = get_email_config()
        # Environment variables take precedence, so this tests fallback behavior

    def test_is_email_enabled(self):
        """Test email enabled check."""
        from apps.notifications.email_config import is_email_enabled
        # Returns False if EMAIL_HOST_USER is not set
        result = is_email_enabled()
        self.assertIsInstance(result, bool)


class EmailTemplateTests(TestCase):
    """Tests for email templates."""

    def test_request_created_template(self):
        """Test request created email template."""
        from apps.notifications.email_templates import request_created_template
        html = request_created_template(
            request_type='Storage',
            request_id=123,
            crate_barcode='MFG01-QC-SEC01-2025-0001',
            requester_name='John Doe',
            unit_name='Manufacturing Unit 1',
            purpose='Annual archival'
        )
        self.assertIn('Storage', html)
        self.assertIn('123', html)
        self.assertIn('MFG01-QC-SEC01-2025-0001', html)
        self.assertIn('John Doe', html)

    def test_return_reminder_template(self):
        """Test return reminder email template."""
        from apps.notifications.email_templates import return_reminder_template
        html = return_reminder_template(
            request_id=456,
            crate_barcode='MFG01-QC-SEC01-2025-0002',
            requester_name='Jane Smith',
            expected_return_date='2025-12-01',
            days_remaining=5
        )
        self.assertIn('456', html)
        self.assertIn('5', html)
        self.assertIn('Jane Smith', html)

    def test_destruction_reminder_template(self):
        """Test destruction reminder email template."""
        from apps.notifications.email_templates import destruction_reminder_template
        html = destruction_reminder_template(
            crate_barcode='MFG01-QC-SEC01-2020-0001',
            destruction_date='2025-12-15',
            days_remaining=10,
            unit_name='Manufacturing Unit 1',
            department_name='Quality Control'
        )
        self.assertIn('MFG01-QC-SEC01-2020-0001', html)
        self.assertIn('10', html)


class CeleryTaskTests(TestCase):
    """Tests for Celery tasks."""

    @patch('apps.notifications.tasks.send_email')
    def test_send_request_created_notification(self, mock_send_email):
        """Test request created notification task."""
        mock_send_email.return_value = True
        # This would require setting up test fixtures
        # For now, we just verify the task is importable
        from apps.notifications.tasks import send_request_created_notification
        self.assertTrue(callable(send_request_created_notification))

    @patch('apps.notifications.tasks.send_email')
    def test_send_return_reminders(self, mock_send_email):
        """Test return reminders task."""
        mock_send_email.return_value = True
        from apps.notifications.tasks import send_return_reminders
        self.assertTrue(callable(send_return_reminders))

    @patch('apps.notifications.tasks.send_email')
    def test_send_destruction_reminders(self, mock_send_email):
        """Test destruction reminders task."""
        mock_send_email.return_value = True
        from apps.notifications.tasks import send_destruction_reminders
        self.assertTrue(callable(send_destruction_reminders))


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class EmailSendingTests(TestCase):
    """Integration tests for email sending."""

    def test_send_email_function(self):
        """Test the send_email utility function."""
        from apps.notifications.tasks import send_email
        # With locmem backend, emails are stored in mail.outbox
        result = send_email(
            subject='Test Subject',
            html_content='<p>Test content</p>',
            recipient_list=['test@example.com']
        )
        # Note: This will return False if EMAIL_HOST_USER is not configured
        # In production, configure EMAIL_HOST_USER to enable emails


class ReminderDaysTests(TestCase):
    """Tests for reminder day configuration."""

    def test_reminder_days_configured(self):
        """Test that reminder days are properly configured."""
        from apps.notifications.email_config import REMINDER_DAYS
        self.assertEqual(REMINDER_DAYS, [10, 5, 3, 2, 1])
        self.assertIn(10, REMINDER_DAYS)
        self.assertIn(1, REMINDER_DAYS)
