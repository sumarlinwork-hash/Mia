import { useCallback } from 'react';
import { Heart, Speaker, Image } from 'lucide-react';
import type { MIAConfig } from '../../types/config';

interface CompanionKernelSettingsProps {
  config: MIAConfig;
  updateConfigLocal: (newConfig: MIAConfig) => void;
}

const THEME_OPTIONS = [
  { id: 'teal', label: 'Neon Teal' },
  { id: 'violet', label: 'Cyber Violet' },
  { id: 'amber', label: 'Retrowave Amber' },
  { id: 'emerald', label: 'Matrix Emerald' },
  { id: 'rose', label: 'Love Rose' },
];

export default function CompanionKernelSettings({ config, updateConfigLocal }: CompanionKernelSettingsProps) {
  const setConfig = useCallback((patch: Partial<MIAConfig>) => {
    updateConfigLocal({ ...config, ...patch });
  }, [config, updateConfigLocal]);

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-white/10 bg-black/75 p-6 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-3xl bg-pink-500/10 text-pink-400">
            <Heart size={22} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-mono">Companion Kernel</div>
            <h2 className="mt-2 text-2xl font-bold text-white">Setelan Companion</h2>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Nama Panggilan</label>
            <input
              value={config.bot_name}
              onChange={(e) => setConfig({ bot_name: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Umur Bot</label>
              <input
                type="number"
                min="1"
                value={config.bot_age}
                onChange={(e) => setConfig({ bot_age: parseInt(e.target.value, 10) || 18 })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Mode Profesional</label>
              <button
                onClick={() => setConfig({ is_professional_mode: !config.is_professional_mode })}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${config.is_professional_mode ? 'bg-primary text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                {config.is_professional_mode ? 'ACTIVE' : 'PASSIVE'}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Persona Utama</label>
            <textarea
              value={config.bot_persona}
              rows={4}
              onChange={(e) => setConfig({ bot_persona: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary resize-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/75 p-6 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-3xl bg-sky-500/10 text-sky-300">
            <Speaker size={22} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-mono">Speech & Audio</div>
            <h2 className="mt-2 text-2xl font-bold text-white">Mesin Suara</h2>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">TTS Engine</label>
            <select
              value={config.tts_engine}
              onChange={(e) => setConfig({ tts_engine: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary"
            >
              <option value="edge-tts">Edge-TTS</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>
          {config.tts_engine === 'elevenlabs' && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">ElevenLabs API Key</label>
                <input
                  type="password"
                  value={config.elevenlabs_api_key ?? ''}
                  onChange={(e) => setConfig({ elevenlabs_api_key: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Voice ID</label>
                <input
                  value={config.elevenlabs_voice_id ?? ''}
                  onChange={(e) => setConfig({ elevenlabs_voice_id: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">STT Engine</label>
            <select
              value={config.stt_engine}
              onChange={(e) => setConfig({ stt_engine: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary"
            >
              <option value="whisper">Whisper</option>
              <option value="vosk">VOSK</option>
              <option value="edge-stt">Edge STT</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/75 p-6 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-3xl bg-violet-500/10 text-violet-300">
            <Image size={22} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-mono">Tampilan Companion</div>
            <h2 className="mt-2 text-2xl font-bold text-white">Appearance</h2>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">UI Opacity</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={config.appearance.ui_opacity}
              onChange={(e) => setConfig({ appearance: { ...config.appearance, ui_opacity: parseFloat(e.target.value) } })}
              className="w-full accent-primary"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Theme Hue</label>
            <div className="grid grid-cols-2 gap-3">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setConfig({ appearance: { ...config.appearance, theme_hue: option.id } })}
                  className={`rounded-2xl border px-3 py-3 text-sm text-left transition ${config.appearance.theme_hue === option.id ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'}`}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-[10px] text-white/40">Accent tone</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
