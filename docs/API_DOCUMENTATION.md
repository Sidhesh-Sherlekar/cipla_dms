# Cipla DMS API Documentation

## Base URL
```
http://localhost:8000/api/
```

## Authentication
All endpoints require JWT authentication (when packages are installed).

For now, use Django session authentication or configure JWT after installing `djangorestframework-simplejwt`.

## Critical: Digital Signatures

**All CREATE, APPROVE, REJECT, and MODIFY operations require a digital signature** for 21 CFR Part 11 compliance.

The digital signature is implemented as password re-entry. Include `digital_signature` in your request body:

```json
{
    ...your data...,
    "digital_signature": "user_password_here"
}
```

## Common Response Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid digital signature (password verification failed)
- `403 Forbidden` - Permission denied or digital signature missing
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Endpoints

### 1. Storage Request Workflow

#### 1.1 Create Storage Request
Creates a new storage request with documents and crate.

**Endpoint:** `POST /api/requests/storage/create/`

**Role Required:** Section Head or Admin

**Digital Signature:** Required

**Request Body:**
```json
{
    "unit": 1,
    "destruction_date": "2026-12-31",
    "purpose": "Archive batch production records",
    "documents": [
        {
            "document_name": "Batch Record 001",
            "document_number": "BR-001-2024",
            "document_type": "Physical",
            "description": "Batch manufacturing record"
        },
        {
            "document_name": "Quality Control Report",
            "document_number": "QC-001-2024",
            "document_type": "Physical"
        }
    ],
    "digital_signature": "your_password"
}
```

**Response (201 Created):**
```json
{
    "message": "Storage request created successfully",
    "request_id": 1,
    "crate_id": 1,
    "status": "Pending"
}
```

**Validation Rules:**
- `destruction_date` must be in the future
- At least 1 document required
- Document numbers must be unique within the request
- Digital signature (password) must be valid

**Workflow:**
1. System creates a Crate with the specified destruction date
2. System creates/retrieves Documents and links them to the Crate
3. System creates a Storage Request in "Pending" status
4. Action is logged to immutable audit trail
5. Notification sent to Head QC for approval (when Celery is configured)

---

#### 1.2 List Requests
Get all requests with optional filtering.

**Endpoint:** `GET /api/requests/`

**Role Required:** Any authenticated user

**Query Parameters:**
- `request_type` - Filter by type (Storage, Withdrawal, Destruction)
- `status` - Filter by status (Pending, Approved, Issued, Returned, Rejected)
- `unit` - Filter by unit ID

**Examples:**
```
GET /api/requests/                                    # All requests
GET /api/requests/?request_type=Storage               # Storage requests only
GET /api/requests/?status=Pending                     # Pending requests only
GET /api/requests/?request_type=Storage&status=Pending # Combined filters
GET /api/requests/?unit=1                             # Requests for Unit 1
```

**Response (200 OK):**
```json
[
    {
        "id": 1,
        "request_type": "Storage",
        "crate": 1,
        "crate_info": {
            "id": 1,
            "destruction_date": "2026-12-31",
            "status": "Active",
            "document_count": 2
        },
        "unit": 1,
        "unit_code": "MFG-01",
        "request_date": "2024-10-27T10:30:00Z",
        "approval_date": null,
        "status": "Pending",
        "withdrawn_by": 2,
        "withdrawn_by_name": "John Doe",
        "approved_by": null,
        "approved_by_name": null,
        "purpose": "Archive batch production records",
        "is_overdue": false
    }
]
```

---

#### 1.3 Get Request Detail
Get detailed information about a specific request.

**Endpoint:** `GET /api/requests/{id}/`

**Role Required:** Any authenticated user

**Response (200 OK):**
```json
{
    "id": 1,
    "request_type": "Storage",
    "crate": 1,
    "crate_info": {
        "id": 1,
        "destruction_date": "2026-12-31",
        "creation_date": "2024-10-27T10:30:00Z",
        "created_by": 2,
        "created_by_name": "John Doe",
        "status": "Active",
        "storage": null,
        "storage_location": null,
        "unit": 1,
        "unit_code": "MFG-01",
        "document_count": 2
    },
    "request_documents": [
        {
            "id": 1,
            "document": {
                "id": 1,
                "document_name": "Batch Record 001",
                "document_number": "BR-001-2024",
                "document_type": "Physical"
            },
            "added_at": "2024-10-27T10:30:00Z"
        }
    ],
    "status": "Pending",
    "request_date": "2024-10-27T10:30:00Z",
    "purpose": "Archive batch production records"
}
```

---

### 2. Approval Workflow

#### 2.1 Approve Request
Approve a pending request (any type: Storage, Withdrawal, Destruction).

**Endpoint:** `POST /api/requests/{id}/approve/`

**Role Required:** Head QC or Admin

**Digital Signature:** Required

**Request Body:**
```json
{
    "digital_signature": "your_password"
}
```

**Response (200 OK):**
```json
{
    "message": "Storage request approved successfully",
    "request_id": 1,
    "status": "Approved"
}
```

**Error Responses:**
```json
// 403 Forbidden - Missing digital signature
{
    "error": "Digital signature required",
    "message": "Please re-enter your password to confirm this action (21 CFR Part 11 compliance)",
    "field": "digital_signature"
}

// 401 Unauthorized - Invalid password
{
    "error": "Invalid digital signature",
    "message": "Password verification failed. Please check your password and try again.",
    "field": "digital_signature"
}

// 400 Bad Request - Invalid state
{
    "error": "Request is not in pending state (current status: Approved)"
}
```

**Workflow:**
1. Validates digital signature (password)
2. Updates request status to "Approved"
3. Records approver and approval timestamp
4. Logs action to audit trail
5. Sends notification to Document Store (when Celery is configured)

---

## Role-Based Access Control

### Roles and Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all endpoints |
| **Section Head** | Create storage/withdrawal/destruction requests |
| **Head QC** | Approve or reject requests |
| **Document Store** | Allocate storage, issue/receive documents |

### Permission Errors

If you attempt an action without proper role:
```json
{
    "detail": "Only Head QC can perform this action."
}
```

---

## Audit Trail

All actions are automatically logged to an immutable audit trail:

- User who performed the action
- Timestamp (server time, cannot be manipulated)
- Action type (Created, Approved, Rejected, etc.)
- IP address
- User agent
- Detailed message
- Related objects (request ID, crate ID, etc.)

**Important:** Audit trail records **cannot be modified or deleted** once created (21 CFR Part 11 compliance).

---

## Testing the API

### Using cURL

#### 1. Create a storage request:
```bash
curl -X POST http://localhost:8000/api/requests/storage/create/ \
  -H "Content-Type: application/json" \
  -u admin:admin123456 \
  -d '{
    "unit": 1,
    "destruction_date": "2026-12-31",
    "purpose": "Test storage request",
    "documents": [
      {
        "document_name": "Test Document",
        "document_number": "TEST-001",
        "document_type": "Physical"
      }
    ],
    "digital_signature": "admin123456"
  }'
```

#### 2. List all requests:
```bash
curl http://localhost:8000/api/requests/ \
  -u admin:admin123456
```

#### 3. Approve a request:
```bash
curl -X POST http://localhost:8000/api/requests/1/approve/ \
  -H "Content-Type: application/json" \
  -u admin:admin123456 \
  -d '{
    "digital_signature": "admin123456"
  }'
```

### Using Python requests

```python
import requests

BASE_URL = "http://localhost:8000/api"
AUTH = ("admin", "admin123456")

# Create storage request
response = requests.post(
    f"{BASE_URL}/requests/storage/create/",
    auth=AUTH,
    json={
        "unit": 1,
        "destruction_date": "2026-12-31",
        "purpose": "Test request",
        "documents": [
            {
                "document_name": "Test Doc",
                "document_number": "TEST-001",
                "document_type": "Physical"
            }
        ],
        "digital_signature": "admin123456"
    }
)

print(response.json())

# Approve request
response = requests.post(
    f"{BASE_URL}/requests/1/approve/",
    auth=AUTH,
    json={"digital_signature": "admin123456"}
)

print(response.json())
```

---

## Next Steps

1. **Install dependencies**: `pip install -r requirements.txt`
2. **Configure JWT**: Uncomment JWT settings in `config/settings.py`
3. **Set up Celery**: For email notifications
4. **PostgreSQL**: Switch from SQLite for production

---

## Support

For issues or questions:
- Check logs in `backend/logs/`
- Review audit trail in admin panel
- See `QUICK_START.md` for setup help
