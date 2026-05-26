import React from 'react';
import clsx from 'clsx';

interface StudioActivityStreamProps {
  events: unknown[];
  logs: string[];
}

/**
 * StudioActivityStream renders a real‑time view of the kernel activity.
 * It displays a list of graph events (e.g., thoughts, actions) and a log
 * stream coming from the backend. The UI follows the existing premium
 * aesthetic – dark background, glass‑like panels and subtle hover
 * effects – to keep the experience consistent across all kernels.
 */
export const StudioActivityStream: React.FC<StudioActivityStreamProps> = ({
  events,
  logs,
}) => {
  return (
    <div className="flex flex-col gap-2 p-2 bg-black/30 backdrop-blur-md border border-white/5 rounded-lg mb-2">
      {/* Events Section */}
      <div className="overflow-y-auto max-h-[150px] pb-2">
        <h4 className="text-xs font-mono font-bold text-white/70 mb-1">
          Events
        </h4>
        {events.length === 0 ? (
          <p className="text-xs text-white/30">No events yet.</p>
        ) : (
          events.map((e, i) => (
            <div
              key={i}
              className={clsx(
                "text-xs py-1 px-2 rounded",
                i % 2 === 0 ? "bg-white/5" : "bg-white/10"
              )}
            >
              {JSON.stringify(e)}
            </div>
          ))
        )}
      </div>

      {/* Logs Section */}
      <div className="overflow-y-auto max-h-[120px]">
        <h4 className="text-xs font-mono font-bold text-white/70 mb-1">
          Logs
        </h4>
        {logs.length === 0 ? (
          <p className="text-xs text-white/30">No logs yet.</p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={clsx(
                "text-xs py-1 px-2 rounded",
                i % 2 === 0 ? "bg-white/5" : "bg-white/10"
              )}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
