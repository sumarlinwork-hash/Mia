import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface GraphNode {
  id: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  dependencies: string[];
}

interface ExecutionGraph {
  id: string;
  nodes: Record<string, GraphNode>;
  status: string;
  graph_root_hash: string;
}

interface ExecutionVisualizerProps {
  graphId: string;
  onComplete?: (result: string) => void;
}

export const ExecutionVisualizer: React.FC<ExecutionVisualizerProps> = ({ graphId, onComplete }) => {
  const [graph, setGraph] = useState<ExecutionGraph | null>(null);
  const [isLive, setIsLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const resp = await fetch(`/api/graph/snapshot/${graphId}`);
      if (resp.ok) {
        const snapshot = await resp.json();
        setGraph(snapshot);
        console.log("[Reconciliation] Snapshot loaded as authority.");
      }
    } catch (err) {
      console.error("[Reconciliation] Failed to fetch snapshot:", err);
    }
  }, [graphId]);

  const connectStream = useCallback(() => {
    if (wsRef.current) wsRef.current.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/graph/${graphId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Stream] Connected to graph:", graphId);
      setIsLive(true);
    };

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      if (update.event_type === 'update') {
        const { event: nodeEvent } = update;
        setGraph(prev => {
          if (!prev) return null; // Authority Rule: Need snapshot or initial state first
          
          const newNodes = { ...prev.nodes };
          if (nodeEvent.node_id && newNodes[nodeEvent.node_id]) {
            const node = newNodes[nodeEvent.node_id];
            if (nodeEvent.type === 'NODE_START') node.status = 'running';
            if (nodeEvent.type === 'NODE_COMPLETE') node.status = 'completed';
            if (nodeEvent.type === 'NODE_FAIL') node.status = 'failed';
          }
          
          return { ...prev, nodes: newNodes, status: update.execution_state };
        });
      } else if (update.event_type === 'complete') {
        console.log("[Stream] Execution finished.");
        ws.close();
        if (onComplete) onComplete(update.execution_state);
      }
    };

    ws.onclose = () => {
      console.warn("[Stream] Connection lost. Triggering reconciliation...");
      setIsLive(false);
      // Authority Rule: If stream break detected -> SnapshotState becomes authoritative immediately
      fetchSnapshot();
    };

    ws.onerror = (err) => {
      console.error("[Stream] WebSocket error:", err);
    };
  }, [graphId, onComplete, fetchSnapshot]);

  useEffect(() => {
    fetchSnapshot(); // Load initial state
    connectStream(); // Start live updates

    const reconnectTimeout = reconnectTimeoutRef.current;
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [graphId, fetchSnapshot, connectStream]);

  if (!graph) return <div className="p-4 text-gray-400">Initializing OS Execution Graph...</div>;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          EXECUTION TRACE: {graphId}
        </h3>
        <span className="text-[10px] text-gray-500 font-mono">HASH: {graph.graph_root_hash?.substring(0, 8)}</span>
      </div>

      <div className="space-y-3">
        {Object.values(graph.nodes).map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-lg border ${
              node.status === 'running' ? 'bg-blue-900/20 border-blue-500/50' :
              node.status === 'completed' ? 'bg-green-900/20 border-green-500/50' :
              node.status === 'failed' ? 'bg-red-900/20 border-red-500/50' :
              'bg-gray-800/50 border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  node.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {node.tool[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200">{node.tool}</div>
                  <div className="text-[10px] text-gray-500">ID: {node.id}</div>
                </div>
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400">
                {node.status}
              </div>
            </div>
            
            {node.dependencies.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {node.dependencies.map(dep => (
                  <span key={dep} className="text-[8px] bg-gray-700 text-gray-400 px-1 rounded">← {dep}</span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
      
      {!isLive && graph.status === 'running' && (
        <div className="mt-4 text-[10px] text-yellow-500 text-center animate-pulse">
          Connection lost. Reconciling with system snapshot...
        </div>
      )}
    </div>
  );
};
