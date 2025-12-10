"""
Script to load dummy data for testing the Cipla DMS system
"""

import os
import django
from datetime import date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.auth.models import Role, User, Unit, Department, Section, UserUnit, DeptUser, SectionUser
from apps.storage.models import Storage
from apps.documents.models import Document, Crate, CrateDocument
from apps.requests.models import Request, RequestDocument

def create_roles():
    """Create roles"""
    print("Creating roles...")
    roles_data = [
        {'role_name': 'Admin', 'description': 'System Administrator with full access'},
        {'role_name': 'Section Head', 'description': 'Can create storage/withdrawal requests'},
        {'role_name': 'Head QC', 'description': 'Can approve/reject requests'},
        {'role_name': 'Document Store', 'description': 'Can allocate storage and issue documents'},
    ]

    roles = {}
    for role_data in roles_data:
        role, created = Role.objects.get_or_create(
            role_name=role_data['role_name'],
            defaults={'description': role_data['description']}
        )
        roles[role_data['role_name']] = role
        print(f"  {'Created' if created else 'Found'}: {role.role_name}")

    return roles


def create_users(roles):
    """Create test users"""
    print("\nCreating users...")
    users_data = [
        {'username': 'admin', 'full_name': 'Admin User', 'role': 'Admin', 'email': 'admin@cipla.com'},
        {'username': 'section_head1', 'full_name': 'John Section Head', 'role': 'Section Head', 'email': 'john@cipla.com'},
        {'username': 'qc_head', 'full_name': 'Jane QC Head', 'role': 'Head QC', 'email': 'jane@cipla.com'},
        {'username': 'doc_store', 'full_name': 'Bob Document Store', 'role': 'Document Store', 'email': 'bob@cipla.com'},
    ]

    users = {}
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults={
                'full_name': user_data['full_name'],
                'email': user_data['email'],
                'role': roles[user_data['role']],
                'status': 'Active'
            }
        )
        if created:
            user.set_password('password123')  # Set a default password
            user.save()
            print(f"  Created: {user.username} ({user.full_name}) - Password: password123")
        else:
            print(f"  Found: {user.username} ({user.full_name})")
        users[user_data['username']] = user

    return users


def create_organizational_structure(users):
    """Create Units, Departments, and Sections"""
    print("\nCreating organizational structure...")

    # Create Units
    unit1, created = Unit.objects.get_or_create(
        unit_code='MUM-01',
        defaults={
            'unit_name': 'Mumbai Manufacturing Unit',
            'location': 'Mumbai, Maharashtra'
        }
    )
    print(f"  {'Created' if created else 'Found'} Unit: {unit1.unit_code}")

    unit2, created = Unit.objects.get_or_create(
        unit_code='GOA-01',
        defaults={
            'unit_name': 'Goa Manufacturing Unit',
            'location': 'Goa'
        }
    )
    print(f"  {'Created' if created else 'Found'} Unit: {unit2.unit_code}")

    # Create Departments
    dept1, created = Department.objects.get_or_create(
        department_name='Quality Control',
        unit=unit1,
        defaults={'department_head': users.get('qc_head')}
    )
    print(f"  {'Created' if created else 'Found'} Department: {dept1.department_name}")

    dept2, created = Department.objects.get_or_create(
        department_name='Production',
        unit=unit1,
        defaults={'department_head': users.get('section_head1')}
    )
    print(f"  {'Created' if created else 'Found'} Department: {dept2.department_name}")

    # Create Sections
    section1, created = Section.objects.get_or_create(
        section_name='Batch Records',
        department=dept1
    )
    print(f"  {'Created' if created else 'Found'} Section: {section1.section_name}")

    section2, created = Section.objects.get_or_create(
        section_name='Testing Lab',
        department=dept1
    )
    print(f"  {'Created' if created else 'Found'} Section: {section2.section_name}")

    return {
        'units': [unit1, unit2],
        'departments': [dept1, dept2],
        'sections': [section1, section2]
    }


def create_storage_locations(units):
    """Create storage locations"""
    print("\nCreating storage locations...")

    storage_locations = []
    unit = units[0]  # Use first unit

    # Create a few storage locations
    for room in ['Room-A', 'Room-B']:
        for rack in ['Rack-1', 'Rack-2']:
            for compartment in ['C1', 'C2']:
                for shelf in ['S1', 'S2']:
                    storage, created = Storage.objects.get_or_create(
                        unit=unit,
                        room_name=room,
                        rack_name=rack,
                        compartment_name=compartment,
                        shelf_name=shelf
                    )
                    if created:
                        storage_locations.append(storage)

    print(f"  Created {len(storage_locations)} storage locations")
    return storage_locations


def create_documents_and_crates(users, units):
    """Create documents and crates"""
    print("\nCreating documents and crates...")

    unit = units[0]
    user = list(users.values())[0]

    # Create documents
    documents = []
    for i in range(1, 11):
        doc, created = Document.objects.get_or_create(
            document_number=f'DOC-2025-{i:04d}',
            defaults={
                'document_name': f'Batch Record {i}',
                'document_type': 'Physical',
                'description': f'Batch manufacturing record for product batch {i}'
            }
        )
        if created:
            documents.append(doc)

    print(f"  Created {len(documents)} documents")

    # Create crates
    crates = []
    destruction_date = date.today() + timedelta(days=365*7)  # 7 years from now

    for i in range(1, 4):
        crate, created = Crate.objects.get_or_create(
            id=i,
            defaults={
                'destruction_date': destruction_date,
                'created_by': user,
                'status': 'Active',
                'unit': unit
            }
        )
        if created:
            # Add 3-4 documents to each crate
            start_idx = (i-1) * 3
            end_idx = start_idx + 3
            for doc in documents[start_idx:end_idx]:
                CrateDocument.objects.get_or_create(
                    crate=crate,
                    document=doc
                )
            crates.append(crate)

    print(f"  Created {len(crates)} crates")
    return crates, documents


def create_requests(users, crates, units):
    """Create sample requests"""
    print("\nCreating sample requests...")

    unit = units[0]
    section_head = users.get('section_head1')
    qc_head = users.get('qc_head')

    requests_created = []

    # Storage Request - Pending
    req1, created = Request.objects.get_or_create(
        id=1,
        defaults={
            'request_type': 'Storage',
            'crate': crates[0],
            'unit': unit,
            'status': 'Pending',
            'withdrawn_by': section_head,
            'purpose': 'Store batch records for Q1 2025'
        }
    )
    if created:
        requests_created.append(req1)
        print(f"  Created: Storage Request #{req1.id} - {req1.status}")

    # Storage Request - Approved
    req2, created = Request.objects.get_or_create(
        id=2,
        defaults={
            'request_type': 'Storage',
            'crate': crates[1],
            'unit': unit,
            'status': 'Approved',
            'withdrawn_by': section_head,
            'approved_by': qc_head,
            'approval_date': django.utils.timezone.now(),
            'purpose': 'Store batch records for Q4 2024'
        }
    )
    if created:
        requests_created.append(req2)
        print(f"  Created: Storage Request #{req2.id} - {req2.status}")

    # Withdrawal Request - Pending
    req3, created = Request.objects.get_or_create(
        id=3,
        defaults={
            'request_type': 'Withdrawal',
            'crate': crates[2],
            'unit': unit,
            'status': 'Pending',
            'withdrawn_by': section_head,
            'purpose': 'Need for regulatory inspection',
            'full_withdrawal': True
        }
    )
    if created:
        requests_created.append(req3)
        print(f"  Created: Withdrawal Request #{req3.id} - {req3.status}")

    print(f"  Total requests created: {len(requests_created)}")
    return requests_created


def main():
    """Main function to load all dummy data"""
    print("=" * 60)
    print("Loading Dummy Data for Cipla DMS")
    print("=" * 60)

    try:
        roles = create_roles()
        users = create_users(roles)
        org_structure = create_organizational_structure(users)
        storage_locations = create_storage_locations(org_structure['units'])
        crates, documents = create_documents_and_crates(users, org_structure['units'])
        requests = create_requests(users, crates, org_structure['units'])

        print("\n" + "=" * 60)
        print("Dummy Data Loaded Successfully!")
        print("=" * 60)
        print("\nTest Users:")
        print("  - Username: admin         | Password: password123 | Role: Admin")
        print("  - Username: section_head1 | Password: password123 | Role: Section Head")
        print("  - Username: qc_head       | Password: password123 | Role: Head QC")
        print("  - Username: doc_store     | Password: password123 | Role: Document Store")
        print("\nYou can now start the Django server and test the APIs!")
        print("=" * 60)

    except Exception as e:
        print(f"\nError loading dummy data: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
