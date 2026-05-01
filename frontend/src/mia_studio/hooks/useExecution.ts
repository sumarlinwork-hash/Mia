import { useState, useCallback } from 'react';

export type ExecutionState = 'IDLE' | 'STARTING' | 'RUNNING' | 'TERMINATING' | 'COMPLETED' | 'ERROR';

interface UseExecutionReturn {
  state: ExecutionState;
  executionId: string | null;
  error: string | null;
  runCode: (sessionId: string, code: string) => Promise<string | null>;
  stopCode: (sessionId: string) => Promise<void>;
  setCompleted: () => void;
  setError: (msg: string) => void;
  setRunning: () => void;
}

export const useExecution = (): UseExecutionReturn => {
  const [state, setState] = useState<ExecutionState>('IDLE');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const runCode = useCallback(async (sessionId: string, code: string) => {
    if (state === 'STARTING' || state === 'RUNNING' || isRequesting) return null;
    
    setIsRequesting(true);
    setState('STARTING');
    setErrorState(null);
    try {
      const res = await fetch('/api/studio/execution/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, path: '', content: code })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setExecutionId(data.execution_id);
        // We stay in STARTING until the WebSocket confirms it's RUNNING or we manually transition
        return data.execution_id;
      } else {
        setState('ERROR');
        setErrorState(data.message);
        return null;
      }
    } catch (err: unknown) {
      setState('ERROR');
      setErrorState(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsRequesting(false);
    }
  }, [state, isRequesting]);

  const stopCode = useCallback(async (sessionId: string) => {
    if (!executionId) return;
    setState('TERMINATING');
    try {
      const res = await fetch('/api/studio/execution/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, path: executionId })
      });
      const data = await res.json();
      if (data.status !== 'success') {
        // Even if API fails, we wait for EXECUTION_END signal from WS
        console.error("Stop API failed:", data.message);
      }
    } catch (err: unknown) {
      console.error("Stop API error:", err);
    }
  }, [executionId]);

  const setCompleted = useCallback(() => setState('COMPLETED'), []);
  const setError = useCallback((msg: string) => {
    setState('ERROR');
    setErrorState(msg);
  }, []);
  const setRunning = useCallback(() => setState('RUNNING'), []);

  return {
    state,
    executionId,
    error,
    runCode,
    stopCode,
    setCompleted,
    setError,
    setRunning
  };
};
