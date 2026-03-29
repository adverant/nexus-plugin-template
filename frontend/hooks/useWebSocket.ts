/**
 * WebSocket Hook — Standalone
 *
 * Provides WebSocket connection to the ProseCreator backend.
 * Supports the same API as the dashboard useWebSocket hook.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage?: (data: any) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

// WebSocket close codes for verbose diagnostics
const WS_CLOSE_CODES: Record<number, string> = {
  1000: 'Normal Closure',
  1001: 'Going Away',
  1002: 'Protocol Error',
  1003: 'Unsupported Data',
  1005: 'No Status Received (connection dropped without close frame — often Istio/proxy issue)',
  1006: 'Abnormal Closure (no close frame — network issue or server crash)',
  1007: 'Invalid Frame Payload',
  1008: 'Policy Violation',
  1009: 'Message Too Big',
  1010: 'Mandatory Extension',
  1011: 'Internal Server Error',
  1012: 'Service Restart',
  1013: 'Try Again Later',
  1014: 'Bad Gateway',
  1015: 'TLS Handshake Failed',
};

export function useWebSocket(
  url: string | null,
  options: UseWebSocketOptions = {}
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectCountRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!url) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
        optionsRef.current.onOpen?.();
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        optionsRef.current.onClose?.();

        const maxAttempts = optionsRef.current.reconnectAttempts ?? 10;
        const interval = optionsRef.current.reconnectInterval ?? 5000;

        if (event.code !== 1000) {
          // Abnormal close — log verbose diagnostic
          console.error(
            `[useWebSocket] Connection closed abnormally.\n` +
            `  URL: ${url}\n` +
            `  Code: ${event.code} (${WS_CLOSE_CODES[event.code] || 'Unknown'})\n` +
            `  Reason: ${event.reason || '(none)'}\n` +
            `  Clean: ${event.wasClean}\n` +
            `  Reconnect: ${reconnectCountRef.current + 1}/${maxAttempts}\n` +
            `  Troubleshooting:\n` +
            `    1. Check Istio DestinationRule: kubectl get destinationrule prosecreator-ws -n nexus\n` +
            `    2. Verify h2UpgradePolicy: DO_NOT_UPGRADE is set\n` +
            `    3. Test WS manually: new WebSocket('${url}')`
          );
        }

        if (reconnectCountRef.current < maxAttempts) {
          reconnectCountRef.current++;
          const backoff = Math.min(interval * Math.pow(1.5, reconnectCountRef.current - 1), 30000);
          setTimeout(connect, backoff);
        } else {
          console.error(
            `[useWebSocket] ALL ${maxAttempts} reconnect attempts EXHAUSTED.\n` +
            `  URL: ${url}\n` +
            `  Last close code: ${event.code}\n` +
            `  Progress updates are OFFLINE. Reload the page to retry.`
          );
        }
      };

      ws.onerror = (event) => {
        setIsConnected(false);
        console.error(`[useWebSocket] Connection error on ${url}`);
        optionsRef.current.onError?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          optionsRef.current.onMessage?.(data);
        } catch {
          // Non-JSON message
        }
      };
    } catch {
      setIsConnected(false);
    }
  }, [url]);

  const sendMessage = useCallback((data: unknown): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[useWebSocket] sendMessage failed — WebSocket not open', {
        readyState: ws?.readyState,
        readyStateLabel: ws ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ws.readyState] ?? 'UNKNOWN' : 'NULL',
      });
      return false;
    }
    ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }, []);

  const disconnect = useCallback(() => {
    reconnectCountRef.current = Infinity;
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      reconnectCountRef.current = Infinity;
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected, sendMessage, disconnect, ws: wsRef };
}
