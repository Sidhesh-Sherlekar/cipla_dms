import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { DigitalSignatureRequest } from '../types';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Try to refresh the token
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;

          // Save new access token
          localStorage.setItem('access_token', access);

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }

          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and let AuthContext handle showing login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');

          // Show session expiry message
          toast.error('Your session has expired. Please login again.', {
            duration: 5000,
          });

          // Reload the page to trigger AuthContext re-evaluation
          setTimeout(() => {
            window.location.reload();
          }, 500);

          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - clear tokens and let AuthContext handle showing login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');

        // Show session expiry message
        toast.error('Your session has expired. Please login again.', {
          duration: 5000,
        });

        // Reload the page to trigger AuthContext re-evaluation
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to add digital signature to any payload
export const withDigitalSignature = <T extends object>(
  data: T,
  password: string
): T & DigitalSignatureRequest => {
  return {
    ...data,
    digital_signature: password,
  };
};

// Helper to handle API errors
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'object' && data !== null) {
      // Check for common error fields
      if ('error' in data && typeof data.error === 'string') {
        return data.error;
      }
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
      if ('detail' in data && typeof data.detail === 'string') {
        return data.detail;
      }

      // If it's a validation error object, combine messages
      const messages: string[] = [];
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          messages.push(`${key}: ${value.join(', ')}`);
        } else if (typeof value === 'string') {
          messages.push(`${key}: ${value}`);
        }
      });

      if (messages.length > 0) {
        return messages.join('; ');
      }
    }

    return error.message || 'An error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
};

export default api;
