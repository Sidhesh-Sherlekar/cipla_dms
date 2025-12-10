# Quick Fix Script - Replace Mock Data with API Calls

This document contains the exact changes needed for each component. Simply find the specified lines and replace them.

---

## Transaction Component

**File:** `Frontend/src/components/Transaction.tsx`

### Step 1: Update Imports (Add after line 50)

```typescript
import { useCrates } from '../hooks/useCrates'
import { useRequests, useApproveRequest, useRejectRequest } from '../hooks/useRequests'
import { useAuthContext } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'
```

### Step 2: Replace Mock Data (Lines 52-156)

**FIND (lines 52-156):**
```typescript
const mockCrates = [
  // ... entire mock array
];

const pendingRequests = [
  // ... entire mock array
];
```

**REPLACE WITH:**
```typescript
export function Transaction() {
  const { user } = useAuthContext()
  const [activeTab, setActiveTab] = useState('approval')

  // Fetch real data from APIs
  const { data: cratesData, isLoading: loadingCrates, refetch: refetchCrates } = useCrates('Active')
  const { data: requestsData, isLoading: loadingRequests, refetch: refetchRequests } = useRequests()

  // Mutations
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()

  // Extract data
  const mockCrates = cratesData?.results || []
  const allRequests = requestsData?.results || []
  const pendingRequests = allRequests.filter(r => r.status === 'Pending')
  const approvedRequests = allRequests.filter(r => r.status === 'Approved')

  // Show loading state
  if (loadingCrates || loadingRequests) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  // Rest of component continues below...
```

### Step 3: Add Approval Handler (Add this function inside the component)

```typescript
  const handleApprove = async (requestId: number) => {
    const password = prompt('Enter your password for digital signature:')
    if (!password) return

    try {
      await approveRequest.mutateAsync({
        id: requestId,
        digital_signature: {
          username: user.username,
          password: password,
          reason: 'Approving request'
        }
      })

      await refetchRequests()
      alert('Request approved successfully')
    } catch (error) {
      alert('Failed to approve request: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleReject = async (requestId: number) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    const password = prompt('Enter your password for digital signature:')
    if (!password) return

    try {
      await rejectRequest.mutateAsync({
        id: requestId,
        reason,
        digital_signature: {
          username: user.username,
          password: password,
          reason: 'Rejecting request'
        }
      })

      await refetchRequests()
      alert('Request rejected successfully')
    } catch (error) {
      alert('Failed to reject request: ' + (error.response?.data?.error || error.message))
    }
  }
```

### Step 4: Update the Approval Button

**FIND (search for button that says "Approve"):**
```typescript
<Button size="sm" className="bg-green-600 hover:bg-green-700">
  <CheckCircle className="h-4 w-4 mr-1" />
  Approve
</Button>
```

**REPLACE WITH:**
```typescript
<Button
  size="sm"
  className="bg-green-600 hover:bg-green-700"
  onClick={() => handleApprove(request.id)}
>
  <CheckCircle className="h-4 w-4 mr-1" />
  Approve
</Button>
```

**FIND (search for button that says "Reject"):**
```typescript
<Button size="sm" variant="outline">
  <X className="h-4 w-4 mr-1" />
  Reject
</Button>
```

**REPLACE WITH:**
```typescript
<Button
  size="sm"
  variant="outline"
  onClick={() => handleReject(request.id)}
>
  <X className="h-4 w-4 mr-1" />
  Reject
</Button>
```

---

## UserManagement Component

**File:** `Frontend/src/components/UserManagement.tsx`

### Complete Replacement (This component is simpler)

**FIND the entire mock users array and replace the component:**

```typescript
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Loader2, UserPlus, Search, Edit, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export function UserManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      const { data } = await api.get(`/auth/users/?${params.toString()}`)
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
      alert('User created successfully')
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
      alert('User updated successfully')
    }
  })

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/auth/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      alert('User deleted successfully')
    }
  })

  const users = usersData?.results || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  const handleDelete = (userId) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser.mutate(userId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and permissions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Total Users: {users.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.username}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.groups && user.groups.length > 0 ? (
                        <Badge variant="outline">{user.groups[0].name}</Badge>
                      ) : (
                        <Badge variant="outline">No Role</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        user.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## AuditTrail Component

**File:** `Frontend/src/components/AuditTrail.tsx`

### Replace Mock Data

**FIND the mock audit data array and replace component:**

```typescript
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Loader2, Filter, Download } from 'lucide-react'
import { Button } from './ui/button'
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800'
      case 'UPDATE': return 'bg-blue-100 text-blue-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'APPROVE': return 'bg-purple-100 text-purple-800'
      case 'REJECT': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Audit Trail</h1>
          <p className="text-gray-600">21 CFR Part 11 compliant audit log</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
            <div>
              <Label>Action Type</Label>
              <Input
                placeholder="CREATE, UPDATE, DELETE..."
                value={filters.action_type}
                onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Total Entries: {auditLogs.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No audit logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.user_name}</TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action_type)}>
                        {log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell className="font-mono text-sm">{log.entity_id}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {log.changes || 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Testing After Changes

1. **Start Backend:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start Frontend:**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test Each Updated Component:**
   - Transaction: Verify crates and pending requests load
   - UserManagement: Check users list loads
   - AuditTrail: Verify audit logs display

4. **If You See Errors:**
   - Check browser console
   - Verify backend is running on port 8000
   - Ensure you're logged in
   - Check that the API endpoints exist

---

## Quick Verification

Run this to verify backend endpoints exist:
```bash
cd backend
python manage.py show_urls | grep -E "(users|audit|requests|crates)"
```

You should see:
- `/api/auth/users/`
- `/api/audit/logs/`
- `/api/requests/`
- `/api/crates/`

If any are missing, refer to the implementation guides.
