import clsx from 'clsx';
import { Heart } from 'lucide-react';

interface MiaFigureProps {
  name: string;
  mood: string;
  powerState: 'WAKE' | 'SLEEP';
  isIntimacyMode: boolean;
  heartbeat: number;
  activeModel: string;
}

export default function MiaFigure({
  name,
  mood,
  powerState,
  isIntimacyMode,
  heartbeat,
}: MiaFigureProps) {
  const heartbeatValue = Math.min(100, Math.max(24, heartbeat));

  return (
    <div className={clsx(
      'flex flex-col sm:flex-row items-center justify-between px-6 py-3 rounded-3xl border border-white/5 bg-black/50 backdrop-blur-md shadow-lg transition-all',
      isIntimacyMode ? 'ring-1 ring-pink-500/20' : 'ring-1 ring-sky-500/10'
    )}>
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/10 to-sky-500/10 border border-white/10 shadow-inner">
          <Heart className={clsx('text-white/80', isIntimacyMode ? 'text-pink-400 animate-pulse' : 'text-primary/70')} size={16} />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-white tracking-widest uppercase">{name}</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-0.5">
            {isIntimacyMode ? 'SOULMATE' : powerState} • {mood}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6 mt-3 sm:mt-0">
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-mono">Engine</span>
          <div className="w-24 h-1.5 mt-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500" style={{ width: `${heartbeatValue}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
