import React, { useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  type Node, 
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { StudioEvent } from '../hooks/useStudioStream';
import { Activity } from 'lucide-react';

interface GraphViewerProps {
  events: StudioEvent[];
}

export const GraphViewer: React.FC<GraphViewerProps> = ({ events }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Patch FE-5: Throttled Batch Update
  useEffect(() => {
    const timer = setInterval(() => {
      if (events.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      // Process events into nodes/edges
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const nodeSet = new Set<string>();

      events.forEach((ev, idx) => {
        if (!ev.node_id) return;

        if (!nodeSet.has(ev.node_id)) {
          newNodes.push({
            id: ev.node_id,
            data: { label: ev.node_id },
            position: { x: idx * 150, y: 100 },
            style: { 
              background: ev.type === 'NODE_START' ? '#3b82f6' : '#10b981',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 'bold',
              width: 120
            }
          });
          nodeSet.add(ev.node_id);

          // Simple linear edge for Phase 1
          if (newNodes.length > 1) {
            newEdges.push({
              id: `e-${idx}`,
              source: newNodes[newNodes.length - 2].id,
              target: ev.node_id,
              animated: true,
              style: { stroke: '#3b82f6' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
            });
          }
        } else {
          // Update existing node style if ended
          const node = newNodes.find(n => n.id === ev.node_id);
          if (node && ev.type === 'NODE_END') {
            node.style = { ...node.style, background: '#10b981' };
          }
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    }, 200); // 200ms throttling (Patch FE-5)

    return () => clearInterval(timer);
  }, [events, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-[#0d0d0d]/80 backdrop-blur-md border border-white/5 rounded-lg overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
        <Activity size={14} className="text-blue-400 animate-pulse" />
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Cognitive Flow</span>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="studio-graph"
      >
        <Background color="#333" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
