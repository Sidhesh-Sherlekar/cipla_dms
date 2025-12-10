import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import api from '../services/api';
import type { ApiResponse } from '../types';

export interface Group {
  id: number;
  name: string;
  permissions: string[];
  user_count?: number;
  users?: Array<{ id: number; username: string; full_name: string }>;
}

export interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: number;
}

export interface SecurityPolicies {
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special: boolean;
    password_expiry_days: number;
  };
  session_policy: {
    session_timeout_minutes: number;
    max_concurrent_sessions: number;
    timeout_options?: Array<{ value: number; label: string }>;
    can_update?: boolean;
  };
  account_policy: {
    max_login_attempts: number;
    lockout_duration_minutes: number;
    require_email_verification: boolean;
  };
  audit_policy: {
    log_all_access: boolean;
    log_retention_days: number;
  };
  two_factor: {
    enabled: boolean;
    required_for_admin: boolean;
  };
}

// Fetch all groups
export const useGroups = (): UseQueryResult<ApiResponse<Group>> => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Group>>('/auth/groups/');
      return data;
    },
  });
};

// Fetch single group by ID
export const useGroup = (id: number): UseQueryResult<Group> => {
  return useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const { data } = await api.get<Group>(`/auth/groups/${id}/`);
      return data;
    },
    enabled: !!id,
  });
};

// Create group
export const useCreateGroup = (): UseMutationResult<Group, Error, { name: string; permission_ids?: number[] }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; permission_ids?: number[] }) => {
      const { data } = await api.post<Group>('/auth/groups/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Update group
export const useUpdateGroup = (): UseMutationResult<Group, Error, { id: number; name?: string; permission_ids?: number[] }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; permission_ids?: number[] }) => {
      const { data } = await api.put<Group>(`/auth/groups/${id}/`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
    },
  });
};

// Delete group
export const useDeleteGroup = (): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/auth/groups/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Assign user to groups
export const useAssignUserToGroups = (): UseMutationResult<any, Error, { user_id: number; group_ids: number[] }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { user_id: number; group_ids: number[] }) => {
      const { data } = await api.post('/auth/groups/assign-user/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Remove user from group
export const useRemoveUserFromGroup = (): UseMutationResult<any, Error, { user_id: number; group_id: number }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { user_id: number; group_id: number }) => {
      const { data } = await api.post('/auth/groups/remove-user/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Fetch all permissions
export const usePermissions = (): UseQueryResult<ApiResponse<Permission> & { grouped: Record<number, Permission[]> }> => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Permission> & { grouped: Record<number, Permission[]> }>('/auth/permissions/');
      return data;
    },
  });
};

// Fetch security policies
export const useSecurityPolicies = (): UseQueryResult<SecurityPolicies> => {
  return useQuery({
    queryKey: ['security-policies'],
    queryFn: async () => {
      const { data } = await api.get<SecurityPolicies>('/auth/security-policies/');
      return data;
    },
    enabled: !!localStorage.getItem('access_token'), // Only fetch when authenticated
  });
};

// Update security policies
export const useUpdateSecurityPolicies = (): UseMutationResult<any, Error, Partial<SecurityPolicies>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<SecurityPolicies>) => {
      const { data } = await api.put('/auth/security-policies/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
    },
  });
};

// Update session timeout
export const useUpdateSessionTimeout = (): UseMutationResult<any, Error, { session_timeout_minutes: number }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { session_timeout_minutes: number }) => {
      const { data } = await api.post('/auth/session-timeout/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
    },
  });
};

// Update password expiry
export const useUpdatePasswordExpiry = (): UseMutationResult<any, Error, { password_expiry_days: number }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { password_expiry_days: number }) => {
      const { data } = await api.post('/auth/password-expiry/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
    },
  });
};

// Reset user password
export const useResetUserPassword = (): UseMutationResult<any, Error, { user_id: number; new_password: string; reason?: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { user_id: number; new_password: string; reason?: string }) => {
      const { data } = await api.post('/auth/users/reset-password/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Unlock user account
export const useUnlockUser = (): UseMutationResult<any, Error, { user_id: number; reason?: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { user_id: number; reason?: string }) => {
      const { data } = await api.post('/auth/users/unlock/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
