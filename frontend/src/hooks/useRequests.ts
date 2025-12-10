import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import api, { withDigitalSignature } from '../services/api';
import type {
  Request,
  ApiResponse,
  StorageRequestCreate,
  WithdrawalRequestCreate,
  DestructionRequestCreate,
  ApproveRequestPayload,
  RejectRequestPayload,
  SendBackPayload,
  AllocateStoragePayload,
  IssueDocumentsPayload,
  ReturnDocumentsPayload,
} from '../types';

// Fetch all requests with optional filters
export const useRequests = (
  requestType?: string,
  status?: string,
  unitId?: number
): UseQueryResult<Request[]> => {
  return useQuery({
    queryKey: ['requests', requestType, status, unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (requestType) params.append('request_type', requestType);
      if (status) params.append('status', status);
      if (unitId) params.append('unit', unitId.toString());

      const { data } = await api.get<ApiResponse<Request>>(
        `/requests/?${params.toString()}`
      );
      console.log(data);
      console.log(data.results);
      return data.results;

    },
  });
};

// Fetch single request by ID
export const useRequest = (id: number): UseQueryResult<Request> => {
  return useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data } = await api.get<Request>(`/requests/${id}/`);
      return data;
    },
    enabled: !!id,
  });
};

// Create storage request
export const useCreateStorageRequest = (): UseMutationResult<
  any,
  Error,
  StorageRequestCreate
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StorageRequestCreate) => {
      const { data } = await api.post('/requests/storage/create/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Create withdrawal request
export const useCreateWithdrawalRequest = (): UseMutationResult<
  any,
  Error,
  WithdrawalRequestCreate
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WithdrawalRequestCreate) => {
      const { data } = await api.post('/requests/withdrawal/create/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Create destruction request
export const useCreateDestructionRequest = (): UseMutationResult<
  any,
  Error,
  DestructionRequestCreate
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DestructionRequestCreate) => {
      const { data } = await api.post('/requests/destruction/create/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Approve request
export const useApproveRequest = (): UseMutationResult<
  any,
  Error,
  { request_id: number; digital_signature: string }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request_id,
      digital_signature,
    }: {
      request_id: number;
      digital_signature: string;
    }) => {
      const { data } = await api.post(
        `/requests/${request_id}/approve/`,
        { digital_signature }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.request_id] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Reject request
export const useRejectRequest = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & RejectRequestPayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request_id,
      reason,
      digital_signature,
    }: {
      request_id: number;
      reason: string;
      digital_signature: string;
    }) => {
      const { data } = await api.post(`/requests/${request_id}/reject/`, {
        reason,
        digital_signature,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.request_id] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Send back request
export const useSendBackRequest = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & SendBackPayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request_id,
      reason,
      digital_signature,
    }: {
      request_id: number;
      reason: string;
      digital_signature: string;
    }) => {
      const { data } = await api.post(`/requests/${request_id}/send-back/`, {
        reason,
        digital_signature,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.request_id] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Allocate storage
export const useAllocateStorage = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & AllocateStoragePayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request_id,
      ...payload
    }: {
      request_id: number;
    } & AllocateStoragePayload) => {
      const { data } = await api.post(
        `/requests/${request_id}/allocate-storage/`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Issue documents
export const useIssueDocuments = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & IssueDocumentsPayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request_id,
      digital_signature,
    }: {
      request_id: number;
      digital_signature: string;
    }) => {
      const { data } = await api.post(`/requests/${request_id}/issue/`, {
        digital_signature,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.request_id] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Return documents
export const useReturnDocuments = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & ReturnDocumentsPayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request_id,
      storage,
      reason,
      digital_signature,
    }: {
      request_id: number;
      storage: number;
      reason?: string;
      digital_signature: string;
    }) => {
      const { data } = await api.post(`/requests/${request_id}/return/`, {
        storage,
        reason,
        digital_signature,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.request_id] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Update storage request
export const useUpdateStorageRequest = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & Omit<StorageRequestCreate, 'unit'>
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ request_id, ...payload }: { request_id: number } & Omit<StorageRequestCreate, 'unit'>) => {
      const { data } = await api.patch(`/requests/storage/${request_id}/update/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Update withdrawal request
export const useUpdateWithdrawalRequest = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & Omit<WithdrawalRequestCreate, 'crate_id'>
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ request_id, ...payload }: { request_id: number } & Omit<WithdrawalRequestCreate, 'crate_id'>) => {
      const { data } = await api.patch(`/requests/withdrawal/${request_id}/update/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};

// Update destruction request
export const useUpdateDestructionRequest = (): UseMutationResult<
  any,
  Error,
  { request_id: number; purpose?: string; digital_signature: string }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ request_id, purpose, digital_signature }: { request_id: number; purpose?: string; digital_signature: string }) => {
      const { data } = await api.patch(`/requests/destruction/${request_id}/update/`, {
        purpose,
        digital_signature
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['crates'] });
    },
  });
};
