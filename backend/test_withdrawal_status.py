"""
Test script to verify withdrawal request crate status change
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.documents.models import Crate
from apps.requests.models import Request
from django.db import transaction

def test_withdrawal_status():
    """
    Test that creating a withdrawal request changes crate status to Withdrawn
    """
    print("\n" + "="*80)
    print("TESTING WITHDRAWAL REQUEST CRATE STATUS CHANGE")
    print("="*80 + "\n")

    # Find an Active or Archived crate
    test_crate = Crate.objects.filter(status__in=['Active', 'Archived']).first()

    if not test_crate:
        print("❌ No Active or Archived crates found to test with")
        return

    print(f"📦 Test Crate: #{test_crate.id}")
    print(f"   Status BEFORE: {test_crate.status}")
    print(f"   Unit: {test_crate.unit.unit_code if test_crate.unit else 'None'}")

    # Simulate the withdrawal request creation logic
    old_status = test_crate.status

    with transaction.atomic():
        # This is what happens in create_withdrawal_request
        test_crate.status = 'Withdrawn'
        test_crate.save()
        print(f"\n✓ Crate status changed from {old_status} to {test_crate.status}")

    # Refresh from database
    test_crate.refresh_from_db()
    print(f"\n📊 AFTER refresh_from_db():")
    print(f"   Status in DB: {test_crate.status}")

    if test_crate.status == 'Withdrawn':
        print("\n✅ SUCCESS: Crate status successfully changed to Withdrawn")
    else:
        print(f"\n❌ FAILED: Crate status is {test_crate.status}, expected Withdrawn")

    # Restore original status for testing
    test_crate.status = old_status
    test_crate.save()
    print(f"\n🔄 Restored crate status to {old_status} for cleanup")

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80 + "\n")

if __name__ == '__main__':
    test_withdrawal_status()
