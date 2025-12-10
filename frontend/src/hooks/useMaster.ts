import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import api from '../services/api';
import type { Unit, Department, Section, Storage, User, ApiResponse } from '../types';

// Units
export const useUnits = (): UseQueryResult<ApiResponse<Unit>> => {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Unit>>('/auth/units/');
      return data;
    },
  });
};

// Departments
export const useDepartments = (unitId?: number): UseQueryResult<ApiResponse<Department>> => {
  return useQuery({
    queryKey: ['departments', unitId],
    queryFn: async () => {
      const params = unitId ? `?unit_id=${unitId}` : '';
      const { data } = await api.get<ApiResponse<Department>>(`/auth/departments/${params}`);
      return data;
    },
  });
};

// Sections
export const useSections = (departmentId?: number, unitId?: number): UseQueryResult<ApiResponse<Section>> => {
  return useQuery({
    queryKey: ['sections', departmentId, unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentId) params.append('department_id', departmentId.toString());
      if (unitId) params.append('unit_id', unitId.toString());
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const { data } = await api.get<ApiResponse<Section>>(`/auth/sections/${queryString}`);
      return data;
    },
  });
};

// Storage locations
export const useStorageLocations = (unitId?: number): UseQueryResult<ApiResponse<Storage>> => {
  return useQuery({
    queryKey: ['storage', unitId],
    queryFn: async () => {
      const params = unitId ? `?unit_id=${unitId}` : '';
      const { data } = await api.get<ApiResponse<Storage>>(`/storage/${params}`);
      return data;
    },
  });
};

// Users
export const useUsers = (): UseQueryResult<ApiResponse<User>> => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User>>('/users/');
      return data;
    },
  });
};

// Create unit
export const useCreateUnit = (): UseMutationResult<Unit, Error, Partial<Unit>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Unit>) => {
      const { data } = await api.post<Unit>('/auth/units/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
};

// Update unit
export const useUpdateUnit = (): UseMutationResult<Unit, Error, { id: number } & Partial<Unit>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & Partial<Unit>) => {
      const { data } = await api.put<Unit>(`/auth/units/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
};

// Delete unit
export const useDeleteUnit = (): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/auth/units/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
};

// Create department
export const useCreateDepartment = (): UseMutationResult<Department, Error, { department_name: string; unit_id: number; department_head_id?: number | null }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { department_name: string; unit_id: number; department_head_id?: number | null }) => {
      const { data } = await api.post<Department>('/auth/departments/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

// Update department
export const useUpdateDepartment = (): UseMutationResult<Department, Error, { id: number } & Partial<Department>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & Partial<Department>) => {
      const { data } = await api.put<Department>(`/auth/departments/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

// Delete department
export const useDeleteDepartment = (): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/auth/departments/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

// Create section
export const useCreateSection = (): UseMutationResult<Section, Error, { section_name: string; department_id: number }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { section_name: string; department_id: number }) => {
      const { data } = await api.post<Section>('/auth/sections/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

// Update section
export const useUpdateSection = (): UseMutationResult<Section, Error, { id: number } & Partial<Section>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & Partial<Section>) => {
      const { data } = await api.put<Section>(`/auth/sections/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

// Delete section
export const useDeleteSection = (): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/auth/sections/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

// Create storage location
export const useCreateStorage = (): UseMutationResult<Storage, Error, Partial<Storage>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Storage>) => {
      const { data } = await api.post<Storage>('/storage/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
};

// Bulk create storage locations
export const useBulkCreateStorage = (): UseMutationResult<Storage[], Error, any> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post<Storage[]>('/storage/bulk-create/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
};
