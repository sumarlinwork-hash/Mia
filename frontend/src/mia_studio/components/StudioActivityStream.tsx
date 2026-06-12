import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, Search, TerminalSquare, Loader2, CheckCircle2, AlertCircle, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface StudioActivityStreamProps {
  events: unknown[];
  logs: string[];
}

export const StudioActivityStream: React.FC<StudioActivityStreamProps> = ({ events, logs }) => {
  // If no events and no logs, we show nothing or a subtle placeholder
  if (events.length === 0 && logs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-2 w-full">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Sparkles size={12} className="text-primary" />
        <span className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest">Activity Stream</span>
      </div>
      
      <div className="flex flex-col gap-1.5 w-full max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {events.map((event, i) => (
          <ActivityEventItem key={`event-${i}`} event={event} isLast={i === events.length - 1} />
        ))}
        {logs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <span className="text-[10px] font-mono text-white/30 block mb-1">RAW LOGS</span>
            {logs.slice(-5).map((log, i) => (
               <div key={`log-${i}`} className="text-[10px] font-mono text-white/50 truncate opacity-70">
                 {'>'} {log}
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityEventItem = ({ event, isLast }: { event: unknown, isLast: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  // Fallback parsers for event metadata
  const type = (event as Record<string, unknown>)?.type || 'UNKNOWN';
  const data = (event as Record<string, unknown>)?.payload || (event as Record<string, unknown>)?.data || event;
  
  let icon = <Cpu size={12} className="text-white/40" />;
  let title = "Processing...";
  let statusColor = "text-white/70";

  // Pattern matching based on SSOT definitions
  const eventStr = JSON.stringify(event).toLowerCase();
  const dataRec = data as Record<string, unknown>;
  
  if (eventStr.includes('thought') || type === 'THOUGHT') {
    icon = <Cpu size={12} className="text-purple-400" />;
    title = `Thought for ${dataRec?.duration || 'few'}s`;
  } else if (eventStr.includes('analyz') || eventStr.includes('read_file')) {
    icon = <FileCode size={12} className="text-blue-400" />;
    title = `Analyzed ${dataRec?.file || 'file'} ${dataRec?.lines ? `#${dataRec.lines}` : ''}`;
  } else if (eventStr.includes('search') || eventStr.includes('grep')) {
    icon = <Search size={12} className="text-emerald-400" />;
    title = `Searched ${dataRec?.query || 'codebase'} (${dataRec?.results || 0} results)`;
  } else if (eventStr.includes('edit') || eventStr.includes('patch')) {
    icon = <FileCode size={12} className="text-amber-400" />;
    title = `Edited ${dataRec?.files_count || 1} file(s)`;
  } else if (eventStr.includes('ran') || eventStr.includes('command') || type === 'COMMAND') {
    icon = <TerminalSquare size={12} className="text-orange-400" />;
    title = `Ran command: ${dataRec?.command || 'script'}`;
  } else if (eventStr.includes('wait') || eventStr.includes('status')) {
    icon = <Loader2 size={12} className="text-cyan-400 animate-spin" />;
    title = `Waiting for completion...`;
  } else if (eventStr.includes('success') || eventStr.includes('done')) {
    icon = <CheckCircle2 size={12} className="text-green-500" />;
    title = `Task Succeeded`;
    statusColor = "text-green-400";
  } else if (eventStr.includes('fail') || eventStr.includes('error')) {
    icon = <AlertCircle size={12} className="text-red-500" />;
    title = `Task Failed`;
    statusColor = "text-red-400";
  } else if (eventStr.includes('block') || eventStr.includes('approv')) {
    icon = <ShieldAlert size={12} className="text-yellow-500" />;
    title = `Blocked: Pending Approval`;
    statusColor = "text-yellow-400";
  } else if (typeof event === 'string') {
    title = event;
  }

  // If it's the last event and seems active, pulse it
  const isActive = isLast && !eventStr.includes('success') && !eventStr.includes('fail') && !eventStr.includes('done');

  return (
    <div className={clsx(
      "flex flex-col bg-white/[0.02] border border-white/5 rounded-md overflow-hidden transition-all",
      expanded ? "bg-white/[0.04]" : "hover:bg-white/[0.04]",
      isActive ? "border-primary/20 shadow-[0_0_10px_rgba(208,255,0,0.05)]" : ""
    )}>
      <div 
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-white/30 hover:text-white/70 transition-colors p-0.5">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={clsx("shrink-0", isActive && "animate-pulse")}>
            {icon}
          </div>
          <span className={clsx("text-[11px] font-mono truncate", statusColor)}>
            {title}
          </span>
        </div>

        {isActive && (
          <Loader2 size={10} className="text-primary animate-spin shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="px-7 pb-2 text-[10px] font-mono text-white/40 break-all bg-black/20 border-t border-white/5 pt-1.5 mt-0.5">
          {typeof event === 'object' ? JSON.stringify(event, null, 2) : String(event)}
        </div>
      )}
    </div>
  );
};
