import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WS_EVENT_BUS, WebSocketContext } from '../hooks/useWebSocket';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat/heartbeat`;

    console.log(`[WS] Connecting to ${wsUrl}...`);
    setStatus('connecting');

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("[WS] Connected");
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    socket.onclose = () => {
      setStatus('disconnected');
      if (!isMountedRef.current) return;

      if (reconnectAttemptsRef.current < 10) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.warn(`[WS] Connection lost. Retrying in ${delay}ms... (Attempt ${reconnectAttemptsRef.current + 1})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        WS_EVENT_BUS.dispatchEvent(new CustomEvent('ws:message', { detail: data }));
        if (data.type && data.type !== 'message') {
          WS_EVENT_BUS.dispatchEvent(new CustomEvent(`ws:${data.type}`, { detail: data }));
        }
      } catch (err) {
        console.error("[WS] Failed to parse message:", err);
      }
    };
  }, []);

  const send = useCallback((msg: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    } else {
      console.warn("[WS] Tried to send but socket is not open");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ send, status, isReady: status === 'connected' }}>
      {children}
    </WebSocketContext.Provider>
  );
}


