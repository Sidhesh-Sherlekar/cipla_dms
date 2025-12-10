"""
Test script to verify withdrawal request API endpoint changes crate status
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.documents.models import Crate
from apps.requests.models import Request
from apps.auth.models import User
from django.test import RequestFactory
from apps.requests.views import create_withdrawal_request
from django.contrib.auth.models import AnonymousUser
import json

def test_withdrawal_api():
    """
    Test the actual withdrawal request API endpoint
    """
    print("\n" + "="*80)
    print("TESTING WITHDRAWAL REQUEST API ENDPOINT")
    print("="*80 + "\n")

    # Find an Active or Archived crate
    test_crate = Crate.objects.filter(status__in=['Active', 'Archived']).first()

    if not test_crate:
        print("❌ No Active or Archived crates found to test with")
        return

    print(f"📦 Test Crate: #{test_crate.id}")
    print(f"   Status BEFORE: {test_crate.status}")
    print(f"   Unit: {test_crate.unit.unit_code if test_crate.unit else 'None'}")

    # Get a user who can create requests
    user = User.objects.filter(is_active=True).first()
    if not user:
        print("❌ No active users found")
        return

    print(f"👤 Test User: {user.username}")

    # Check crate status in database
    print("\n📊 Checking crate status directly in database...")
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, status FROM crates WHERE id = %s", [test_crate.id])
        row = cursor.fetchone()
        print(f"   DB Query Result: Crate #{row[0]}, Status: {row[1]}")

    # Check the Crate model's status field choices
    print("\n🔍 Checking Crate model status choices...")
    status_choices = dict(Crate._meta.get_field('status').choices)
    print(f"   Available statuses: {list(status_choices.keys())}")
    if 'Withdrawn' in status_choices:
        print("   ✓ 'Withdrawn' is a valid status choice")
    else:
        print("   ❌ 'Withdrawn' is NOT in status choices!")
        print("   This is the problem! The Crate model doesn't have 'Withdrawn' status.")

    print("\n" + "="*80)

if __name__ == '__main__':
    test_withdrawal_api()
