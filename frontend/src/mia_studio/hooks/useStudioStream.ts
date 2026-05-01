import { useState, useCallback, useEffect, useRef } from 'react';
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

interface UseStudioStreamReturn {
  logs: string[];
  graphEvents: StudioEvent[];
  connect: (executionId: string) => void;
  disconnect: () => void;
  clear: () => void;
  droppedCount: number; // P4: Sync Checkpoint
}

export const useStudioStream = (maxLogLines: number = 1000): UseStudioStreamReturn => {
  const { currentProjectId, currentSessionId } = useFileStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [graphEvents, setGraphEvents] = useState<StudioEvent[]>([]);
  const [droppedCount, setDroppedCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  
  // P4-X4: Sequence Guard State
  const lastSequenceRef = useRef<number>(0);

  const clear = useCallback(() => {
    setLogs([]);
    setGraphEvents([]);
    setDroppedCount(0);
    lastSequenceRef.current = 0;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
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

  const processEvents = useCallback((items: StudioEvent[]) => {
    const processedGraphEvents: StudioEvent[] = [];
    const processedLogs: string[] = [];

    items.forEach(data => {
      if (data.project_id && data.project_id !== currentProjectId) return;
      if (data.sequence_id !== -1 && data.sequence_id <= lastSequenceRef.current) return;
      if (data.sequence_id !== -1) lastSequenceRef.current = data.sequence_id;
      if (data.execution_id !== activeIdRef.current && data.type !== 'HEARTBEAT') return;
      if (data.type === 'HEARTBEAT') return;

      if (['GRAPH_START', 'NODE_START', 'NODE_END'].includes(data.type)) {
        processedGraphEvents.push(data);
      }
      if (data.type === 'INFO' || data.type === 'ERROR' || data.type === 'EXECUTION_END') {
        const timestamp = new Date(data.timestamp * 1000).toLocaleTimeString();
        const msg = `[${timestamp}] ${data.type}: ${data.payload.message || JSON.stringify(data.payload)}`;
        processedLogs.push(msg);
      }
    });

    if (processedGraphEvents.length > 0) {
      setGraphEvents(prev => [...prev, ...processedGraphEvents].slice(-500));
    }
    if (processedLogs.length > 0) {
      setLogs(prev => [...prev, ...processedLogs].slice(-maxLogLines));
    }
  }, [currentProjectId, activeIdRef, maxLogLines]);

  const connect = useCallback((executionId: string) => {
    if (!currentSessionId) return;
    
    disconnect();
    clear();
    activeIdRef.current = executionId;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/studio/graph/${executionId}?session_id=${currentSessionId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      const msgData: any = JSON.parse(event.data);
      
      // GAP-11: Sync Checkpoint & Reconciliation
      if (msgData.type === 'BATCH') {
        const { dropped_count, last_seq, events } = msgData.payload;
        
        if (dropped_count > 0) {
            setDroppedCount(dropped_count);
            // P11: If there's a sequence gap, fetch delta
            if (events.length > 0 && events[0].sequence_id > lastSequenceRef.current + 1) {
                console.log("[StudioStream] Gap detected, reconciling...");
                const missing = await fetchDelta(executionId, lastSequenceRef.current, events[0].sequence_id - 1);
                processEvents(missing);
            }
        }
        processEvents(events);
      } else {
        processEvents([msgData]);
      }
    };

    ws.onerror = (err) => console.error("[StudioStream] WS Error:", err);
  }, [disconnect, clear, maxLogLines, currentProjectId, currentSessionId]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { logs, graphEvents, connect, disconnect, clear };
};
