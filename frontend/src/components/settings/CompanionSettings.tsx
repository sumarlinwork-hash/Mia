import { useCallback } from 'react';
import { Heart, Speaker, Zap, Save } from 'lucide-react';
import type { MIAConfig } from '../../types/config';
import ThemeTab from './ThemeTab';

interface CompanionKernelSettingsProps {
  config: MIAConfig;
  updateConfigLocal: (newConfig: MIAConfig) => void;
}

export default function CompanionKernelSettings({ config, updateConfigLocal }: CompanionKernelSettingsProps) {
  const setConfig = useCallback((patch: Partial<MIAConfig>) => {
    updateConfigLocal({ ...config, ...patch });
  }, [config, updateConfigLocal]);

  return (
    <div className="space-y-8">
      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
            <Heart size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono tracking-wide">COMPANION KERNEL</h2>
            <p className="text-xs text-white/40 font-sans">Setelan Companion</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Nama Panggilan</label>
            <input
              value={config.bot_name}
              onChange={(e) => setConfig({ bot_name: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Umur Bot</label>
              <input
                type="number"
                min="1"
                value={config.bot_age}
                onChange={(e) => setConfig({ bot_age: parseInt(e.target.value, 10) || 18 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Mode Profesional</label>
              <button
                onClick={() => setConfig({ is_professional_mode: !config.is_professional_mode })}
                className={`rounded-2xl px-4 py-3 text-xs font-bold font-mono transition-all ${config.is_professional_mode ? 'bg-primary text-black' : 'bg-white/[0.03] border border-white/10 text-white hover:bg-white/[0.05]'}`}
              >
                {config.is_professional_mode ? 'ACTIVE' : 'PASSIVE'}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Persona Utama</label>
            <textarea
              value={config.bot_persona}
              rows={4}
              onChange={(e) => setConfig({ bot_persona: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono resize-none"
            />
          </div>
        </div>
      </div>

      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-300">
            <Speaker size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono tracking-wide">SPEECH & AUDIO</h2>
            <p className="text-xs text-white/40 font-sans">Mesin Suara</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">TTS Engine</label>
            <select
              value={config.tts_engine}
              onChange={(e) => setConfig({ tts_engine: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono appearance-none"
            >
              <option value="edge-tts">Edge-TTS</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>
          {config.tts_engine === 'elevenlabs' && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">ElevenLabs API Key</label>
                <input
                  type="password"
                  value={config.elevenlabs_api_key ?? ''}
                  onChange={(e) => setConfig({ elevenlabs_api_key: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Voice ID</label>
                <input
                  value={config.elevenlabs_voice_id ?? ''}
                  onChange={(e) => setConfig({ elevenlabs_voice_id: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
                />
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">STT Engine</label>
            <select
              value={config.stt_engine}
              onChange={(e) => setConfig({ stt_engine: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono appearance-none"
            >
              <option value="whisper">Whisper</option>
              <option value="vosk">VOSK</option>
              <option value="edge-stt">Edge STT</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono tracking-wide">VISUAL & INTERFACE</h2>
            <p className="text-xs text-white/40 font-sans">Pengaturan Tampilan</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* UI Transparency */}
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">UI Transparency: {Math.round(config.appearance.ui_opacity * 100)}%</label>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={config.appearance.ui_opacity}
              onChange={(e) => setConfig({ appearance: { ...config.appearance, ui_opacity: parseFloat(e.target.value) } })}
              className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Bubble Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono mb-4 block">MIA Bubble Color & Opacity</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={config.appearance.bubble_color_mia?.slice(0, 7) || '#f2c41c'}
                  onChange={(e) => {
                    const currentAlpha = config.appearance.bubble_color_mia?.length === 9 ? config.appearance.bubble_color_mia.slice(7, 9) : 'ff';
                    setConfig({ appearance: { ...config.appearance, bubble_color_mia: e.target.value + currentAlpha } });
                  }}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <div className="flex-1 grid gap-1">
                  <div className="flex justify-between items-center text-[9px] text-white/40 font-mono uppercase tracking-widest">
                    <span>Alpha: {Math.round((parseInt(config.appearance.bubble_color_mia?.slice(7, 9) || 'ff', 16) / 255) * 100) || 0}%</span>
                    <span>HEX: {config.appearance.bubble_color_mia?.slice(0, 7) || '#f2c41c'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    value={parseInt(config.appearance.bubble_color_mia?.slice(7, 9) || 'ff', 16)}
                    onChange={(e) => {
                      const alpha = parseInt(e.target.value).toString(16).padStart(2, '0');
                      const baseColor = config.appearance.bubble_color_mia?.slice(0, 7) || '#f2c41c';
                      setConfig({ appearance: { ...config.appearance, bubble_color_mia: baseColor + alpha } });
                    }}
                    className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono mb-4 block">User Bubble Color & Opacity</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={config.appearance.bubble_color_user?.slice(0, 7) || '#ffffff'}
                  onChange={(e) => {
                    const currentAlpha = config.appearance.bubble_color_user?.length === 9 ? config.appearance.bubble_color_user.slice(7, 9) : 'ff';
                    setConfig({ appearance: { ...config.appearance, bubble_color_user: e.target.value + currentAlpha } });
                  }}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <div className="flex-1 grid gap-1">
                  <div className="flex justify-between items-center text-[9px] text-white/40 font-mono uppercase tracking-widest">
                    <span>Alpha: {Math.round((parseInt(config.appearance.bubble_color_user?.slice(7, 9) || 'ff', 16) / 255) * 100) || 0}%</span>
                    <span>HEX: {config.appearance.bubble_color_user?.slice(0, 7) || '#ffffff'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    value={parseInt(config.appearance.bubble_color_user?.slice(7, 9) || 'ff', 16)}
                    onChange={(e) => {
                      const alpha = parseInt(e.target.value).toString(16).padStart(2, '0');
                      const baseColor = config.appearance.bubble_color_user?.slice(0, 7) || '#ffffff';
                      setConfig({ appearance: { ...config.appearance, bubble_color_user: baseColor + alpha } });
                    }}
                    className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Background Type */}
          <div className="grid gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono mb-1">Background Type</label>
            <div className="flex flex-wrap gap-2">
              {['video', 'image', 'color', 'themes'].map((type) => (
                <button
                  key={type}
                  onClick={() => setConfig({ appearance: { ...config.appearance, background_type: type as 'video' | 'image' | 'color' | 'themes' } })}
                  className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                    config.appearance.background_type === type 
                      ? 'bg-primary text-black' 
                      : 'bg-white/[0.03] border border-white/10 text-white/60 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker - Muncul hanya saat COLOR dipilih */}
          {config.appearance.background_type === 'color' && (
            <div className="grid gap-2 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono mb-2">Global Theme Color</label>
              <input 
                type="color" 
                value={config.appearance.background_url || '#00ffcc'}
                onChange={(e) => setConfig({ appearance: { ...config.appearance, background_url: e.target.value } })}
                className="w-full h-12 rounded-2xl cursor-pointer border-0 p-0 bg-transparent"
              />
              <p className="text-[10px] text-white/30 italic font-mono">Pilih warna tema global untuk aplikasi</p>
            </div>
          )}

          {/* Background URL / Local Path */}
          <div className="grid gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">Background URL / Local Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.appearance.background_url || ''}
                onChange={(e) => setConfig({ appearance: { ...config.appearance, background_url: e.target.value } })}
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
              />
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,video/*';
                  input.onchange = async (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch('/api/upload-bg', { method: 'POST', body: formData });
                      const data = await res.json();
                      if (data.status === 'success') {
                        setConfig({ appearance: { ...config.appearance, background_url: data.url } });
                      }
                    } catch (err) {
                      console.error("Upload failed", err);
                    }
                  };
                  input.click();
                }}
                className="px-6 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] text-white text-xs font-bold font-mono transition-all whitespace-nowrap border border-white/10 flex items-center gap-2"
              >
                + Upload Lokal
              </button>
            </div>
            <p className="text-[10px] text-white/30 italic font-mono">Tip: Gunakan file lokal atau URL publik untuk performa terbaik.</p>
          </div>

          <div className="flex justify-center mt-4">
            <button
              onClick={() => {
                updateConfigLocal(config);
              }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-black px-8 py-3 rounded-2xl font-bold font-mono text-xs transition-all shadow-[0_0_20px_var(--color-primary)] hover:shadow-[0_0_30px_var(--color-primary)]"
            >
              <Save size={18} />
              Simpan Perubahan Visual
            </button>
          </div>
        </div>
      </div>

      {/* Theme Presets - Muncul hanya saat THEMES dipilih */}
      {config.appearance.background_type === 'themes' && (
        <ThemeTab config={config} updateConfigLocal={updateConfigLocal} />
      )}
    </div>
  );
}
