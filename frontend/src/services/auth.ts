import api from './api';
import type { LoginRequest, LoginResponse, User } from '../types';

export const authService = {
  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login/', credentials);

    // Store tokens and user info
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    return response.data;
  },

  // Logout - call backend to log audit trail
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint to log audit trail
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Error logging out on backend:', error);
      // Continue with local logout even if backend call fails
    } finally {
      // Clear local storage regardless of backend response
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  // Session terminate - call backend to log session termination
  async sessionTerminate(reason: string = 'Tab/window closed'): Promise<void> {
    try {
      // Call backend to log session termination
      await api.post('/auth/session-terminate/', { reason });
    } catch (error) {
      console.error('Error logging session termination:', error);
      // Continue with local cleanup even if backend call fails
    } finally {
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  // Get current user from localStorage
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  },

  // Get refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },
};
