# Cipla DMS - Test Plan

## Overview
This document outlines the test plan for the Cipla Document Management System (DMS) including all notification features.

## Test Environment Setup

### Prerequisites
1. Python 3.10+
2. Node.js 18+
3. Redis (for Celery and WebSockets)
4. PostgreSQL (production) or SQLite (development)

### Setup Commands
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser

# Frontend setup
cd frontend
npm install

# Start Redis (required for Celery)
redis-server

# Start Celery worker (for async email tasks)
cd backend
celery -A config worker -l info

# Start Celery beat (for scheduled reminders)
celery -A config beat -l info
```

## Test Categories

### 1. Email Notification Tests

#### 1.1 Request Notifications
| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| EN-001 | Create storage request | Approvers receive email notification |
| EN-002 | Approve storage request | Requester receives approval email |
| EN-003 | Reject storage request | Requester receives rejection email with reason |
| EN-004 | Send back storage request | Requester receives revision email with reason |
| EN-005 | Allocate storage | Requester receives allocation email |
| EN-006 | Create withdrawal request | Approvers receive email notification |
| EN-007 | Issue documents | Requester receives issuance email |
| EN-008 | Return documents | Requester receives return confirmation email |
| EN-009 | Create destruction request | Approvers receive email notification |
| EN-010 | Confirm destruction | Requester receives destruction confirmation email |

#### 1.2 Reminder Notifications
| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| ER-001 | Return reminder at 10 days | User receives reminder email |
| ER-002 | Return reminder at 5 days | User receives reminder email |
| ER-003 | Return reminder at 3 days | User receives reminder email |
| ER-004 | Return reminder at 2 days | User receives reminder email |
| ER-005 | Return reminder at 1 day | User receives URGENT reminder email |
| ER-006 | Overdue return notification | User receives OVERDUE alert email |
| ER-007 | Destruction reminder at 10 days | Store heads receive reminder |
| ER-008 | Destruction reminder at 1 day | Store heads receive URGENT reminder |

#### 1.3 User Account Notifications
| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| EU-001 | Create new user | User receives welcome email with temp password |
| EU-002 | Reset user password | User receives password reset email |
| EU-003 | Lock user account | User receives account locked notification |

### 2. API Endpoint Tests

#### 2.1 Authentication Endpoints
```bash
# Test login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'

# Test current user
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer <token>"
```

#### 2.2 Request Endpoints
```bash
# Create storage request
curl -X POST http://localhost:8000/api/requests/storage/create/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "unit": 1,
    "department": 1,
    "destruction_date": "2030-12-31",
    "documents": [{"document_number": "DOC001", "document_name": "Test Doc"}]
  }'
```

### 3. Celery Task Tests

#### 3.1 Manual Task Execution
```python
# In Django shell
from apps.notifications.tasks import send_return_reminders, send_destruction_reminders

# Test return reminders
result = send_return_reminders()
print(f"Sent {result} return reminders")

# Test destruction reminders
result = send_destruction_reminders()
print(f"Sent {result} destruction reminders")
```

### 4. Integration Tests

#### 4.1 Run Django Tests
```bash
cd backend
python manage.py test apps.notifications -v 2
python manage.py test apps.requests -v 2
python manage.py test apps.auth -v 2
```

#### 4.2 Run All Tests
```bash
python manage.py test --verbosity=2
```

## Test Results Template

### Test Execution Record
| Date | Tester | Test Category | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| YYYY-MM-DD | Name | EN-001 to EN-010 | PASS/FAIL | |
| YYYY-MM-DD | Name | ER-001 to ER-008 | PASS/FAIL | |
| YYYY-MM-DD | Name | EU-001 to EU-003 | PASS/FAIL | |

## Email Configuration Verification

### SMTP Settings Checklist
- [ ] EMAIL_HOST configured in environment
- [ ] EMAIL_PORT configured (default: 587)
- [ ] EMAIL_USE_TLS enabled (default: True)
- [ ] EMAIL_HOST_USER configured
- [ ] EMAIL_HOST_PASSWORD configured
- [ ] DEFAULT_FROM_EMAIL configured
- [ ] EMAIL_ENABLED set to True

### Test Email Configuration
```python
# In Django shell
from django.core.mail import send_mail
send_mail(
    'Test Subject',
    'Test message body.',
    'noreply@cipla.com',
    ['test@example.com'],
    fail_silently=False,
)
```

## Performance Tests

### Load Testing
1. Create 100 concurrent users
2. Submit 50 simultaneous requests
3. Monitor email queue processing time
4. Verify all emails are sent within 5 minutes

### Stress Testing
1. Submit 1000 requests in rapid succession
2. Verify Celery queue doesn't overflow
3. Monitor memory usage
4. Check for any dropped emails

## Security Tests

### Email Security
- [ ] No sensitive data in email subject lines
- [ ] Temporary passwords only sent via email once
- [ ] Email links point to correct application URL
- [ ] No PII in email logs
