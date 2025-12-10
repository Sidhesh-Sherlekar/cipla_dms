import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Scan barcode and get crate details with requests
export const useScanBarcode = () => {
  return useMutation({
    mutationFn: async (barcode: string) => {
      const response = await api.get(`/documents/barcode/scan/`, {
        params: { barcode }
      });
      return response.data;
    },
  });
};

// Search crates by partial barcode
export const useSearchBarcode = () => {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await api.get(`/documents/barcode/search/`, {
        params: { q: query }
      });
      return response.data;
    },
  });
};

// Validate barcode format and existence
export const useValidateBarcode = () => {
  return useMutation({
    mutationFn: async (barcode: string) => {
      const response = await api.get(`/documents/barcode/validate/`, {
        params: { barcode }
      });
      return response.data;
    },
  });
};

// Get barcode image for a crate
export const useGetBarcodeImage = (crateId: number, format: 'svg' | 'png' = 'svg') => {
  return useQuery({
    queryKey: ['barcode-image', crateId, format],
    queryFn: async () => {
      const response = await api.get(`/documents/crates/${crateId}/barcode/base64/`, {
        params: { format }
      });
      return response.data;
    },
    enabled: !!crateId,
  });
};

// Get all requests for a crate by barcode
export const useGetCrateRequestsByBarcode = (barcode: string) => {
  return useQuery({
    queryKey: ['crate-requests-barcode', barcode],
    queryFn: async () => {
      const response = await api.get(`/documents/barcode/requests/`, {
        params: { barcode }
      });
      return response.data;
    },
    enabled: !!barcode,
  });
};

// Bulk print labels
export const useBulkPrintLabels = () => {
  return useMutation({
    mutationFn: async (crateIds: number[]) => {
      const response = await api.post(`/documents/barcode/bulk-print/`, {
        crate_ids: crateIds
      });
      return response.data;
    },
  });
};

// Download barcode image
export const downloadBarcodeImage = async (crateId: number, format: 'svg' | 'png' = 'svg') => {
  try {
    const response = await api.get(`/documents/crates/${crateId}/barcode/`, {
      params: { format },
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crate_${crateId}_barcode.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading barcode:', error);
    return false;
  }
};

// Print label for a crate
export const printCrateLabel = (crateId: number) => {
  const printWindow = window.open(
    `/api/documents/crates/${crateId}/print-label/`,
    '_blank',
    'width=800,height=600'
  );

  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
};

// Print bulk labels
export const printBulkLabels = async (crateIds: number[]) => {
  try {
    const response = await api.post(`/documents/barcode/bulk-print/`, {
      crate_ids: crateIds
    }, {
      responseType: 'blob'
    });

    // Create temporary window for printing
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);

    const printWindow = window.open(url, '_blank', 'width=800,height=600');

    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
          window.URL.revokeObjectURL(url);
        }, 250);
      });
    }

    return true;
  } catch (error) {
    console.error('Error printing bulk labels:', error);
    return false;
  }
};
