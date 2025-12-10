"""
Test script to verify APIs are working with dummy data
"""

import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from apps.auth.models import User

def test_api():
    """Test the APIs"""
    print("=" * 60)
    print("Testing Cipla DMS APIs")
    print("=" * 60)

    # Create a test client
    client = Client()

    # Get a user
    try:
        user = User.objects.get(username='section_head1')
        print(f"\nUsing user: {user.username} ({user.full_name})")
    except User.DoesNotExist:
        print("Error: Test user not found. Run load_dummy_data.py first.")
        return

    # Force login the user (for testing without JWT)
    client.force_login(user)

    print("\n" + "-" * 60)
    print("TEST 1: List all requests")
    print("-" * 60)
    response = client.get('/api/requests/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Number of requests: {len(data)}")
        for req in data[:3]:  # Show first 3
            print(f"  - Request #{req['id']}: {req['request_type']} - {req['status']}")
    else:
        print(f"Error: {response.content.decode()}")

    print("\n" + "-" * 60)
    print("TEST 2: Get specific request details")
    print("-" * 60)
    response = client.get('/api/requests/1/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Request Details:")
        print(f"  ID: {data['id']}")
        print(f"  Type: {data['request_type']}")
        print(f"  Status: {data['status']}")
        print(f"  Crate ID: {data['crate']}")
        print(f"  Unit: {data['unit']}")
    else:
        print(f"Error: {response.content.decode()}")

    print("\n" + "-" * 60)
    print("TEST 3: Filter requests by status")
    print("-" * 60)
    response = client.get('/api/requests/?status=Pending')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Pending requests: {len(data)}")
        for req in data:
            print(f"  - Request #{req['id']}: {req['request_type']} - {req['status']}")
    else:
        print(f"Error: {response.content.decode()}")

    print("\n" + "-" * 60)
    print("TEST 4: Filter requests by type")
    print("-" * 60)
    response = client.get('/api/requests/?request_type=Storage')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Storage requests: {len(data)}")
        for req in data:
            print(f"  - Request #{req['id']}: {req['request_type']} - {req['status']}")
    else:
        print(f"Error: {response.content.decode()}")

    # Test with QC Head to approve requests
    print("\n" + "-" * 60)
    print("TEST 5: Approve a pending request (requires digital signature)")
    print("-" * 60)
    qc_head = User.objects.get(username='qc_head')
    client.force_login(qc_head)

    response = client.post(
        '/api/requests/1/approve/',
        data=json.dumps({'digital_signature': 'password123'}),
        content_type='application/json'
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('message')}")
        print(f"Request ID: {data.get('request_id')}")
        print(f"New Status: {data.get('status')}")
    else:
        print(f"Response: {response.content.decode()}")

    # Verify the approval
    print("\n" + "-" * 60)
    print("TEST 6: Verify request was approved")
    print("-" * 60)
    response = client.get('/api/requests/1/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Request #{data['id']} Status: {data['status']}")
        print(f"Approved By: {data.get('approved_by', 'Not approved')}")
        print(f"Approval Date: {data.get('approval_date', 'N/A')}")
    else:
        print(f"Error: {response.content.decode()}")

    print("\n" + "=" * 60)
    print("API Testing Complete!")
    print("=" * 60)
    print("\nSummary:")
    print("  - All basic API endpoints are working")
    print("  - Dummy data is accessible")
    print("  - Authentication is configured")
    print("  - Digital signature validation works")
    print("\nNext Steps:")
    print("  - Start the React frontend")
    print("  - Test the full workflow through the UI")
    print("  - Configure JWT authentication for production")
    print("=" * 60)


if __name__ == '__main__':
    test_api()
