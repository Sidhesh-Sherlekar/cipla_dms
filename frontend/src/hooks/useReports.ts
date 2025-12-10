import { useQuery, UseQueryResult } from '@tanstack/react-query';
import api from '../services/api';
import type { DashboardKPIs, ReportFilter } from '../types';

// Fetch stored documents report
export const useStoredDocumentsReport = (
  filters?: ReportFilter
): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['reports', 'stored-documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.unit_id) params.append('unit_id', filters.unit_id.toString());
      if (filters?.department_id)
        params.append('department_id', filters.department_id.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.export) params.append('export', filters.export);

      const config = filters?.export
        ? { responseType: 'blob' as const }
        : {};

      const { data } = await api.get(
        `/reports/stored-documents/?${params.toString()}`,
        config
      );
      return data;
    },
  });
};

// Fetch withdrawn documents report
export const useWithdrawnDocumentsReport = (
  filters?: ReportFilter
): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['reports', 'withdrawn-documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.unit_id) params.append('unit_id', filters.unit_id.toString());
      if (filters?.department_id)
        params.append('department_id', filters.department_id.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.export) params.append('export', filters.export);

      const config = filters?.export
        ? { responseType: 'blob' as const }
        : {};

      const { data } = await api.get(
        `/reports/withdrawn-documents/?${params.toString()}`,
        config
      );
      return data;
    },
  });
};

// Fetch overdue returns report
export const useOverdueReturnsReport = (
  filters?: ReportFilter
): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['reports', 'overdue-returns', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.unit_id) params.append('unit_id', filters.unit_id.toString());
      if (filters?.department_id)
        params.append('department_id', filters.department_id.toString());

      const { data } = await api.get(`/reports/overdue-returns/?${params.toString()}`);
      return data;
    },
  });
};

// Fetch destruction schedule report
export const useDestructionScheduleReport = (
  filters?: ReportFilter
): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['reports', 'destruction-schedule', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.unit_id) params.append('unit_id', filters.unit_id.toString());
      if (filters?.department_id)
        params.append('department_id', filters.department_id.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);

      const { data } = await api.get(`/reports/destruction-schedule/?${params.toString()}`);
      return data;
    },
  });
};

// Fetch dashboard KPIs
export const useDashboardKPIs = (unitId?: number): UseQueryResult<DashboardKPIs> => {
  return useQuery({
    queryKey: ['dashboard', 'kpis', unitId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unitId) params.append('unit_id', unitId.toString());

      const { data } = await api.get<DashboardKPIs>(`/reports/dashboard/kpis/?${params.toString()}`);
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};
