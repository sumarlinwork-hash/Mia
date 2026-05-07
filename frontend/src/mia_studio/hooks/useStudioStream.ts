import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useFileStore } from '../context/FileStoreContext';

export interface StudioEvent {
  execution_id: string;
  project_id: string;
  sequence_id: number; // P4-X4: Sequence for ordering
  timestamp: number;
  type: string;
  node_id?: string;
  payload: Record<string, unknown>;
  priority: number; // P3: Event Priority
}

export interface UseStudioStreamReturn {
  logs: string[];
  graphEvents: StudioEvent[];
  connect: (executionId: string, isSystem?: boolean) => void;
  disconnect: () => void;
  clear: () => void;
  droppedCount: number; // P4: Sync Checkpoint
  onEvent: (cb: (event: StudioEvent) => void) => void;
  offEvent: (cb: (event: StudioEvent) => void) => void;
}

export const useStudioStream = (maxLogLines: number = 1000): UseStudioStreamReturn => {
  const { currentProjectId, currentSessionId } = useFileStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [graphEvents, setGraphEvents] = useState<StudioEvent[]>([]);
  const [droppedCount, setDroppedCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);
  const MAX_RECONNECT = 5;
  
  // P4-X4: Sequence Guard State
  const lastSequenceRef = useRef<number>(0);

  const clear = useCallback(() => {
    setLogs([]);
    setGraphEvents([]);
    setDroppedCount(0);
    lastSequenceRef.current = 0;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, []);

  const fetchDelta = useCallback(async (executionId: string, from: number, to: number) => {
    try {
      const response = await fetch(`/api/studio/graph/delta/${executionId}?from=${from}&to=${to}&session_id=${currentSessionId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (err) {
      console.error("[StudioStream] Delta fetch failed:", err);
      return [];
    }
  }, [currentSessionId]);

  const listenersRef = useRef<((event: StudioEvent) => void)[]>([]);

  const onEvent = useCallback((cb: (event: StudioEvent) => void) => {
    listenersRef.current.push(cb);
  }, []);

  const offEvent = useCallback((cb: (event: StudioEvent) => void) => {
    listenersRef.current = listenersRef.current.filter(l => l !== cb);
  }, []);

  const processEvents = useCallback((items: StudioEvent[]) => {
    if (!items.length) return;
    
    // Notify listeners
    items.forEach(item => {
        listenersRef.current.forEach(l => l(item));
    });

    // Finding #3: Set-based reconciliation (Deduplication & Order Resilience)
    setLogs(prev => {
        // We use string logs here, but we can dedupe by simple string comparison or timestamp
        const newLogs: string[] = [];
        items.forEach(data => {
            if (data.project_id && data.project_id !== currentProjectId) return;
            if (data.type === 'LOG' || data.type === 'INFO' || data.type === 'ERROR' || data.type === 'EXECUTION_END') {
                const timestamp = new Date(data.timestamp * 1000).toLocaleTimeString();
                const msg = `[${timestamp}] ${data.type}: ${data.payload.message || JSON.stringify(data.payload)}`;
                newLogs.push(msg);
            }
        });
        return [...prev, ...newLogs].slice(-maxLogLines);
    });

    setGraphEvents(prev => {
        const eventMap = new Map(prev.map(e => [e.sequence_id, e]));
        
        items.forEach(data => {
            if (data.project_id && data.project_id !== currentProjectId) return;
            if (!['LOG', 'INFO', 'ERROR', 'EXECUTION_END', 'BATCH', 'HEARTBEAT'].includes(data.type)) {
                eventMap.set(data.sequence_id, data);
                if (data.sequence_id > lastSequenceRef.current) {
                    lastSequenceRef.current = data.sequence_id;
                }
            }
        });
        
        return Array.from(eventMap.values()).sort((a, b) => a.sequence_id - b.sequence_id);
    });
  }, [currentProjectId, maxLogLines]);

  const connect = useCallback((id: string, isSystem: boolean = false) => {
    // P11: Handshake Gate (Server Stability Guard)
    if (!currentSessionId || currentSessionId.length < 5) {
        return;
    }
    
    disconnect();
    clear();
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
    }
    
    isConnectingRef.current = true;
    activeIdRef.current = id;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // P4-X: Switch between execution-graph and project-system streams
    const endpoint = isSystem ? 'events' : 'graph';
    const wsUrl = `${protocol}//${host}/ws/studio/${endpoint}/${id}?session_id=${currentSessionId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
        console.log(`[StudioStream] Connected to ${endpoint}`);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        
        // P11: Heartbeat Lease Extension
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, 10000);
    };

    ws.onmessage = async (event: MessageEvent) => {
      const msgData = JSON.parse(event.data);
      
      // GAP-11: Sync Checkpoint & Reconciliation
      if (msgData.type === 'BATCH') {
        const { dropped_count, events } = msgData.payload;
        
        if (dropped_count > 0 && activeIdRef.current) {
            setDroppedCount(dropped_count);
            const missed = await fetchDelta(activeIdRef.current, lastSequenceRef.current, events[0]?.sequence_id || 0);
            processEvents([...missed, ...events]);
        } else {
            processEvents(events);
        }
      } else {
        processEvents([msgData]);
      }
    };

    ws.onerror = (err) => {
        console.error("[StudioStream] WS Error:", err);
        isConnectingRef.current = false;
        
        // P-STABILITY: Exponential Backoff Reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`[StudioStream] Retrying in ${delay}ms (Attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT})`);
            
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttemptsRef.current++;
                connect(id, isSystem);
            }, delay);
        } else {
            console.warn("[StudioStream] Max reconnect attempts reached. Stream offline.");
        }
    };

    ws.onclose = () => {
        if (!reconnectTimeoutRef.current) {
            isConnectingRef.current = false;
        }
    };
  }, [disconnect, clear, currentSessionId, fetchDelta, processEvents]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  const api = useMemo(() => ({
    logs, 
    graphEvents, 
    connect, 
    disconnect, 
    clear, 
    droppedCount,
    onEvent,
    offEvent
  }), [logs, graphEvents, connect, disconnect, clear, droppedCount, onEvent, offEvent]);

  return api;
};
