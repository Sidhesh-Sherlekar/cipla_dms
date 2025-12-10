import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Fetch all roles
export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/auth/roles/');
      return response.data;
    },
  });
};

// Fetch single role details
export const useRole = (id: number) => {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      const response = await api.get(`/auth/roles/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Fetch all permissions (Django model permissions - legacy)
export const usePermissions = () => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get('/auth/permissions/');
      return response.data;
    },
  });
};

// Fetch all privileges (new privilege-based system)
export const usePrivileges = (grouped = false) => {
  return useQuery({
    queryKey: ['privileges', { grouped }],
    queryFn: async () => {
      const response = await api.get('/auth/privileges/', {
        params: { grouped: grouped ? 'true' : 'false' }
      });
      return response.data;
    },
  });
};

// Fetch current user's privileges
export const useUserPrivileges = () => {
  return useQuery({
    queryKey: ['user-privileges'],
    queryFn: async () => {
      const response = await api.get('/auth/user/privileges/');
      return response.data;
    },
  });
};

// Create new role
export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      role_name: string;
      description?: string;
      permission_ids?: number[];
      privilege_ids?: number[];
    }) => {
      const response = await api.post('/auth/roles/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

// Update role
export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: {
        role_name?: string;
        description?: string;
        permission_ids?: number[];
        privilege_ids?: number[];
      };
    }) => {
      const response = await api.put(`/auth/roles/${id}/`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.id] });
    },
  });
};

// Delete role
export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/auth/roles/${id}/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

// Fetch groups (alternative to roles)
export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/auth/groups/');
      return response.data;
    },
  });
};

// Fetch single group details
export const useGroup = (id: number) => {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: async () => {
      const response = await api.get(`/auth/groups/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Assign user to groups
export const useAssignUserToGroups = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      user_id: number;
      group_ids: number[];
    }) => {
      const response = await api.post('/auth/groups/assign-user/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Remove user from group
export const useRemoveUserFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      user_id: number;
      group_id: number;
    }) => {
      const response = await api.post('/auth/groups/remove-user/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
