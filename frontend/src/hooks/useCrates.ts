import { useQuery, UseQueryResult, useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Crate, ApiResponse } from '../types';

// Fetch all crates with optional filters
export const useCrates = (
  status?: string,
  unitId?: number
): UseQueryResult<ApiResponse<Crate>> => {
  return useQuery({
    queryKey: ['crates', status, unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (unitId) params.append('unit_id', unitId.toString());

      const { data } = await api.get<ApiResponse<Crate>>(
        `/crates/?${params.toString()}`
      );
      return data;
    },
    // Backend filters by user's accessible units when no unit_id is provided
  });
};

// Fetch single crate by ID
export const useCrate = (id: number): UseQueryResult<Crate> => {
  return useQuery({
    queryKey: ['crate', id],
    queryFn: async () => {
      const { data } = await api.get<Crate>(`/crates/${id}/`);
      return data;
    },
    enabled: !!id,
  });
};

// Fetch crate with documents
export const useCrateWithDocuments = (id: number): UseQueryResult<Crate> => {
  return useQuery({
    queryKey: ['crate', id, 'documents'],
    queryFn: async () => {
      const { data } = await api.get<Crate>(`/crates/${id}/?include_documents=true`);
      return data;
    },
    enabled: !!id,
  });
};

// Fetch active crates that are currently in storage (for withdrawal/destruction)
export const useCratesInStorage = (
  unitId?: number
): UseQueryResult<ApiResponse<Crate>> => {
  return useQuery({
    queryKey: ['crates', 'in_storage', unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unitId) params.append('unit_id', unitId.toString());

      const { data } = await api.get<ApiResponse<Crate>>(
        `/documents/crates/in_storage/?${params.toString()}`
      );
      return data;
    },
  });
};

// Relocate crate to new storage location
interface RelocateCratePayload {
  crate_id: number;
  storage_id: number;
  digital_signature: string;
}

interface RelocateCrateResponse {
  message: string;
  crate_id: number;
  old_location: string | null;
  new_location: string;
}

export const useRelocateCrate = (): UseMutationResult<
  RelocateCrateResponse,
  Error,
  RelocateCratePayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RelocateCratePayload) => {
      const { data } = await api.post<RelocateCrateResponse>(
        `/crates/${payload.crate_id}/relocate/`,
        {
          storage_id: payload.storage_id,
          digital_signature: payload.digital_signature
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};
