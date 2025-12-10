# Email Notifications System

## Overview

The Cipla DMS includes a comprehensive email notification system that keeps users informed about:
- Request lifecycle events (creation, approval, rejection, etc.)
- Document return reminders (at 10, 5, 3, 2, 1 days before due date)
- Destruction schedule reminders
- User account events (creation, password reset, account lock)

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│  Django Views   │────▶│   Celery    │────▶│  SMTP Server│
│  (Trigger)      │     │   Worker    │     │  (Email)    │
└─────────────────┘     └─────────────┘     └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │    Redis    │
                        │  (Broker)   │
                        └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │ Celery Beat │
                        │ (Scheduler) │
                        └─────────────┘
```

## Configuration

### Environment Variables

```bash
# SMTP Server Configuration
EMAIL_HOST=smtp.gmail.com          # SMTP server hostname
EMAIL_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
EMAIL_USE_TLS=True                 # Enable TLS encryption
EMAIL_USE_SSL=False                # Enable SSL (mutually exclusive with TLS)
EMAIL_HOST_USER=your-email@domain.com  # SMTP username
EMAIL_HOST_PASSWORD=your-password  # SMTP password or app-specific password

# Display Settings
DEFAULT_FROM_EMAIL=Cipla DMS <noreply@cipla.com>
EMAIL_FROM_NAME=Cipla DMS
EMAIL_FROM_ADDRESS=noreply@cipla.com

# Feature Toggle
EMAIL_ENABLED=True                 # Enable/disable all email notifications

# Application URL (for links in emails)
APP_BASE_URL=https://dms.cipla.com
```

### Django Settings (backend/config/settings.py)

```python
# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Cipla DMS <noreply@cipla.com>')
EMAIL_ENABLED = config('EMAIL_ENABLED', default=True, cast=bool)
```

### Code Configuration (apps/notifications/email_config.py)

If you prefer to set defaults in code rather than environment variables:

```python
FALLBACK_CONFIG = {
    'EMAIL_HOST': 'smtp.gmail.com',
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_HOST_USER': 'your-email@gmail.com',
    'EMAIL_HOST_PASSWORD': 'your-app-password',
    'EMAIL_FROM_NAME': 'Cipla DMS',
    'EMAIL_FROM_ADDRESS': 'noreply@cipla.com',
    'EMAIL_ENABLED': True,
}
```

## Email Types

### 1. Request Notifications

| Event | Recipients | Trigger |
|-------|------------|---------|
| Request Created | Approvers (Section/Store Heads) | Any request creation |
| Request Approved | Requester | Approval action |
| Request Rejected | Requester | Rejection action |
| Request Sent Back | Requester | Send back action |
| Storage Allocated | Requester | Storage allocation |
| Documents Issued | Requester | Document issuance |
| Documents Returned | Requester | Document return |
| Destruction Confirmed | Requester | Destruction confirmation |

### 2. Reminder Notifications

| Reminder | Days Before | Recipients |
|----------|-------------|------------|
| Return Reminder | 10, 5, 3, 2, 1 | Document borrower |
| Overdue Alert | -1 (overdue) | Document borrower |
| Destruction Reminder | 10, 5, 3, 2, 1 | Section/Store Heads |

### 3. User Account Notifications

| Event | Recipients | Trigger |
|-------|------------|---------|
| Account Created | New user | User creation |
| Password Reset | User | Admin password reset |
| Account Locked | User | Account lockout |

## Celery Tasks

### Async Email Tasks

Located in `apps/notifications/tasks.py`:

```python
# Request notifications
send_request_created_notification(request_id)
send_request_approved_notification(request_id, approver_id)
send_request_rejected_notification(request_id, rejector_id, reason)
send_request_sent_back_notification(request_id, sender_id, reason)
send_storage_allocated_notification(request_id, allocator_id, storage_location)
send_documents_issued_notification(request_id, issuer_id)
send_documents_returned_notification(request_id, receiver_id, storage_location)
send_destruction_confirmed_notification(request_id, destroyer_id)

# Scheduled reminders
send_return_reminders()  # Daily at 8:00 AM UTC
send_destruction_reminders()  # Daily at 9:00 AM UTC

# User notifications
send_user_created_notification(user_id, temp_password)
send_password_reset_notification(user_id, new_password)
send_account_locked_notification(user_id, reason)
```

### Celery Beat Schedule

Defined in `config/celery.py`:

```python
app.conf.beat_schedule = {
    'send-return-reminders-daily': {
        'task': 'apps.notifications.tasks.send_return_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    'send-destruction-reminders-daily': {
        'task': 'apps.notifications.tasks.send_destruction_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
}
```

## Email Templates

All email templates are HTML-formatted and located in `apps/notifications/email_templates.py`.

### Template Features
- Professional HTML styling
- Responsive design
- Cipla DMS branding
- Clear action buttons
- Alert boxes for urgency levels
- Detailed request information tables

### Available Templates
- `request_created_template()`
- `request_approved_template()`
- `request_rejected_template()`
- `request_sent_back_template()`
- `storage_allocated_template()`
- `documents_issued_template()`
- `documents_returned_template()`
- `return_reminder_template()`
- `overdue_return_template()`
- `destruction_confirmed_template()`
- `destruction_reminder_template()`
- `user_account_created_template()`
- `password_reset_template()`
- `account_locked_template()`

## Running the System

### Development

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Django
cd backend
python manage.py runserver

# Terminal 3: Celery Worker
cd backend
celery -A config worker -l info

# Terminal 4: Celery Beat (for scheduled tasks)
cd backend
celery -A config beat -l info
```

### Production (Docker)

```bash
docker-compose -f docker-compose.production.yml up -d
```

Services included:
- `celery` - Worker for processing email tasks
- `celery-beat` - Scheduler for daily reminders

## Testing Email Configuration

### Test SMTP Connection

```python
# In Django shell (python manage.py shell)
from django.core.mail import send_mail

send_mail(
    'Test Subject',
    'Test message body.',
    'noreply@cipla.com',
    ['your-email@example.com'],
    fail_silently=False,
)
```

### Test Notification Task

```python
# In Django shell
from apps.notifications.tasks import send_user_created_notification

# Synchronous execution for testing
send_user_created_notification(user_id=1, temp_password='TempPass123')
```

### Test Reminder Tasks

```python
# In Django shell
from apps.notifications.tasks import send_return_reminders, send_destruction_reminders

# Run immediately for testing
result = send_return_reminders()
print(f"Sent {result} return reminders")

result = send_destruction_reminders()
print(f"Sent {result} destruction reminders")
```

## Troubleshooting

### Emails Not Sending

1. **Check email configuration:**
   ```python
   from apps.notifications.email_config import get_email_config, is_email_enabled
   print(get_email_config())
   print(f"Email enabled: {is_email_enabled()}")
   ```

2. **Check Celery worker is running:**
   ```bash
   celery -A config inspect active
   ```

3. **Check Redis connection:**
   ```bash
   redis-cli ping
   ```

4. **Check email backend:**
   - For Gmail, ensure "Less secure apps" or App Passwords are configured
   - For corporate SMTP, verify firewall rules

### Reminders Not Firing

1. **Ensure Celery Beat is running:**
   ```bash
   ps aux | grep celery
   ```

2. **Check scheduled tasks:**
   ```python
   from config.celery import app
   print(app.conf.beat_schedule)
   ```

3. **Verify timezone settings:**
   - Reminders run at 8:00 AM and 9:00 AM UTC
   - Adjust `CELERY_TIMEZONE` if needed

## Security Considerations

- Never log email passwords
- Use app-specific passwords for Gmail
- Temporary passwords are sent only once via email
- Email content avoids sensitive data in subject lines
- Links point to the configured `APP_BASE_URL`
