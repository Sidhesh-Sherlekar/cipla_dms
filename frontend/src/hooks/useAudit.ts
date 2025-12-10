import { useQuery, UseQueryResult } from '@tanstack/react-query';
import api from '../services/api';
import type { AuditTrail, ApiResponse } from '../types';

// Fetch audit trail with optional filters and pagination
export const useAuditTrail = (
  action?: string,
  userId?: number,
  requestId?: number,
  dateFrom?: string,
  dateTo?: string,
  search?: string,
  page?: number,
  pageSize?: number
): UseQueryResult<ApiResponse<AuditTrail>> => {
  return useQuery({
    queryKey: ['audit-trail', action, userId, requestId, dateFrom, dateTo, search, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      if (userId) params.append('user_id', userId.toString());
      if (requestId) params.append('request_id', requestId.toString());
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (search) params.append('search', search);
      if (page) params.append('page', page.toString());
      if (pageSize) params.append('page_size', pageSize.toString());

      const { data } = await api.get<ApiResponse<AuditTrail>>(
        `/audit/trail/?${params.toString()}`
      );
      return data;
    },
  });
};

// Fetch audit trail for specific request
export const useRequestAuditTrail = (
  requestId: number
): UseQueryResult<ApiResponse<AuditTrail>> => {
  return useQuery({
    queryKey: ['audit-trail', 'request', requestId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AuditTrail>>(
        `/audit/trail/?request_id=${requestId}`
      );
      return data;
    },
    enabled: !!requestId,
  });
};
