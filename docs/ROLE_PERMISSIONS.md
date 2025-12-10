# Role-Based Access Control Matrix

## Role Descriptions and Permissions

### 1. System Administrator
**Description**: Manages users, roles, and system configurations. Enforces password and access policies as per 21 CFR Part 11. CANNOT alter document data or approve requests.

**Permissions**:
- ✅ User Management (Create, Read, Update, Delete users)
- ✅ Role/Group Assignment
- ✅ Security Policy Management
- ✅ Unit/Department/Section Management (Master Data)
- ✅ View Audit Trails (All)
- ✅ View Reports (All)
- ✅ View Dashboard
- ❌ Create/Approve/Reject Requests
- ❌ Allocate Storage
- ❌ Create/Edit Documents
- ❌ Crate Operations

### 2. Section Head
**Description**: Initiates all document-related requests (storage, withdrawal, destruction). Enters document metadata and acknowledges crate allocations. CANNOT approve own requests.

**Permissions**:
- ✅ Create Storage Requests
- ✅ Create Withdrawal Requests
- ✅ Create Destruction Requests
- ✅ View Own Requests
- ✅ View Documents (Own Unit)
- ✅ View Crates (Own Unit)
- ✅ View Reports (Own Unit)
- ✅ View Dashboard (Own Unit)
- ✅ View Audit Trails (Own Unit)
- ❌ Approve/Reject Requests
- ❌ Allocate Storage
- ❌ User Management
- ❌ Master Data Management

### 3. Head QC
**Description**: Serves as the approving authority for all requests. Validates or rejects storage, withdrawal, and destruction requests. Applies digital signatures for traceability. CANNOT create requests or execute storage operations.

**Permissions**:
- ✅ View All Requests (Pending/Approved)
- ✅ Approve Requests
- ✅ Reject Requests
- ✅ Apply Digital Signatures
- ✅ View Documents (Own Unit)
- ✅ View Crates (Own Unit)
- ✅ View Reports (Own Unit)
- ✅ View Dashboard (Own Unit)
- ✅ View Audit Trails (Own Unit)
- ❌ Create Requests
- ❌ Allocate Storage
- ❌ User Management
- ❌ Master Data Management

### 4. Document Store
**Description**: Executes approved actions: allocates storage locations, acknowledges document movement. Generates barcode labels and confirms destruction. CANNOT edit core document data or approve requests.

**Permissions**:
- ✅ View Approved Requests
- ✅ Allocate Storage to Approved Requests
- ✅ Issue Withdrawals
- ✅ Return Withdrawals
- ✅ Confirm Destruction
- ✅ Relocate Crates
- ✅ Generate Barcode Labels
- ✅ View Storage Locations
- ✅ Create Storage Locations
- ✅ View Documents (Own Unit)
- ✅ View Crates (Own Unit)
- ✅ View Reports (Own Unit)
- ✅ View Dashboard (Own Unit)
- ✅ View Audit Trails (Own Unit)
- ❌ Create Requests
- ❌ Approve/Reject Requests
- ❌ Edit Documents
- ❌ User Management
- ❌ Master Data Management

### 5. Quality Assurance
**Description**: Ensures system integrity by reviewing all audit trails. Validates e-signatures and verifies GMP compliance across activities. Read-only access to all system data for oversight and auditing. CANNOT create, approve, or execute document operations.

**Permissions**:
- ✅ View All Audit Trails (System-wide, Read-only)
- ✅ View All Requests (Read-only)
- ✅ View All Documents (Read-only)
- ✅ View All Crates (Read-only)
- ✅ View All Storage Locations (Read-only)
- ✅ View All Reports (System-wide)
- ✅ View Dashboard (System-wide)
- ✅ Export Reports
- ❌ Create/Edit/Delete anything
- ❌ Approve/Reject Requests
- ❌ User Management
- ❌ Master Data Management

## Feature Access Matrix

| Feature | System Admin | Section Head | Head QC | Document Store | Quality Assurance |
|---------|-------------|--------------|---------|----------------|-------------------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ (System-wide) |
| **User Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Master Data** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create Storage Request** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Create Withdrawal Request** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Create Destruction Request** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Approve Requests** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Reject Requests** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Allocate Storage** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Issue Withdrawal** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Return Withdrawal** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Confirm Destruction** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Relocate Crate** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **View Audit Trails** | ✅ | ✅ (Unit) | ✅ (Unit) | ✅ (Unit) | ✅ (All) |
| **View Reports** | ✅ | ✅ (Unit) | ✅ (Unit) | ✅ (Unit) | ✅ (All) |
| **Barcode Scanning** | ❌ | ✅ | ❌ | ✅ | ❌ |
| **Storage Management** | ✅ | ❌ | ❌ | ✅ | ❌ (View only) |

## Navigation Menu Access

| Menu Item | System Admin | Section Head | Head QC | Document Store | Quality Assurance |
|-----------|-------------|--------------|---------|----------------|-------------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transactions | ❌ | ✅ | ✅ | ✅ | ❌ (View only) |
| Storage | ✅ | ❌ | ❌ | ✅ | ❌ (View only) |
| Reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit | ✅ | ✅ | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Master Data | ✅ | ❌ | ❌ | ❌ | ❌ |
| Barcode | ❌ | ✅ | ❌ | ✅ | ❌ |

## Implementation Notes

1. **Backend**: Use Django permission classes to enforce access control at API level
2. **Frontend**: Use role-based routing and conditional rendering to show/hide UI elements
3. **Audit**: All permission checks should be logged in audit trail
4. **Data Filtering**: Most roles see only their unit's data, except System Admin and QA who see all
