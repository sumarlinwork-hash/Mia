import { AlertTriangle, Bot, Cpu, Power, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../hooks/useConfig';
import type { WebSocketContextValue } from '../hooks/useWebSocket';

interface ShellStatusBarProps {
  wsStatus: WebSocketContextValue['status'];
  onEmergencyStop: () => void;
  hidden?: boolean;
}

const kernelLabels: Record<string, string> = {
  companion: 'Companion',
  studio: 'Studio',
  llm: 'LLM Warehouse',
  creator: 'Creator',
  market: 'Market',
};

function resolveKernel(pathname: string) {
  const key = pathname.split('/').filter(Boolean)[0] || 'companion';
  return kernelLabels[key] ?? 'Companion';
}

export default function ShellStatusBar({ wsStatus, onEmergencyStop, hidden = false }: ShellStatusBarProps) {
  const location = useLocation();
  const { config } = useConfig();
  const kernel = resolveKernel(location.pathname);
  const activeModel = config?.active_provider_override === 'auto'
    ? 'Dynamic Auto'
    : config?.active_provider_override || 'Dynamic Auto';
  const isConnected = wsStatus === 'connected';

  if (hidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[120] border-t border-white/10 bg-black/70 backdrop-blur-2xl px-4 py-2 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-[11px]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 font-bold uppercase tracking-[0.18em] text-primary">
            <Bot size={13} />
            {kernel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
            {isConnected ? <Wifi size={12} className="text-green-400" /> : <WifiOff size={12} className="text-amber-400" />}
            WS {wsStatus}
          </span>
          <span className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-white/70 sm:inline-flex">
            <Cpu size={12} className="text-primary" />
            {activeModel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-md border border-green-400/20 bg-green-400/10 px-2.5 py-1 text-green-300 md:inline-flex">
            <ShieldCheck size={12} />
            Provider healthy
          </span>
          <span className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-white/60 sm:inline-flex">
            <AlertTriangle size={12} />
            0 approvals
          </span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-white/60">0 tasks</span>
          <button
            onClick={onEmergencyStop}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-red-400/30 bg-red-500/15 px-2.5 font-bold uppercase tracking-[0.14em] text-red-300 transition-colors hover:bg-red-500/25"
            title="Emergency stop"
          >
            <Power size={12} />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
