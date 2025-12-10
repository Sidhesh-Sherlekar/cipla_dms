// TypeScript types matching Django backend models

export interface Privilege {
  id: number;
  codename: string;
  name: string;
  description?: string;
  category: 'requests' | 'storage' | 'users' | 'master_data' | 'reports' | 'system';
  is_active?: boolean;
}

export interface Role {
  id: number;
  role_name: string;
  description?: string;
  privileges?: Privilege[];
  privilege_ids?: number[];
  privilege_codenames?: string[];
  user_count?: number;
  is_core_role?: boolean;
}

export interface Unit {
  id: number;
  unit_code: string;
  unit_name?: string;
}

export interface Department {
  id: number;
  department_name: string;
  department_head: User | null;
  unit: Unit;
}

export interface Section {
  id: number;
  section_name: string;
  department: Department;
}

export interface Group {
  id: number;
  name: string;
  permissions?: string[];
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role?: number;  // Legacy role ID (optional for backward compatibility)
  role_name?: string;  // Primary role name from groups
  unit?: Unit;  // User's primary unit
  section?: Section;  // User's primary section
  status: 'Active' | 'Inactive' | 'Suspended' | 'Locked';
  must_change_password?: boolean;  // Flag to force password change
  last_login: string | null;
  last_login_ip?: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  groups: Group[];  // Django groups (primary RBAC)
  permissions: string[];  // All user permissions
  privileges: string[];  // User's privilege codenames from their role
  created_at?: string;
  updated_at?: string;
  units?: Unit[];  // Additional units (for many-to-many relationship if needed)
  departments?: Department[];
  sections?: Section[];  // Additional sections (for many-to-many relationship if needed)
}

export interface Storage {
  id: number;
  unit: Unit;
  room_name: string;
  rack_name: string;
  compartment_name: string;
  shelf_name: string;
}

export interface Document {
  id: number;
  document_name: string;
  document_number: string;
  document_type: 'Physical' | 'Digital';
}

export interface Crate {
  id: number;
  destruction_date: string | null;  // Nullable for retained crates
  creation_date: string;
  created_by: User;
  status: 'Active' | 'Withdrawn' | 'Archived' | 'Destroyed';
  storage: Storage | null;
  storage_location?: string;
  unit: Unit;
  to_central?: boolean;  // Send to central storage
  to_be_retained?: boolean;  // No destruction date required
}

export interface CrateDocument {
  id: number;
  document: Document;
  crate: Crate;
}

export interface Request {
  id: number;
  request_type: 'Storage' | 'Withdrawal' | 'Destruction';
  crate: number;
  crate_info?: Crate;
  unit: number;
  unit_code?: string;
  request_date: string;
  approval_date: string | null;
  issue_date: string | null;
  return_date: string | null;
  expected_return_date: string | null;
  approved_by: number | null;
  approved_by_name?: string;
  allocation_date: string | null;
  allocated_by: number | null;
  allocated_by_name?: string;
  status: 'Pending' | 'Sent Back' | 'Approved' | 'Issued' | 'Returned' | 'Rejected' | 'Completed';
  withdrawn_by: number | null;
  withdrawn_by_name?: string;
  purpose: string;
  full_withdrawal: boolean;
  issued_by: number | null;
  issued_by_name?: string;
  request_documents?: any[];
  sendbacks?: SendBack[];
  sendback_reason?: string;
  is_overdue?: boolean;
  storage_location?: string;
  created_at?: string;
  updated_at?: string;
  documents?: Document[];
}

export interface RequestDocument {
  id: number;
  request: Request;
  document: Document;
}

export interface SendBack {
  id: number;
  request: Request;
  reason: string;
  sendback_type: 'Change Request' | 'Return Note';
  created_at: string;
  created_by: number;
  created_by_name?: string;
}

export interface AuditTrail {
  id: number;
  action_time: string;
  action: 'Created' | 'Updated' | 'Deleted' | 'Viewed' | 'Approved' | 'Rejected' | 'Issued' | 'Returned' | 'Allocated';
  user: number;
  user_name?: string;
  username?: string;
  request_id?: number | null;
  storage_id?: number | null;
  crate_id?: number | null;
  document_id?: number | null;
  message: string;
  ip_address?: string;
  user_agent?: string;
}

// API Request/Response types
export interface DigitalSignatureRequest {
  digital_signature: string;
}

export interface StorageRequestCreate {
  unit: number;
  department: number;
  section?: number | null;  // Section for barcode
  destruction_date?: string | null;  // Optional for retained crates
  purpose: string;
  to_central?: boolean;  // Send to central storage
  to_be_retained?: boolean;  // No destruction date required
  documents: Array<{
    document_name: string;
    document_number: string;
    document_type: 'Physical' | 'Digital';
  }>;
  digital_signature: string;
}

export interface WithdrawalRequestCreate {
  crate_id: number;
  expected_return_date: string;
  purpose: string;
  full_withdrawal: boolean;
  document_ids?: number[];
  digital_signature: string;
}

export interface DestructionRequestCreate {
  crate_id: number;
  digital_signature: string;
}

export interface ApproveRequestPayload {
  digital_signature: string;
}

export interface RejectRequestPayload {
  reason: string;
  digital_signature: string;
}

export interface SendBackPayload {
  reason: string;
  digital_signature: string;
}

export interface AllocateStoragePayload {
  storage: number;
  digital_signature: string;
}

export interface IssueDocumentsPayload {
  digital_signature: string;
}

export interface ReturnDocumentsPayload {
  storage: number;
  reason?: string;
  digital_signature: string;
}

export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  error: string;
  message?: string;
  detail?: string;
}

export interface DashboardKPIs {
  total_stored_crates: number;
  withdrawals_in_progress: number;
  overdue_returns: number;
  pending_approvals: number;
}

export interface ReportFilter {
  unit_id?: number;
  department_id?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
  export?: 'pdf' | 'excel';
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
}
