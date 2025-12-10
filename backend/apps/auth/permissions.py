"""
Role-Based Permission Classes for 21 CFR Part 11 Compliance

These permission classes enforce role-based access control throughout the API.
Based on 4 core Cipla roles + dynamic custom roles:
1. System Admin - Setup storage units, departments, sections, and user management
2. Section Head - Approve requests or send back requests
3. Store Head - Allocate crate storage locations and reallocate crates
4. User - Create new requests
+ Custom roles can be created by System Admin with specific permissions

Privileges replace hardcoded role checks with dynamic privilege-based access control.
"""

from rest_framework import permissions
from .role_utils import (
    has_role,
    is_system_admin,
    is_section_head,
    is_store_head,
    is_regular_user
)


def has_privilege(user, privilege_codename):
    """
    Check if user has a specific privilege through their role.
    This is the primary way to check access in the new privilege-based system.
    """
    if not user or not user.is_authenticated:
        return False

    # Superusers have all privileges
    if user.is_superuser:
        return True

    # Check if user's role has the privilege
    if hasattr(user, 'role') and user.role:
        return privilege_codename in user.role.get_privilege_codenames()

    return False


class IsSystemAdmin(permissions.BasePermission):
    """
    Permission class for System Admins.
    System Admins can:
    - Setup storage units, departments, sections
    - Manage users and roles
    - View reports and audit trails
    CANNOT create, approve, or allocate requests.
    """
    message = 'Only System Admins can perform this action.'

    def has_permission(self, request, view):
        return is_system_admin(request.user)


class IsSectionHead(permissions.BasePermission):
    """
    Permission class for Section Heads.
    Section Heads can:
    - Approve or reject requests
    - Send back requests for revision
    - Apply digital signatures for approval/rejection
    CANNOT create requests or allocate storage.
    """
    message = 'Only Section Heads can perform this action.'

    def has_permission(self, request, view):
        return is_section_head(request.user)


class IsStoreHead(permissions.BasePermission):
    """
    Permission class for Store Heads.
    Store Heads can:
    - Allocate crate storage locations
    - Reallocate crates
    - Manage storage locations
    - Issue/return documents
    CANNOT create or approve requests.
    """
    message = 'Only Store Heads can perform this action.'

    def has_permission(self, request, view):
        return is_store_head(request.user)


class IsUser(permissions.BasePermission):
    """
    Permission class for regular Users.
    Users can:
    - Create storage, withdrawal, and destruction requests
    - View own requests
    - View own crates
    CANNOT approve requests or allocate storage.
    """
    message = 'Only Users can perform this action.'

    def has_permission(self, request, view):
        return is_regular_user(request.user)


class CanCreateRequests(permissions.BasePermission):
    """
    Permission: Create storage, withdrawal, or destruction requests.
    Allowed: Users with 'create_request' privilege
    """
    message = 'You do not have permission to create requests.'

    def has_permission(self, request, view):
        # Check privilege first, fallback to role check for backward compatibility
        return has_privilege(request.user, 'create_request') or is_regular_user(request.user)


class CanApproveRequests(permissions.BasePermission):
    """
    Permission: Approve or reject requests.
    Allowed: Users with 'approve_request' privilege
    """
    message = 'You do not have permission to approve or reject requests.'

    def has_permission(self, request, view):
        # Check privilege first, fallback to role check for backward compatibility
        return has_privilege(request.user, 'approve_request') or is_section_head(request.user)


class CanAllocateStorage(permissions.BasePermission):
    """
    Permission: Allocate storage to approved requests and reallocate crates.
    Allowed: Users with 'allocate_storage' privilege
    """
    message = 'You do not have permission to allocate storage.'

    def has_permission(self, request, view):
        # Check privilege first, fallback to role check for backward compatibility
        return has_privilege(request.user, 'allocate_storage') or is_store_head(request.user)


class CanManageUsers(permissions.BasePermission):
    """
    Permission: Manage users, roles, and system configuration.
    Allowed: Users with 'manage_users' privilege
    """
    message = 'You do not have permission to manage users.'

    def has_permission(self, request, view):
        # Check privilege first, fallback to role check for backward compatibility
        return has_privilege(request.user, 'manage_users') or is_system_admin(request.user)


class CanManageMasterData(permissions.BasePermission):
    """
    Permission: Manage master data (Units, Departments, Sections, Storage).
    Allowed: Users with 'manage_master_data' privilege
    """
    message = 'You do not have permission to manage master data.'

    def has_permission(self, request, view):
        # Check privilege first, fallback to role check for backward compatibility
        return has_privilege(request.user, 'manage_master_data') or is_system_admin(request.user)


# New privilege-based permission classes

class HasPrivilege(permissions.BasePermission):
    """
    Generic permission class that checks for a specific privilege.
    Usage: Set the 'privilege_codename' attribute on the view.
    """
    message = 'You do not have the required privilege for this action.'

    def has_permission(self, request, view):
        privilege_codename = getattr(view, 'privilege_codename', None)
        if not privilege_codename:
            return False
        return has_privilege(request.user, privilege_codename)


class CanViewReports(permissions.BasePermission):
    """Permission to view reports"""
    message = 'You do not have permission to view reports.'

    def has_permission(self, request, view):
        return has_privilege(request.user, 'view_reports') or request.user.is_authenticated


class CanExportReports(permissions.BasePermission):
    """Permission to export reports"""
    message = 'You do not have permission to export reports.'

    def has_permission(self, request, view):
        return has_privilege(request.user, 'export_reports') or is_system_admin(request.user)


class CanViewAuditTrails(permissions.BasePermission):
    """Permission to view audit trails"""
    message = 'You do not have permission to view audit trails.'

    def has_permission(self, request, view):
        return has_privilege(request.user, 'view_audit_trails') or request.user.is_authenticated


class CanManageRoles(permissions.BasePermission):
    """Permission to manage roles"""
    message = 'You do not have permission to manage roles.'

    def has_permission(self, request, view):
        return has_privilege(request.user, 'manage_roles') or is_system_admin(request.user)


class CanReallocateStorage(permissions.BasePermission):
    """Permission to reallocate storage"""
    message = 'You do not have permission to reallocate storage.'

    def has_permission(self, request, view):
        return has_privilege(request.user, 'reallocate_storage') or is_store_head(request.user)


class CanIssueWithdrawal(permissions.BasePermission):
    """Permission to issue withdrawal"""
    message = 'You do not have permission to issue withdrawals.'

    def has_permission(self, request, view):
        return has_privilege(request.user, 'issue_withdrawal') or is_store_head(request.user)


class CanConfirmDestruction(permissions.BasePermission):
    """Permission to confirm destruction"""
    message = 'You do not have permission to confirm destruction.'

    def has_permission(self, request, view):
        return has_privilege(request.user, 'confirm_destruction') or is_store_head(request.user)


class IsActiveUser(permissions.BasePermission):
    """
    Permission class to check if user status is Active.
    """
    message = 'Your account is not active. Please contact administrator.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.status == 'Active'
        )


class ReadOnly(permissions.BasePermission):
    """
    Permission class for read-only access.
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS
