import { useCallback } from 'react';
import { Cpu } from 'lucide-react';
import type { MIAConfig } from '../../types/config';

interface StudioKernelSettingsProps {
  config: MIAConfig;
  updateConfigLocal: (newConfig: MIAConfig) => void;
}

const OS_MODES = [
  { id: 'normal', label: 'Normal' },
  { id: 'secure', label: 'Secure' },
  { id: 'performance', label: 'Performance' },
  { id: 'balanced', label: 'Balanced' },
];

export default function StudioKernelSettings({ config, updateConfigLocal }: StudioKernelSettingsProps) {
  const setConfig = useCallback((patch: Partial<MIAConfig>) => {
    updateConfigLocal({ ...config, ...patch });
  }, [config, updateConfigLocal]);

  return (
    <div className="space-y-8">
      <div 
        className="rounded-[2rem] border border-white/10 p-6 backdrop-blur-3xl shadow-2xl transition-all duration-300"
        style={{ backgroundColor: `rgba(0, 0, 0, ${config?.appearance?.ui_opacity ?? 0.6})` }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-3xl bg-cyan-500/10 text-cyan-300">
            <Cpu size={22} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-mono">Studio Kernel</div>
            <h2 className="mt-2 text-2xl font-bold text-white">Setelan Workspace</h2>
          </div>
        </div>

        <p className="text-sm text-white/60 leading-relaxed">Kelola perilaku kernel studio, sandbox, dan mode eksekusi untuk memastikan workspace tetap ringan, estetis, dan dapat diandalkan.</p>

        <div className="grid gap-4 mt-6">
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Kernel OS Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {OS_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setConfig({ os_mode: mode.id })}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${config.os_mode === mode.id ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 grid gap-2">
            <div className="flex items-center gap-3">
              <Cpu size={18} />
              <span className="text-[11px] uppercase tracking-[0.27em] text-white/40 font-mono">Timeout Eksekusi</span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              value={config.test_timeout}
              onChange={(e) => setConfig({ test_timeout: parseInt(e.target.value, 10) })}
              className="accent-primary"
            />
            <div className="flex justify-between text-[11px] text-white/50">
              <span>Reaksi responsif</span>
              <span>{config.test_timeout}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
