"""
Celery Configuration for Cipla DMS

This module configures Celery for asynchronous task processing including:
- Email notifications
- Scheduled reminders
- Background jobs
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('cipla_dms')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule for periodic tasks
app.conf.beat_schedule = {
    # Check for overdue returns and send reminders daily at 8:00 AM
    'send-return-reminders-daily': {
        'task': 'apps.notifications.tasks.send_return_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    # Check for upcoming destruction dates and send reminders daily at 9:00 AM
    'send-destruction-reminders-daily': {
        'task': 'apps.notifications.tasks.send_destruction_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
}

app.conf.timezone = 'UTC'


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
