import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import api from '../services/api';
import type { ApiResponse } from '../types';

export interface Storage {
  id: number;
  unit: number;
  unit_code: string;
  room_name: string;
  rack_name: string;
  compartment_name: string;
  shelf_name?: string | null;
  full_location: string;
  created_at: string;
  updated_at: string;
}

export interface BulkCreateStoragePayload {
  unit_id: number;
  rooms: number;
  racks_per_room: number;
  compartments_per_rack: number;
  shelves_per_compartment?: number;
  alphabetical_rack?: boolean;
  alphabetical_compartment?: boolean;
  alphabetical_shelf?: boolean;
}

export interface BulkCreateStorageResponse {
  message: string;
  count: number;
  details: {
    unit_id: number;
    rooms: number;
    racks_per_room: number;
    compartments_per_rack: number;
    shelves_per_compartment?: number;
    storage_levels: number;
  };
}

// Fetch all storage locations
export const useStorage = (unitId?: number): UseQueryResult<ApiResponse<Storage>> => {
  return useQuery({
    queryKey: ['storage', unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unitId) params.append('unit_id', unitId.toString());

      const { data } = await api.get<ApiResponse<Storage>>(
        `/storage/?${params.toString()}`
      );
      return data;
    },
  });
};

// Fetch storage by unit
export const useStorageByUnit = (unitId: number): UseQueryResult<ApiResponse<Storage>> => {
  return useQuery({
    queryKey: ['storage', 'by-unit', unitId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Storage>>(
        `/storage/by-unit/${unitId}/`
      );
      return data;
    },
    enabled: !!unitId,
  });
};

// Create single storage location
export const useCreateStorage = (): UseMutationResult<Storage, Error, Omit<Storage, 'id' | 'unit_code' | 'full_location' | 'created_at' | 'updated_at'>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post<Storage>('/storage/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
};

// Bulk create storage locations
export const useBulkCreateStorage = (): UseMutationResult<BulkCreateStorageResponse, Error, BulkCreateStoragePayload> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkCreateStoragePayload) => {
      const { data } = await api.post<BulkCreateStorageResponse>('/storage/bulk-create/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
};

// Delete storage location
export const useDeleteStorage = (): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/storage/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
};
