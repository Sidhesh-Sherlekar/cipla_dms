# Frontend Permission Integration Example

## How to Integrate usePermissions Hook into App.tsx

### Step 1: Import the Hook

```typescript
import { usePermissions, getNavigationItems } from './hooks/usePermissions';
```

### Step 2: Use the Hook in AppContent Component

```typescript
function AppContent() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const permissions = usePermissions(); // ADD THIS LINE
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");

  // ... rest of component
}
```

### Step 3: Filter Menu Items Based on Permissions

Replace the static `menuItems` array with dynamic filtering:

```typescript
// OLD CODE (remove this):
const menuItems = [
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    // ...
  },
  // ... other items
];

// NEW CODE (add this):
const allMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "System overview",
    details: "Real-time dashboard showing key metrics, alerts, and system status at a glance.",
    visible: permissions.canViewDashboard, // ADD THIS
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    description: "Manage system users and roles",
    details: "Create, edit, and manage user accounts with role-based access control across organizational units.",
    visible: permissions.canManageUsers, // ADD THIS
  },
  {
    id: "master",
    label: "Master",
    icon: Settings,
    description: "Master data configuration",
    details: "Configure organizational units, storage locations, and other master data settings for the system.",
    visible: permissions.canManageMasterData, // ADD THIS
  },
  {
    id: "transaction",
    label: "Transaction",
    icon: ArrowRightLeft,
    description: "Document transactions",
    details: "Handle document creation, allocation, withdrawal, and destruction requests with approval workflows.",
    visible: permissions.canViewRequests || permissions.canCreateStorageRequest || permissions.canApproveRequests || permissions.canAllocateStorage, // ADD THIS
  },
  {
    id: "barcode",
    label: "Barcode System",
    icon: QrCode,
    description: "Barcode generation and scanning",
    details: "Generate barcodes for crates and scan them to view detailed reports with document contents and location information.",
    visible: permissions.canUseBarcodeScanner, // ADD THIS
  },
  {
    id: "audit-trail",
    label: "Audit Trail",
    icon: Activity,
    description: "System activity tracking",
    details: "View comprehensive logs of all system activities, user actions, and document lifecycle events.",
    visible: permissions.canViewAuditTrails, // ADD THIS
  },
  {
    id: "report",
    label: "Report",
    icon: FileBarChart,
    description: "Reports and analytics",
    details: "Generate detailed reports on crate storage, document inventory, and system utilization analytics.",
    visible: permissions.canViewReports, // ADD THIS
  },
];

// Filter to show only visible items
const menuItems = allMenuItems.filter(item => item.visible);
```

### Step 4: Add Role Badge to Header

```typescript
// Add this helper function
const getRoleBadgeColor = (role: string | null) => {
  switch (role) {
    case 'System Administrator':
      return 'bg-purple-600';
    case 'Section Head':
      return 'bg-blue-600';
    case 'Head QC':
      return 'bg-green-600';
    case 'Document Store':
      return 'bg-orange-600';
    case 'Quality Assurance':
      return 'bg-yellow-600';
    default:
      return 'bg-gray-600';
  }
};

// In your header/navigation, add:
<div className="flex items-center gap-2">
  <span className="text-sm text-gray-700">{user?.full_name}</span>
  {permissions.role && (
    <Badge className={`${getRoleBadgeColor(permissions.role)} text-white`}>
      {permissions.role}
    </Badge>
  )}
  {permissions.isReadOnly && (
    <Badge variant="outline" className="text-xs">
      Read-Only
    </Badge>
  )}
</div>
```

### Step 5: Update Transaction Component

In `Transaction.tsx`, add permissions to control button visibility:

```typescript
import { usePermissions, getTransactionActions } from '../hooks/usePermissions';

export function Transaction() {
  const permissions = usePermissions();
  const actions = getTransactionActions(permissions);

  // ... existing code

  return (
    <div>
      {/* Create Storage Request - Only Section Head */}
      {actions.canShowCreateStorageButton && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Storage Request
            </Button>
          </DialogTrigger>
          {/* ... dialog content */}
        </Dialog>
      )}

      {/* Create Withdrawal Request - Only Section Head */}
      {actions.canShowCreateWithdrawalButton && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-green-900 hover:bg-green-800">
              <Plus className="h-4 w-4 mr-2" />
              Withdrawal Request
            </Button>
          </DialogTrigger>
          {/* ... dialog content */}
        </Dialog>
      )}

      {/* Create Destruction Request - Only Section Head */}
      {actions.canShowCreateDestructionButton && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-red-900 hover:bg-red-800">
              <Plus className="h-4 w-4 mr-2" />
              Destruction Request
            </Button>
          </DialogTrigger>
          {/* ... dialog content */}
        </Dialog>
      )}

      {/* Approve Button - Only Head QC */}
      {request.status === 'Pending' && actions.canShowApproveButton && (
        <Button onClick={() => handleApprove(request.id)}>
          Approve
        </Button>
      )}

      {/* Reject Button - Only Head QC */}
      {request.status === 'Pending' && actions.canShowRejectButton && (
        <Button variant="destructive" onClick={() => handleReject(request.id)}>
          Reject
        </Button>
      )}

      {/* Allocate Storage Button - Only Document Store */}
      {request.status === 'Approved' && actions.canShowAllocateButton && (
        <Button onClick={() => handleAllocateStorage(request.id)}>
          Allocate Storage
        </Button>
      )}

      {/* Issue Withdrawal Button - Only Document Store */}
      {request.status === 'Approved' && request.request_type === 'Withdrawal' && actions.canShowIssueButton && (
        <Button onClick={() => handleIssue(request.id)}>
          Issue Documents
        </Button>
      )}

      {/* Return Documents Button - Only Document Store */}
      {request.status === 'Issued' && request.request_type === 'Withdrawal' && actions.canShowReturnButton && (
        <Button onClick={() => handleReturn(request.id)}>
          Return Documents
        </Button>
      )}

      {/* Confirm Destruction Button - Only Document Store */}
      {request.status === 'Approved' && request.request_type === 'Destruction' && actions.canShowDestroyButton && (
        <Button onClick={() => handleDestroy(request.id)}>
          Confirm Destruction
        </Button>
      )}
    </div>
  );
}
```

### Step 6: Add Access Control to Page Components

For pages that require specific permissions, add guards:

**UserManagement.tsx**:
```typescript
import { usePermissions } from '../hooks/usePermissions';

export function UserManagement() {
  const permissions = usePermissions();

  if (!permissions.canManageUsers) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You do not have permission to access User Management.
            {permissions.role && (
              <span className="block mt-2">
                Your role: <strong>{permissions.role}</strong>
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ... rest of component
}
```

**Master.tsx**:
```typescript
import { usePermissions } from '../hooks/usePermissions';

export function Master() {
  const permissions = usePermissions();

  if (!permissions.canManageMasterData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You do not have permission to access Master Data Management.
            {permissions.role && (
              <span className="block mt-2">
                Your role: <strong>{permissions.role}</strong>
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ... rest of component
}
```

### Step 7: Show Read-Only Indicators for QA

For Quality Assurance role, show read-only indicators:

```typescript
{permissions.isReadOnly && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2">
      <Eye className="h-5 w-5 text-yellow-600" />
      <p className="text-sm text-yellow-800 font-medium">
        Read-Only Mode: You are viewing this data for audit and oversight purposes.
        No modifications are allowed.
      </p>
    </div>
  </div>
)}
```

## Complete App.tsx Example

```typescript
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { usePermissions } from './hooks/usePermissions'; // ADD THIS
import { Login } from "./components/Login";
// ... other imports

// Define all menu items with visibility flags
const getAllMenuItems = (permissions: ReturnType<typeof usePermissions>) => [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "System overview",
    details: "Real-time dashboard showing key metrics, alerts, and system status at a glance.",
    visible: permissions.canViewDashboard,
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    description: "Manage system users and roles",
    details: "Create, edit, and manage user accounts with role-based access control across organizational units.",
    visible: permissions.canManageUsers,
  },
  {
    id: "master",
    label: "Master",
    icon: Settings,
    description: "Master data configuration",
    details: "Configure organizational units, storage locations, and other master data settings for the system.",
    visible: permissions.canManageMasterData,
  },
  {
    id: "transaction",
    label: "Transaction",
    icon: ArrowRightLeft,
    description: "Document transactions",
    details: "Handle document creation, allocation, withdrawal, and destruction requests with approval workflows.",
    visible: permissions.canViewRequests || permissions.canCreateStorageRequest || permissions.canApproveRequests || permissions.canAllocateStorage,
  },
  {
    id: "barcode",
    label: "Barcode System",
    icon: QrCode,
    description: "Barcode generation and scanning",
    details: "Generate barcodes for crates and scan them to view detailed reports with document contents and location information.",
    visible: permissions.canUseBarcodeScanner,
  },
  {
    id: "audit-trail",
    label: "Audit Trail",
    icon: Activity,
    description: "System activity tracking",
    details: "View comprehensive logs of all system activities, user actions, and document lifecycle events.",
    visible: permissions.canViewAuditTrails,
  },
  {
    id: "report",
    label: "Report",
    icon: FileBarChart,
    description: "Reports and analytics",
    details: "Generate detailed reports on crate storage, document inventory, and system utilization analytics.",
    visible: permissions.canViewReports,
  },
];

function AppContent() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const permissions = usePermissions(); // ADD THIS
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");

  // Get filtered menu items based on permissions
  const menuItems = getAllMenuItems(permissions).filter(item => item.visible);

  // ... rest of your existing code
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

## Testing the Integration

1. **Login as different users** and verify:
   - System Administrator sees User Management, Master, Reports, Audit
   - Section Head sees Transaction (create buttons), Barcode, Dashboard
   - Head QC sees Transaction (approve/reject buttons), Reports, Dashboard
   - Document Store sees Transaction (allocate/issue/return buttons), Master (storage only), Barcode
   - Quality Assurance sees all pages but in read-only mode

2. **Check button visibility**:
   - Only Section Head sees "Create Request" buttons
   - Only Head QC sees "Approve" and "Reject" buttons
   - Only Document Store sees "Allocate Storage", "Issue", "Return" buttons

3. **Test API protection**:
   - Try to call protected APIs from browser console
   - Verify 403 Forbidden responses for unauthorized actions

## Summary

By integrating the `usePermissions` hook:
1. ✅ Navigation menu automatically shows only accessible pages
2. ✅ Action buttons appear only for authorized roles
3. ✅ Access denied messages for unauthorized pages
4. ✅ Read-only mode indicator for Quality Assurance
5. ✅ Role badge in header
6. ✅ Complete separation of duties
7. ✅ 21 CFR Part 11 compliance through role-based access control
