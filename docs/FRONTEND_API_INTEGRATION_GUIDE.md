# Frontend API Integration Guide

## ✅ COMPLETED

### Backend Implementation
1. **Storage CRUD Endpoints** - `/api/storage/`
   - GET, POST, PUT, DELETE operations
   - Filter by unit and occupancy status
   - Location: `backend/apps/storage/views.py`

2. **Document & Crate Endpoints** - `/api/documents/` and `/api/crates/`
   - Full CRUD operations
   - Document listing with search
   - Crate management with document relationships
   - Due for destruction endpoint
   - Location: `backend/apps/documents/views.py`

3. **User Management Endpoints** - `/api/auth/users/`
   - List, create, update, delete users
   - Search and filter capabilities
   - Location: `backend/apps/auth/views.py`

4. **Master Data Endpoints**
   - Units: `/api/auth/units/`
   - Departments: `/api/auth/departments/`
   - Sections: `/api/auth/sections/`
   - All support full CRUD operations

5. **Dashboard Component** - `Frontend/src/components/Dashboard.tsx`
   - Connected to `/api/reports/dashboard/kpis/`
   - Connected to `/api/reports/destruction-schedule/`
   - Real-time KPI display
   - Destruction schedule table with expandable crate details
   - Loading states and error handling

### API Hooks (Already Available)
- `useDashboardKPIs()` - Dashboard statistics
- `useDestructionScheduleReport()` - Destruction schedules
- `useRequests()` - Request management
- `useCrates()` - Crate operations
- `useUnits()`, `useDepartments()`, `useSections()` - Master data
- `useStoredDocumentsReport()` - Storage reports
- `useWithdrawnDocumentsReport()` - Withdrawal reports
- `useOverdueReturnsReport()` - Overdue tracking

---

## 📋 REMAINING WORK

### 1. Reports Component (`Frontend/src/components/Reports.tsx`)

**Current State:** Uses dummy data arrays

**Required Changes:**
```typescript
// Replace these mock data arrays:
// - crateStorageData
// - withdrawnDocumentsData
// - overdueReturnsData

// Use these hooks instead:
import { useStoredDocumentsReport, useWithdrawnDocumentsReport, useOverdueReturnsReport } from '../hooks/useReports'

export function Reports() {
  const { data: storedDocs, isLoading: loadingStored } = useStoredDocumentsReport()
  const { data: withdrawnDocs, isLoading: loadingWithdrawn } = useWithdrawnDocumentsReport()
  const { data: overdueDocs, isLoading: loadingOverdue } = useOverdueReturnsReport()

  // Update table rendering to use storedDocs?.results, withdrawnDocs?.results, overdueDocs?.results
  // Add loading states with Loader2 component
  // Add error handling
}
```

---

### 2. Transaction Component (`Frontend/src/components/Transaction.tsx`)

**Current State:** Uses `mockCrates` and `pendingRequests` arrays

**Required Changes:**
```typescript
import { useCrates } from '../hooks/useCrates'
import { useRequests } from '../hooks/useRequests'

export function Transaction() {
  const { data: cratesData, isLoading: loadingCrates } = useCrates('Active')
  const { data: requestsData, isLoading: loadingRequests } = useRequests()

  const crates = cratesData?.results || []
  const pendingRequests = requestsData?.results?.filter(r => r.status === 'Pending') || []

  // Add loading states and error handling
  // Update table rendering to use real data
}
```

---

### 3. Master Component (`Frontend/src/components/Master.tsx`)

**Current State:** Uses hardcoded master data

**Required Changes:**
```typescript
import { useUnits, useDepartments, useSections, useCreateUnit, useUpdateUnit, useDeleteUnit } from '../hooks/useMaster'

export function Master() {
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [selectedDept, setSelectedDept] = useState<number | null>(null)

  // Fetch master data
  const { data: unitsData, isLoading: loadingUnits } = useUnits()
  const { data: deptsData, isLoading: loadingDepts } = useDepartments(selectedUnit)
  const { data: sectionsData, isLoading: loadingSections } = useSections(selectedDept)

  // Mutations for create/update/delete
  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()
  const deleteUnit = useDeleteUnit()

  // Handle form submissions
  const handleCreateUnit = async (data) => {
    await createUnit.mutateAsync(data)
  }

  // Add similar handlers for departments and sections
}
```

**Storage Locations:**
```typescript
import { useStorageLocations, useCreateStorage } from '../hooks/useMaster'

const { data: storageData } = useStorageLocations(selectedUnit)
const createStorage = useCreateStorage()
```

---

### 4. UserManagement Component (`Frontend/src/components/UserManagement.tsx`)

**Current State:** Uses mock user array

**Required Changes:**
```typescript
import api from '../services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function UserManagement() {
  const queryClient = useQueryClient()

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users/')
      return data
    }
  })

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (userData) => {
      const { data } = await api.post('/auth/users/', userData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async ({ id, ...userData }) => {
      const { data } = await api.put(`/auth/users/${id}/`, userData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/auth/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const users = usersData?.results || []
}
```

---

### 5. AuditTrail Component (`Frontend/src/components/AuditTrail.tsx`)

**Current State:** Uses mock audit log data

**Required Changes:**
```typescript
import { useAuditTrail } from '../hooks/useAudit'

export function AuditTrail() {
  const [filters, setFilters] = useState({
    action_type: '',
    date_from: '',
    date_to: '',
    user_id: null
  })

  const { data: auditData, isLoading } = useAuditTrail(filters)

  const auditLogs = auditData?.results || []

  // Add filter controls
  // Update table to display real audit data
  // Add pagination if needed
}
```

---

### 6. Document Workflow Components

#### DocumentReceipt.tsx

**Enable Submit Button:**
```typescript
import { useCreateStorageRequest } from '../hooks/useRequests'

export function DocumentReceipt() {
  const createRequest = useCreateStorageRequest()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      await createRequest.mutateAsync({
        documents: formData.documents,
        destruction_date: formData.destructionDate,
        unit: formData.unitId,
        // Include digital signature
        digital_signature: {
          username: user.username,
          password: formData.password,
          reason: 'Creating storage request'
        }
      })

      toast.success('Storage request submitted successfully')
      // Reset form
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    // Form JSX
    <Button
      onClick={handleSubmit}
      disabled={isSubmitting || !isFormValid}
    >
      {isSubmitting ? 'Submitting...' : 'Submit Request'}
    </Button>
  )
}
```

#### DocumentWithdrawal.tsx

**Enable Submit Button:**
```typescript
import { useCreateWithdrawalRequest } from '../hooks/useRequests'

export function DocumentWithdrawal() {
  const createWithdrawal = useCreateWithdrawalRequest()

  const handleSubmit = async (formData) => {
    await createWithdrawal.mutateAsync({
      crate_id: formData.crateId,
      purpose: formData.purpose,
      expected_return_date: formData.returnDate,
      full_withdrawal: formData.fullWithdrawal,
      document_ids: formData.documentIds, // if partial withdrawal
      digital_signature: {
        username: user.username,
        password: formData.password,
        reason: 'Creating withdrawal request'
      }
    })
  }
}
```

#### DocumentDestruction.tsx

**Enable Submit Button:**
```typescript
import { useCreateDestructionRequest } from '../hooks/useRequests'

export function DocumentDestruction() {
  const createDestruction = useCreateDestructionRequest()

  const handleSubmit = async (formData) => {
    await createDestruction.mutateAsync({
      crate_id: formData.crateId,
      destruction_reason: formData.reason,
      digital_signature: {
        username: user.username,
        password: formData.password,
        reason: 'Creating destruction request'
      }
    })
  }
}
```

---

## 🔧 TESTING THE INTEGRATION

### 1. Start the Backend Server
```bash
cd backend
python manage.py runserver
```

### 2. Start the Frontend Dev Server
```bash
cd Frontend
npm run dev
```

### 3. Test Each Component
1. **Dashboard** - Already integrated, verify KPIs load correctly
2. **Reports** - Check all three report tabs load data
3. **Transaction** - Verify crates and pending requests display
4. **Master** - Test CRUD operations for units, departments, sections
5. **User Management** - Test user CRUD operations
6. **Audit Trail** - Verify audit logs display with filters
7. **Document Workflows** - Test form submissions

### 4. Check for Common Issues

**CORS Errors:**
- Ensure backend CORS settings allow frontend origin
- Check `backend/config/settings.py` CORS_ALLOWED_ORIGINS

**401 Unauthorized:**
- Verify JWT token is being sent in headers
- Check token refresh logic in `Frontend/src/services/api.ts`

**404 Not Found:**
- Verify API endpoint URLs match backend routes
- Check `backend/config/urls.py` for correct path patterns

**Network Errors:**
- Ensure backend is running on `localhost:8000`
- Check `Frontend/.env` has correct `VITE_API_BASE_URL`

---

## 📚 API ENDPOINT REFERENCE

### Authentication
- POST `/api/auth/login/` - User login
- POST `/api/auth/logout/` - User logout
- GET `/api/auth/me/` - Current user info

### Users
- GET `/api/auth/users/` - List users
- POST `/api/auth/users/` - Create user
- GET `/api/auth/users/{id}/` - Get user
- PUT `/api/auth/users/{id}/` - Update user
- DELETE `/api/auth/users/{id}/` - Delete user

### Master Data
- GET/POST `/api/auth/units/` - Units
- GET/POST `/api/auth/departments/` - Departments
- GET/POST `/api/auth/sections/` - Sections
- GET/POST `/api/storage/` - Storage locations

### Documents & Crates
- GET/POST `/api/documents/` - Documents
- GET/POST `/api/crates/` - Crates
- GET `/api/crates/{id}/documents/` - Crate documents
- GET `/api/crates/due-for-destruction/` - Crates due for destruction

### Requests (Storage/Withdrawal/Destruction)
- GET/POST `/api/requests/` - List/create requests
- POST `/api/requests/storage/create/` - Create storage request
- POST `/api/requests/withdrawal/create/` - Create withdrawal request
- POST `/api/requests/destruction/create/` - Create destruction request
- POST `/api/requests/{id}/approve/` - Approve request
- POST `/api/requests/{id}/reject/` - Reject request
- POST `/api/requests/{id}/allocate-storage/` - Allocate storage
- POST `/api/requests/{id}/issue/` - Issue documents
- POST `/api/requests/{id}/return/` - Return documents
- POST `/api/requests/{id}/destroy/` - Confirm destruction

### Reports
- GET `/api/reports/stored-documents/` - Stored documents report
- GET `/api/reports/withdrawn-documents/` - Withdrawn documents report
- GET `/api/reports/overdue-returns/` - Overdue returns report
- GET `/api/reports/destruction-schedule/` - Destruction schedule
- GET `/api/reports/dashboard/kpis/` - Dashboard KPIs

### Audit Trail
- GET `/api/audit/logs/` - Audit trail logs
- Filter params: `action_type`, `user_id`, `date_from`, `date_to`

---

## 🎯 PRIORITY ORDER

1. **HIGH PRIORITY** (Core Functionality)
   - DocumentReceipt, DocumentWithdrawal, DocumentDestruction submit buttons
   - Transaction component (shows pending approvals)
   - Reports component (compliance requirement)

2. **MEDIUM PRIORITY** (Admin Features)
   - Master component (administrative data)
   - UserManagement component (user administration)

3. **LOW PRIORITY** (Informational)
   - AuditTrail component (monitoring/compliance)
   - BarcodeSystem component (if used)

---

## 💡 BEST PRACTICES

1. **Always show loading states** - Use `<Loader2 className="animate-spin" />` from lucide-react
2. **Handle errors gracefully** - Show user-friendly error messages
3. **Validate forms before submission** - Prevent invalid API calls
4. **Use optimistic updates** - Update UI before API response for better UX
5. **Implement proper error boundaries** - Prevent entire app crashes
6. **Add success/error toasts** - Use react-hot-toast or similar
7. **Implement digital signatures** - For all CREATE/MODIFY/DELETE operations (21 CFR Part 11 compliance)

---

## 🔐 DIGITAL SIGNATURE IMPLEMENTATION

All write operations require password re-entry for 21 CFR Part 11 compliance:

```typescript
import { promptForDigitalSignature } from '../services/auth'

const handleSubmit = async (formData) => {
  // Prompt user for password
  const signature = await promptForDigitalSignature('Creating storage request')

  if (!signature) {
    return // User cancelled
  }

  await createRequest.mutateAsync({
    ...formData,
    digital_signature: signature
  })
}
```

---

## ✅ CHECKLIST

- [x] Backend Storage endpoints implemented
- [x] Backend Document/Crate endpoints implemented
- [x] Backend User management endpoints implemented
- [x] Backend Master data endpoints implemented
- [x] Dashboard component integrated with API
- [ ] Reports component integrated with API
- [ ] Transaction component integrated with API
- [ ] Master component integrated with API
- [ ] UserManagement component integrated with API
- [ ] AuditTrail component integrated with API
- [ ] DocumentReceipt submit button enabled
- [ ] DocumentWithdrawal submit button enabled
- [ ] DocumentDestruction submit button enabled
- [ ] End-to-end testing completed
- [ ] Error handling verified
- [ ] Loading states added to all components
- [ ] Digital signatures implemented for all write operations

---

## 🚀 NEXT STEPS

1. Update each remaining component following the patterns above
2. Test each component individually
3. Test the complete workflow end-to-end
4. Add proper error handling and loading states
5. Implement digital signature prompts
6. Test with real data
7. Deploy to staging/production

**Estimated Time to Complete:** 4-6 hours for experienced React developer

---

## 📞 SUPPORT

If you encounter any issues:
1. Check browser console for errors
2. Check network tab for failed API calls
3. Review backend logs: `python manage.py runserver` terminal output
4. Verify database has sample data for testing
5. Ensure all migrations are applied: `python manage.py migrate`
