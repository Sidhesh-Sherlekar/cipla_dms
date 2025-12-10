"""
Test script to verify the withdrawal request fix - crate status should be saved to DB
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.documents.models import Crate
from apps.requests.models import Request
from apps.auth.models import User
from django.db import transaction
from datetime import datetime, timedelta

def test_withdrawal_request_fix():
    """
    Test that creating a withdrawal request properly saves crate status to Withdrawn
    """
    print("\n" + "="*80)
    print("TESTING WITHDRAWAL REQUEST - CRATE STATUS CHANGE FIX")
    print("="*80 + "\n")

    # Find an Active or Archived crate
    test_crate = Crate.objects.filter(status__in=['Active', 'Archived']).first()

    if not test_crate:
        print("❌ No Active or Archived crates found to test with")
        return

    print(f"📦 Test Crate: #{test_crate.id}")
    print(f"   Status BEFORE: {test_crate.status}")
    print(f"   Unit: {test_crate.unit.unit_code if test_crate.unit else 'None'}")

    # Get a user
    user = User.objects.filter(is_active=True).first()
    if not user:
        print("❌ No active users found")
        return

    original_status = test_crate.status

    # Simulate the withdrawal request creation with transaction.atomic()
    print("\n🔧 Creating withdrawal request with transaction.atomic()...")

    with transaction.atomic():
        # Create withdrawal request
        withdrawal_request = Request.objects.create(
            request_type='Withdrawal',
            crate=test_crate,
            unit=test_crate.unit,
            status='Pending',
            withdrawn_by=user,
            purpose='Test withdrawal',
            full_withdrawal=True,
            expected_return_date=datetime.now() + timedelta(days=7)
        )

        # Set crate status to Withdrawn
        old_status = test_crate.status
        test_crate.status = 'Withdrawn'
        test_crate.save()

        print(f"   ✓ Request #{withdrawal_request.id} created")
        print(f"   ✓ Crate status changed from {old_status} to {test_crate.status}")
        print(f"   ✓ Transaction block completed")

    # The transaction.atomic() block has ended, changes should be committed
    print("\n📊 Transaction committed. Checking database...")

    # Refresh from database
    test_crate.refresh_from_db()
    withdrawal_request.refresh_from_db()

    print(f"   Crate status in DB: {test_crate.status}")
    print(f"   Request status in DB: {withdrawal_request.status}")

    # Verify the status was saved
    if test_crate.status == 'Withdrawn':
        print("\n✅ SUCCESS: Crate status correctly saved as Withdrawn in database!")
    else:
        print(f"\n❌ FAILED: Crate status is {test_crate.status}, expected Withdrawn")
        print("   The fix did not work!")

    # Verify by querying directly from database
    print("\n🔍 Direct database query verification...")
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, status FROM crates WHERE id = %s", [test_crate.id])
        row = cursor.fetchone()
        print(f"   Raw DB Query: Crate #{row[0]}, Status: '{row[1]}'")

        if row[1] == 'Withdrawn':
            print("   ✅ Database confirmed: Status is Withdrawn")
        else:
            print(f"   ❌ Database shows: Status is '{row[1]}' (expected Withdrawn)")

    # Clean up: Delete the test request and restore crate status
    print("\n🧹 Cleaning up test data...")
    withdrawal_request.delete()
    test_crate.status = original_status
    test_crate.save()
    print(f"   ✓ Test request deleted")
    print(f"   ✓ Crate status restored to {original_status}")

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80 + "\n")

if __name__ == '__main__':
    test_withdrawal_request_fix()
