import React from 'react';
import { Shield, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export interface ActionableFix {
  id: string;
  label: string;
  description: string;
  severity: string;
}

interface NodeStatus {
  name: string;
  success: boolean;
  latency: number;
}

interface ResilienceMonitorProps {
  health: number; // 0 to 1
  mode: string;
  nodes: NodeStatus[];
  suggestions?: ActionableFix[];
  projectId: string;
}

export const ResilienceMonitor: React.FC<ResilienceMonitorProps> = ({ health, mode, nodes, suggestions = [], projectId }) => {
  const percentage = Math.round(health * 100);
  
  const handleFix = async (fixId: string) => {
    try {
      const response = await fetch('/api/shad_csa/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix_id: fixId, project_id: projectId })
      });
      if (response.ok) {
        alert(`MIA successfully applied: ${fixId}`);
      }
    } catch (err) {
      console.error("[SHAD-CSA] Fix execution failed:", err);
    }
  };

  return (
    <div className="p-4 bg-[#0a0a0a]/80 border border-white/5 rounded-lg backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className={clsx(
            health > 0.8 ? "text-green-500" : health > 0.4 ? "text-yellow-500" : "text-red-500"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Resilience Engine v2.0</span>
        </div>
        <div className={clsx(
          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
          mode === 'NORMAL' ? "bg-green-500/20 text-green-400 border border-green-500/30" :
          mode === 'RECOVERY' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
          "bg-red-500/20 text-red-400 border border-red-500/30"
        )}>
          {mode}
        </div>
      </div>

      {/* Health Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-[9px] font-bold uppercase text-white/40">
          <span>Control Field Integrity</span>
          <span className="text-white/80">{percentage}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className={clsx(
              "h-full transition-all duration-1000 ease-out",
              health > 0.8 ? "bg-green-500" : health > 0.4 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Nodes Status */}
      <div className="space-y-2">
        <span className="text-[8px] font-black uppercase text-white/20 tracking-widest block mb-1">Active Execution Nodes</span>
        {nodes.length > 0 ? nodes.map((node, i) => (
          <div key={i} className="flex items-center justify-between bg-white/[0.02] p-2 rounded border border-white/5 group hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-2">
              {node.success ? (
                <CheckCircle2 size={12} className="text-green-500/80" />
              ) : (
                <AlertTriangle size={12} className="text-red-500/80" />
              )}
              <span className="text-[10px] font-medium text-white/70 truncate w-24">{node.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-white/30">{node.latency}ms</span>
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
            </div>
          </div>
        )) : (
          <div className="text-[9px] text-white/20 italic text-center py-2 border border-dashed border-white/5 rounded">
            Waiting for cycle...
          </div>
        )}
      </div>

      {/* Actionable Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-[9px] font-black uppercase text-yellow-400 tracking-widest">Actionable Solutions</span>
          </div>
          {suggestions.map((fix, i) => (
            <div key={i} className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg space-y-2">
               <div className="text-[10px] font-bold text-yellow-500">{fix.label}</div>
               <div className="text-[9px] text-white/50 leading-relaxed">{fix.description}</div>
               <button 
                onClick={() => handleFix(fix.id)}
                className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-[9px] font-black uppercase rounded transition-colors"
               >
                 Apply Resolution Now
               </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[8px] font-bold text-white/30 uppercase italic">
          <Zap size={10} className="animate-bounce" />
          <span>Distributed Consensus Active</span>
        </div>
      </div>
    </div>
  );
};
