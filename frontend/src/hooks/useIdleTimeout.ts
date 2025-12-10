import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

interface UseIdleTimeoutOptions {
  timeoutMinutes?: number;
  onIdle?: () => void;
  enabled?: boolean;
}

/**
 * Custom hook to detect user inactivity and automatically logout
 *
 * @param timeoutMinutes - Session timeout in minutes (default: 30)
 * @param onIdle - Optional callback when user becomes idle
 * @param enabled - Whether idle detection is enabled (default: true)
 */
export function useIdleTimeout({
  timeoutMinutes = 30,
  onIdle,
  enabled = true,
}: UseIdleTimeoutOptions = {}) {
  const { logout, user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000;
  // Show warning 1 minute before timeout
  const warningMs = Math.max(timeoutMs - 60 * 1000, 0);

  const handleIdle = useCallback(async () => {
    if (!enabled || !user || isLoggingOutRef.current) return;

    // Set flag to prevent multiple logout attempts
    isLoggingOutRef.current = true;

    // Call optional callback
    if (onIdle) {
      onIdle();
    }

    // Log session timeout to backend audit trail
    try {
      await api.post('/auth/session-terminate/', {
        reason: 'Session timeout due to inactivity'
      });
    } catch (error) {
      console.error('Error logging session timeout:', error);
      // Continue with logout even if logging fails
    }

    // Show toast notification
    toast.error('Session expired due to inactivity. Please login again.', {
      duration: 5000,
    });

    // Logout user (AuthContext handles redirect to login)
    await logout();
  }, [enabled, user, onIdle, logout]);

  const showWarning = useCallback(() => {
    if (!enabled || !user) return;

    toast('Your session will expire in 1 minute due to inactivity.', {
      icon: '⏰',
      duration: 60000, // Show for full minute
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #FCD34D',
      },
    });
  }, [enabled, user]);

  const resetTimer = useCallback(() => {
    if (!enabled || !user || isLoggingOutRef.current) return;

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timer (1 minute before logout)
    if (warningMs > 0) {
      warningTimeoutRef.current = setTimeout(showWarning, warningMs);
    }

    // Set logout timer
    timeoutRef.current = setTimeout(handleIdle, timeoutMs);
  }, [enabled, user, timeoutMs, warningMs, handleIdle, showWarning]);

  useEffect(() => {
    if (!enabled || !user) {
      // Clear timers if disabled or user logged out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      // Reset logout flag
      isLoggingOutRef.current = false;
      return;
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on user activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Start initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
    };
  }, [enabled, user, resetTimer]);

  return {
    resetTimer,
  };
}
