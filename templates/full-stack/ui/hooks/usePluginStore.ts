'use client';

import { create } from 'zustand';
import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

interface PluginEvent {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

interface PluginInfo {
  plugin: string;
  version: string;
  uptime: number;
  started_at: string;
  memory: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
  };
}

interface PluginState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  events: PluginEvent[];
  pluginInfo: PluginInfo | null;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  addEvent: (event: PluginEvent) => void;
  setPluginInfo: (info: PluginInfo) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  connectionStatus: 'disconnected',
  events: [],
  pluginInfo: null,
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 100), // Keep last 100 events
    })),
  setPluginInfo: (info) => set({ pluginInfo: info }),
}));

/**
 * Hook to manage WebSocket connection to the plugin backend.
 * Automatically connects on mount and reconnects on disconnect.
 */
export function useWebSocket() {
  const { setConnectionStatus, addEvent } = usePluginStore();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;

    function connect() {
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
        return;
      }

      setConnectionStatus('connecting');

      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          setConnectionStatus('connected');
          reconnectAttempts = 0;
          addEvent({
            type: 'ws:connected',
            timestamp: new Date().toISOString(),
          });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addEvent(data);
          } catch {
            // Non-JSON message
          }
        };

        ws.onclose = () => {
          setConnectionStatus('disconnected');
          ws = null;

          // Reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectTimer = setTimeout(() => {
              reconnectAttempts++;
              connect();
            }, delay);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        setConnectionStatus('disconnected');
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null; // Prevent reconnect on intentional close
        ws.close();
      }
    };
  }, [setConnectionStatus, addEvent]);
}

/**
 * Hook to fetch plugin health info periodically.
 */
export function usePluginInfo() {
  const { setPluginInfo } = usePluginStore();

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) {
          const data = await res.json();
          setPluginInfo(data);
        }
      } catch {
        // API not reachable
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Every 30s

    return () => clearInterval(interval);
  }, [setPluginInfo]);
}
