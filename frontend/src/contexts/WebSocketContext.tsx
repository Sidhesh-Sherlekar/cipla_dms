/**
 * WebSocket Context for Real-Time Updates
 *
 * Provides WebSocket connection management and real-time data synchronization
 * across the application. All connected clients in the same unit receive
 * updates when any user makes changes.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  entity?: string;
  action?: string;
  data?: any;
  timestamp?: string;
  message?: string;
  reason?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user, accessToken, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  // Handler callbacks defined before connect
  const handleDataUpdate = useCallback((message: WebSocketMessage) => {
    console.log('Data update received:', message);

    // Invalidate relevant queries based on the entity type
    const { entity, action } = message;

    if (!entity) return;

    // Map entity types to query keys
    const queryKeys: Record<string, string[]> = {
      'request': ['requests', 'request', 'withdrawal-requests', 'destruction-requests', 'storage-requests'],
      'sendback': ['sendback-records', 'sendbacks', 'requests'],
      'crate': ['crates', 'crate'],
    };

    const keysToInvalidate = queryKeys[entity] || [];

    keysToInvalidate.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });

    // Also invalidate dashboard and summary queries
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  }, [queryClient]);

  const handleForceLogout = useCallback((message: WebSocketMessage) => {
    console.warn('Forced logout received:', message.reason);

    // Dynamically import toast to show notification
    import('react-hot-toast').then(({ default: toast }) => {
      toast.error(message.reason || 'You have been logged out by an administrator.', {
        duration: 5000,
      });
    });

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);

    // Clear reconnect attempts to prevent auto-reconnect
    reconnectAttemptsRef.current = maxReconnectAttempts;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Logout user after a short delay to ensure toast is shown
    setTimeout(() => {
      logout();
    }, 500);
  }, [logout, maxReconnectAttempts]);

  const connect = useCallback(() => {
    if (!accessToken || !user) {
      return;
    }

    // Don't connect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/updates/?token=${accessToken}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle different message types
          if (message.type === 'connection_established') {
            console.log('WebSocket connection established:', message.message);
          } else if (message.type === 'data_update') {
            handleDataUpdate(message);
          } else if (message.type === 'force_logout') {
            handleForceLogout(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [accessToken, user, handleDataUpdate, handleForceLogout]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Connect when user logs in
  useEffect(() => {
    if (user && accessToken) {
      connect();
    }

    // Cleanup on unmount or when user logs out
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, accessToken, connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping', timestamp: new Date().toISOString() });
    }, 30000); // Send ping every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
