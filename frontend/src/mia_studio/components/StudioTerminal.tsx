import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Info } from 'lucide-react';
import clsx from 'clsx';

interface StudioTerminalProps {
  logs: string[];
}

export const StudioTerminal: React.FC<StudioTerminalProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Smart Scroll: Only scroll if already at bottom (within 50px buffer)
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Patch FE-7: Error Normalization Parser
  const parseLog = (log: string) => {
    const isError = log.includes('ERROR:');
    const isEnd = log.includes('EXECUTION_END:');
    const isStudioError = log.includes('STUDIO_ERROR::');

    let type = 'INFO';
    if (isError || isStudioError) type = 'ERROR';
    if (isEnd) type = 'SUCCESS';

    let message = log;
    let detail = '';

    if (isStudioError) {
      // Format: [TIME] ERROR: STUDIO_ERROR::TYPE::MESSAGE
      const parts = log.split('STUDIO_ERROR::');
      if (parts.length > 1) {
        const [errType, errMsg] = parts[1].split('::');
        message = `[${errType}] ${errMsg}`;
        detail = 'Critical System Failure';
      }
    }

    return { type, message, detail };
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]/80 backdrop-blur-md border border-white/5 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
        <TerminalIcon size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-white/70 uppercase tracking-widest">System Output</span>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[13px] space-y-1 custom-scrollbar"
      >
        {logs.length === 0 && (
          <div className="text-white/20 italic flex items-center gap-2">
            <Info size={14} />
            <span>Awaiting execution stream...</span>
          </div>
        )}
        
        {logs.map((log, i) => {
          const { type, message, detail } = parseLog(log);
          return (
            <div 
              key={i} 
              className={clsx(
                "group flex gap-3 py-1 px-2 rounded transition-colors",
                type === 'ERROR' ? "bg-red-500/10 text-red-400 border-l-2 border-red-500" : 
                type === 'SUCCESS' ? "bg-green-500/10 text-green-400 border-l-2 border-green-500" :
                "text-white/80 hover:bg-white/5"
              )}
            >
              <div className="flex-1">
                <span className="whitespace-pre-wrap">{message}</span>
                {detail && <div className="text-[10px] uppercase font-bold opacity-50 mt-1">{detail}</div>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
