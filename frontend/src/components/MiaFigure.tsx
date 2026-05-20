import clsx from 'clsx';
import { Activity, Droplets, Heart, Sparkles, Zap } from 'lucide-react';

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
  activeModel,
}: MiaFigureProps) {
  const stateLabel = isIntimacyMode ? 'Soulmate On' : powerState === 'SLEEP' ? 'Rest Mode' : 'Active';
  const heartbeatValue = Math.min(100, Math.max(24, heartbeat));

  return (
    <div className={clsx(
      'relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/70 backdrop-blur-3xl shadow-2xl transition-all',
      isIntimacyMode ? 'ring-2 ring-pink-500/30' : 'ring-1 ring-sky-500/10'
    )}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,192,203,0.18),_transparent_35%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(0,255,204,0.12),_transparent_40%)] pointer-events-none" />

      <div className="relative p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-mono">MIA Figure</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">{name}</h2>
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-pink-500/20 to-sky-500/15 border border-white/10 shadow-[0_0_35px_rgba(255,102,204,0.16)]">
            <Heart className={clsx('text-white', isIntimacyMode ? 'animate-pulse' : 'animate-ping')} size={22} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/80">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Presence</p>
            <p className="mt-2 text-lg font-bold text-white">{stateLabel}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/80">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Mood</p>
            <p className="mt-2 text-lg font-bold text-white">{mood}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/80">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Provider</p>
            <p className="mt-2 text-lg font-bold text-white truncate">{activeModel}</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/50 p-4">
          <div className="flex items-center justify-between text-white/60 text-[11px] uppercase tracking-[0.33em] font-mono mb-3">
            <span>Soul Engine</span>
            <span>{heartbeatValue}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all" style={{ width: `${heartbeatValue}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-[11px] text-white/70">
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="flex items-center gap-2">
                <Activity size={14} />
                <span>Activity</span>
              </div>
              <p className="mt-2 font-semibold text-white">{isIntimacyMode ? 'Elevated' : 'Normal'}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="flex items-center gap-2">
                <Droplets size={14} />
                <span>Resonance</span>
              </div>
              <p className="mt-2 font-semibold text-white">{powerState === 'SLEEP' ? 'Low' : 'High'}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={14} />
                <span>Style</span>
              </div>
              <p className="mt-2 font-semibold text-white">Visual Aura</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/40">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <Zap size={12} /> flagship-ready
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <Heart size={12} /> tethered intuition
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <Sparkles size={12} /> visual presence
          </span>
        </div>
      </div>
    </div>
  );
}
