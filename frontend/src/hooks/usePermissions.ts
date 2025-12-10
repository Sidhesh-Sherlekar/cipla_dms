import { useAuth } from '../context/AuthContext';

/**
 * Privilege-based permissions hook
 * Uses dynamic privileges from user's role instead of hardcoded role checks.
 *
 * Privileges are granular action-level permissions like:
 * - create_request, approve_request, allocate_storage
 * - manage_users, manage_master_data, view_reports
 * - etc.
 *
 * Roles are collections of privileges that can be customized in the UI.
 */

export type RoleName =
  | 'System Admin'
  | 'Section Head'
  | 'Store Head'
  | 'User'
  | string; // Custom roles

export interface Permissions {
  // User Management
  canManageUsers: boolean;
  canViewUsers: boolean;
  canManageRoles: boolean;

  // Master Data Management
  canManageMasterData: boolean;
  canManageStorage: boolean;
  canViewStorage: boolean;

  // Request Creation
  canCreateStorageRequest: boolean;
  canCreateWithdrawalRequest: boolean;
  canCreateDestructionRequest: boolean;

  // Request Approval
  canApproveRequests: boolean;
  canRejectRequests: boolean;

  // Storage Operations
  canAllocateStorage: boolean;
  canIssueWithdrawal: boolean;
  canReturnWithdrawal: boolean;
  canConfirmDestruction: boolean;
  canRelocateCrate: boolean;

  // View Permissions
  canViewRequests: boolean;
  canViewDocuments: boolean;
  canViewCrates: boolean;
  canViewReports: boolean;
  canViewAuditTrails: boolean;
  canViewDashboard: boolean;

  // Special Permissions
  canUseBarcodeScanner: boolean;
  canApplyDigitalSignature: boolean;
  canExportReports: boolean;

  // Data Scope
  canViewAllUnits: boolean;
  canViewOwnUnitOnly: boolean;

  // Helper
  role: RoleName | null;
  isSystemAdmin: boolean;
  isSectionHead: boolean;
  isStoreHead: boolean;
  isUser: boolean;

  // Utility function to check any privilege
  hasPrivilege: (privilegeCode: string) => boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuth();

  // Get user's privileges from backend
  const userPrivileges = user?.privileges || [];

  // Helper function to check if user has a specific privilege
  const hasPrivilege = (privilegeCode: string): boolean => {
    // Superusers have all privileges
    if (user?.is_superuser) return true;
    return userPrivileges.includes(privilegeCode);
  };

  // Get user's role from groups
  const userRole = user?.groups?.[0]?.name as RoleName | undefined;

  // Role flags (for backward compatibility and UI display)
  const isSystemAdmin = userRole === 'System Admin' || user?.is_superuser === true;
  const isSectionHead = userRole === 'Section Head';
  const isStoreHead = userRole === 'Store Head';
  const isUser = userRole === 'User';

  const permissions: Permissions = {
    // User Management
    canManageUsers: hasPrivilege('manage_users'),
    canViewUsers: hasPrivilege('view_users') || hasPrivilege('manage_users'),
    canManageRoles: hasPrivilege('manage_roles') || hasPrivilege('manage_users'),

    // Master Data Management
    canManageMasterData: hasPrivilege('manage_master_data'),
    canManageStorage: hasPrivilege('manage_storage') || hasPrivilege('manage_master_data'),
    canViewStorage: hasPrivilege('view_storage') || hasPrivilege('manage_storage') || hasPrivilege('allocate_storage'),

    // Request Creation
    canCreateStorageRequest: hasPrivilege('create_request'),
    canCreateWithdrawalRequest: hasPrivilege('create_request'),
    canCreateDestructionRequest: hasPrivilege('create_request'),

    // Request Approval
    canApproveRequests: hasPrivilege('approve_request'),
    canRejectRequests: hasPrivilege('approve_request'),

    // Storage Operations
    canAllocateStorage: hasPrivilege('allocate_storage'),
    canIssueWithdrawal: hasPrivilege('issue_withdrawal'),
    canReturnWithdrawal: hasPrivilege('return_withdrawal'),
    canConfirmDestruction: hasPrivilege('confirm_destruction'),
    canRelocateCrate: hasPrivilege('reallocate_storage'),

    // View Permissions
    canViewRequests: hasPrivilege('view_requests') || hasPrivilege('view_own_requests') || user?.is_authenticated === true,
    canViewDocuments: user?.is_authenticated === true,
    canViewCrates: user?.is_authenticated === true,
    canViewReports: hasPrivilege('view_reports') || user?.is_authenticated === true,
    canViewAuditTrails: hasPrivilege('view_audit_trails') || user?.is_authenticated === true,
    canViewDashboard: hasPrivilege('view_dashboard') || user?.is_authenticated === true,

    // Special Permissions
    canUseBarcodeScanner: hasPrivilege('use_barcode_scanner'),
    canApplyDigitalSignature: hasPrivilege('digital_signature'),
    canExportReports: hasPrivilege('export_reports'),

    // Data Scope
    canViewAllUnits: hasPrivilege('view_all_units'),
    canViewOwnUnitOnly: !hasPrivilege('view_all_units'),

    // Role information
    role: userRole || null,
    isSystemAdmin,
    isSectionHead,
    isStoreHead,
    isUser,

    // Utility function
    hasPrivilege,
  };

  return permissions;
};

/**
 * Helper function to check if user can access a specific feature
 */
export const canAccessFeature = (
  feature: keyof Permissions,
  permissions: Permissions
): boolean => {
  return permissions[feature] as boolean;
};

/**
 * Navigation items configuration based on roles
 */
export const getNavigationItems = (permissions: Permissions) => {
  const items = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: 'LayoutDashboard',
      visible: permissions.canViewDashboard,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      path: '/transactions',
      icon: 'ArrowLeftRight',
      visible:
        permissions.canCreateStorageRequest ||
        permissions.canApproveRequests ||
        permissions.canAllocateStorage ||
        permissions.canViewRequests,
    },
    {
      id: 'storage',
      label: 'Storage',
      path: '/storage',
      icon: 'Package',
      visible: permissions.canViewStorage || permissions.canManageStorage,
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      icon: 'FileText',
      visible: permissions.canViewReports,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      path: '/audit',
      icon: 'Shield',
      visible: permissions.canViewAuditTrails,
    },
    {
      id: 'barcode',
      label: 'Barcode Scanner',
      path: '/barcode',
      icon: 'Scan',
      visible: permissions.canUseBarcodeScanner,
    },
    {
      id: 'users',
      label: 'User Management',
      path: '/users',
      icon: 'Users',
      visible: permissions.canManageUsers,
    },
    {
      id: 'master',
      label: 'Master Data',
      path: '/master',
      icon: 'Database',
      visible: permissions.canManageMasterData,
    },
  ];

  return items.filter((item) => item.visible);
};

/**
 * Action buttons configuration for transactions based on roles
 */
export const getTransactionActions = (permissions: Permissions) => {
  return {
    canShowCreateStorageButton: permissions.canCreateStorageRequest,
    canShowCreateWithdrawalButton: permissions.canCreateWithdrawalRequest,
    canShowCreateDestructionButton: permissions.canCreateDestructionRequest,
    canShowApproveButton: permissions.canApproveRequests,
    canShowRejectButton: permissions.canRejectRequests,
    canShowAllocateButton: permissions.canAllocateStorage,
    canShowIssueButton: permissions.canIssueWithdrawal,
    canShowReturnButton: permissions.canReturnWithdrawal,
    canShowDestroyButton: permissions.canConfirmDestruction,
    canShowRelocateButton: permissions.canRelocateCrate,
  };
};
