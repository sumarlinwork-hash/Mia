import { createContext, useContext, useEffect } from 'react';

export const WS_EVENT_BUS = new EventTarget();

export interface WebSocketContextValue {
  send: (msg: string) => void;
  status: 'connected' | 'disconnected' | 'connecting';
  isReady: boolean;
}

export interface WSMessage {
  type: string;
  content?: string;
  stage?: string;
  message?: string;
  audio?: string;
  id?: number;
  role?: string;
  backend?: string;
  brain?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
  return ctx;
}

export function useWebSocketMessage<T = WSMessage>(handler: (data: T) => void) {
  useEffect(() => {
    const listener = (e: Event) => {
      handler((e as CustomEvent).detail as T);
    };
    WS_EVENT_BUS.addEventListener('ws:message', listener);
    return () => WS_EVENT_BUS.removeEventListener('ws:message', listener);
  }, [handler]);
}

export function useWebSocketEvent<T = WSMessage>(type: string, handler: (data: T) => void) {
  useEffect(() => {
    const listener = (e: Event) => {
      handler((e as CustomEvent).detail as T);
    };
    WS_EVENT_BUS.addEventListener(`ws:${type}`, listener);
    return () => WS_EVENT_BUS.removeEventListener(`ws:${type}`, listener);
  }, [type, handler]);
}
