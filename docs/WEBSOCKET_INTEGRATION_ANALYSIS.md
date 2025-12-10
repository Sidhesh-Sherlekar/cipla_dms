# Cipla DMS Codebase Analysis - WebSocket Integration Points

## 1. DJANGO PROJECT STRUCTURE

### Settings & Configuration
- **Location**: `/home/user/Cipla_DMS/backend/config/settings.py`
- **Key Settings**:
  - Django 5.1.3 / DRF 3.15.2
  - Custom User Model: `auth_custom.User`
  - JWT Authentication with Simple JWT
  - CORS enabled for localhost:3000, localhost:5173
  - Celery + Redis configuration (broker & result backend)
  - PostgreSQL support with SQLite fallback
  - Session timeout: 15 minutes (configurable)
  - Logging to file with audit trail support

### ASGI Configuration
- **Location**: `/home/user/Cipla_DMS/backend/config/asgi.py`
- **Current State**: Uses default Django ASGI (no Channels installed)
- **Issue**: No WebSocket support - needs Django Channels integration

### URL Configuration
- **Location**: `/home/user/Cipla_DMS/backend/config/urls.py`
- **Main Routes**:
  ```
  /api/auth/          - Authentication endpoints
  /api/documents/     - Documents & Crates management
  /api/storage/       - Storage locations
  /api/requests/      - Request workflows (Storage, Withdrawal, Destruction)
  /api/audit/         - Audit trail
  /api/reports/       - Reports
  ```

## 2. DJANGO APPS & API ENDPOINTS

### A. Documents App (`/backend/apps/documents/`)
**ViewSets & Models**:
- `DocumentViewSet` - CRUD operations
  - POST /api/documents/ - Create
  - PUT /api/documents/{id}/ - Update
  - DELETE /api/documents/{id}/ - Delete

- `CrateViewSet` - Crate management
  - POST /api/documents/crates/ - Create crate
  - PUT /api/documents/crates/{id}/ - Update crate
  - DELETE /api/documents/crates/{id}/ - Delete crate
  - POST /api/documents/crates/{id}/relocate/ - Relocate crate (requires digital signature)

**Models**:
- Document (document_name, document_number, document_type, description)
- Crate (status: Active/Withdrawn/Archived/Destroyed, storage, unit, destruction_date)
- CrateDocument (junction table)

### B. Requests App (`/backend/apps/requests/`) - **PRIMARY REAL-TIME CANDIDATE**
**Endpoints** (858 lines of views.py):
- POST /api/requests/storage/create/ - Create storage request
- POST /api/requests/withdrawal/create/ - Create withdrawal request
- POST /api/requests/destruction/create/ - Create destruction request
- POST /api/requests/{id}/approve/ - Approve request (digital signature required)
- POST /api/requests/{id}/reject/ - Reject request (digital signature required)
- POST /api/requests/{id}/send-back/ - Send back for modifications
- POST /api/requests/{id}/allocate-storage/ - Allocate storage
- POST /api/requests/{id}/issue/ - Issue documents (withdrawal)
- POST /api/requests/{id}/return/ - Return documents
- PATCH /api/requests/storage/{id}/update/ - Update sent-back storage request
- PATCH /api/requests/withdrawal/{id}/update/ - Update sent-back withdrawal request
- PATCH /api/requests/destruction/{id}/update/ - Update sent-back destruction request

**Models**:
```python
Request:
  - request_type: Storage/Withdrawal/Destruction
  - status: Pending/Sent Back/Approved/Issued/Returned/Rejected/Completed
  - crate (FK)
  - unit (FK)
  - approved_by, allocated_by, withdrawn_by, issued_by (user relationships)
  - approval_date, allocation_date, issue_date, return_date, expected_return_date

SendBack:
  - request (FK)
  - reason, created_by, sendback_type
```

### C. Storage App (`/backend/apps/storage/`)
**ViewSets**:
- `StorageViewSet` - Storage location management
  - POST /api/storage/ - Create storage location
  - PUT /api/storage/{id}/ - Update storage location
  - DELETE /api/storage/{id}/ - Delete storage location
  - POST /api/storage/bulk-create/ - Bulk create locations

**Model**:
- Storage (unit, room_name, rack_name, compartment_name, shelf_name)

### D. Auth App (`/backend/apps/auth/`)
- User management, role-based access control
- Custom middleware for session timeout
- Digital signature verification (password re-entry)

### E. Audit App
- Audit trail logging for all operations
- Immutable audit logs

## 3. FRONTEND STRUCTURE (React + Vite)

### Dependencies
- React 18.3.1
- TypeScript with Vite 6.3.5
- TanStack React Query (v5) for data fetching
- Axios for HTTP client
- Radix UI components
- Tailwind CSS

### API Service Layer
**Location**: `/frontend/src/services/api.ts`
- Axios instance with base configuration
- Request interceptors: Auto-adds Bearer token
- Response interceptors: 
  - Auto-refreshes JWT tokens on 401
  - Shows toast on session expiry
- Helper: `withDigitalSignature()` for adding password verification to payloads

**Auth Service**: `/frontend/src/services/auth.ts`
- Login, logout, token management

### Custom Hooks (React Query)
**Location**: `/frontend/src/hooks/`

**Key Hooks for Real-Time Updates**:
1. `useRequests()` - Fetch requests with filters
   - Uses queryKey: ['requests', requestType, status, unitId]
   - Currently: `useQuery` with manual `invalidateQueries` on mutations

2. `useRequest(id)` - Fetch single request
   - Uses queryKey: ['request', id]

3. Mutation Hooks (invalidate queries on success):
   - `useCreateStorageRequest()`
   - `useCreateWithdrawalRequest()`
   - `useCreateDestructionRequest()`
   - `useApproveRequest()`
   - `useRejectRequest()`
   - `useSendBackRequest()`
   - `useAllocateStorage()`
   - `useIssueDocuments()`
   - `useReturnDocuments()`
   - `useUpdateStorageRequest()` - PATCH
   - `useUpdateWithdrawalRequest()` - PATCH
   - `useUpdateDestructionRequest()` - PATCH

4. `useCrates()` - Fetch crates
   - Uses queryKey: ['crates', status, unitId]
   - `useRelocateCrate()` - Mutation for relocation

5. `useStorage()` - Storage locations

6. Other hooks:
   - `useAudit()` - Audit trail
   - `useBarcode()` - Barcode operations
   - `useReports()` - Reports
   - `usePermissions()` - User permissions
   - `useIdleTimeout()` - Session timeout

### Frontend Data Fetching Pattern
**Current Pattern** (Location: `/frontend/src/components/Transaction.tsx`):
```typescript
// 1. Fetch data with hooks
const { data: requestsData, refetch: refetchRequests } = useRequests();
const { data: cratesData, refetch: refetchCrates } = useCratesInStorage();

// 2. Perform mutations
const approveRequestMutation = useApproveRequest();

// 3. Handle success - manual refetch
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['requests'] });
  queryClient.invalidateQueries({ queryKey: ['crates'] });
}

// 4. Frontend then manually calls refetch
await refetchRequests();
await refetchCrates();
```

**Issue with Current Approach**:
- Manual page reload on POST (hardcoded in App.tsx lines 40-72)
- No real-time updates for other users' changes
- Polling would be inefficient
- 15-minute session timeout + manual refetch creates poor UX

### Context & State Management
- `AuthContext` - User authentication state
- Local storage for tokens
- React Query for server state management

### Components Structure
- `/components/Dashboard.tsx` - KPI dashboard
- `/components/Transaction.tsx` - Request workflow (MAIN REAL-TIME COMPONENT)
- `/components/Master.tsx` - Master data management
- `/components/UserManagement.tsx` - Users & roles
- `/components/AuditTrail.tsx` - Audit trail view
- `/components/Reports.tsx` - Reports
- `/components/BarcodeSystem.tsx` - Barcode operations
- `/components/DigitalSignatureModal.tsx` - Password verification modal

## 4. EXISTING REAL-TIME MECHANISMS

**Current Status**: NONE
- No WebSocket support
- No Channels installed
- Default Django ASGI only
- Full page reload on POST (Anti-pattern!)
- Manual `refetch` calls after mutations
- No pub/sub messaging

## 5. CRITICAL OPERATIONS NEEDING REAL-TIME UPDATES

### High Priority (Multi-user concurrent access)
1. **Request Status Changes**
   - Approval: Section Head sends to QC/Admin for approval
   - Rejection: Approver rejects request
   - Send Back: Approver sends back for modifications
   - Issue: Store Head issues documents for withdrawal
   - Return: User returns withdrawn documents
   - **Impact**: 3-5 users per request lifecycle

2. **Crate Updates**
   - Status changes (Active → Withdrawn → Returned → Destroyed)
   - Storage relocation
   - **Impact**: Store head sees status changes in real-time

3. **Storage Allocation**
   - Request gets storage location assigned
   - Crate gets relocated to new location
   - **Impact**: Store head needs to know when allocation is complete

### Medium Priority
4. **Audit Trail Updates**
   - Every action creates audit log
   - Audit viewers need real-time log updates

5. **Dashboard KPIs**
   - Request counts by status
   - Overdue withdrawals
   - Documents pending approval

## 6. UNIT-BASED DATA ISOLATION

**Key Constraint**: 
- Users filtered by unit (except System Admins)
- All API views filter by `request.user.unit`
- WebSocket channels should also respect unit boundaries
- SendBack requests need to be visible to relevant users

## 7. DEPLOYMENT & INFRASTRUCTURE

**Current Stack**:
- Backend: Django + DRF + Celery + Redis
- Frontend: React + Vite + TypeScript
- Database: PostgreSQL (production) / SQLite (dev)
- Server: WSGI (need to upgrade to ASGI)
- Docker: docker-compose.yml available

**For WebSocket Support**:
- Need Django Channels (daphne ASGI server)
- Redis as channel layer (already configured for Celery!)
- Update ASGI application
- Update docker-compose for daphne

---

## SUMMARY: WHERE TO ADD WEBSOCKET SUPPORT

### Backend Implementation Points
1. **Add to requirements.txt**:
   - `channels==4.0.0`
   - `daphne==4.0.0`
   - `channels-redis==4.1.0` (already have redis!)

2. **Create WebSocket consumers** (`/backend/apps/requests/consumers.py`):
   - `RequestConsumer` - for request updates
   - `CrateConsumer` - for crate updates
   - Handle unit-based groups

3. **Update ASGI** (`/backend/config/asgi.py`):
   - Add ProtocolTypeRouter
   - Add AuthMiddlewareStack
   - Register consumers with routing

4. **Create routing** (`/backend/config/routing.py`):
   - Define WebSocket URL patterns
   - Map to consumers

5. **Add signal handlers** (in apps):
   - Post-save signals on Request model → broadcast to group
   - Post-save signals on Crate model → broadcast to group
   - Post-save signals on SendBack model → broadcast to group

6. **Update views.py** (optional):
   - Add explicit channel layer broadcasting in critical views

### Frontend Implementation Points
1. **Create WebSocket hook** (`/frontend/src/hooks/useWebSocket.ts`):
   - Connect/disconnect management
   - Reconnection with exponential backoff
   - Auto-disconnect on logout

2. **Create channel subscription hooks** (`/frontend/src/hooks/useRequestUpdates.ts`):
   - Subscribe to request updates for current unit
   - Auto-invalidate React Query on message
   - Handle SendBack notifications

3. **Update useCrates hook** to listen for crate updates

4. **Update useRequests hook** to listen for request updates

5. **Add notification UI**:
   - Toast notifications when updates arrive
   - Visual indicators for real-time changes

6. **Update Transaction component**:
   - Remove manual refetch calls
   - Let WebSocket automatically update
   - Show "updating..." state

### Authentication & Security
- Use JWT token in WebSocket connect message
- Validate token on consumer connect
- Implement channel groups by unit
- Only broadcast to users in the same unit (except admins)

### Testing Points
- WebSocket connection/disconnection
- Message broadcasting to correct groups
- Unit-based filtering
- Concurrent request updates
- SendBack notifications
