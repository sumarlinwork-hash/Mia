import { useCallback, useState, useEffect } from 'react';
import { Heart, Speaker, Zap, Save, ChevronDown, Clock, Shield, Sparkles, RefreshCcw, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MIAConfig } from '../../types/config';
import ThemeTab from './ThemeTab';

interface CroneStatus {
  scheduler_running: boolean;
  jobs: Array<{ id: string; name: string; status: string }>;
}

interface CompanionKernelSettingsProps {
  config: MIAConfig;
  updateConfigLocal: (newConfig: MIAConfig) => void;
}

export default function CompanionKernelSettings({ config, updateConfigLocal }: CompanionKernelSettingsProps) {
  const [expandedCards, setExpandedCards] = useState({
    companion: true,
    speech: true,
    visual: true,
    emotional: false,
    crone: false
  });

  const [croneStatus, setCroneStatus] = useState<CroneStatus | null>(null);
  const [croneLoading, setCroneLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch crone status on mount
  useEffect(() => {
    const fetchCroneStatus = async () => {
      try {
        setCroneLoading(true);
        const res = await fetch('/api/crone/status');
        const data = await res.json();
        setCroneStatus(data);
      } catch (e) {
        console.error('[CompanionSettings] Failed to fetch crone status:', e);
      } finally {
        setCroneLoading(false);
      }
    };
    fetchCroneStatus();
    const interval = setInterval(fetchCroneStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleCard = (cardName: keyof typeof expandedCards) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  const controlCrone = useCallback(async (action: 'pause' | 'resume') => {
    try {
      await fetch(`/api/crone/${action}`, { method: 'POST' });
      // Refresh status
      const res = await fetch('/api/crone/status');
      const data = await res.json();
      setCroneStatus(data);
    } catch (e) {
      console.error(`[CompanionSettings] Failed to ${action} crone:`, e);
    }
  }, []);

  const setConfig = useCallback((patch: Partial<MIAConfig>) => {
    updateConfigLocal({ ...config, ...patch });
  }, [config, updateConfigLocal]);

  return (
    <div className="space-y-8">
      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <button
          onClick={() => toggleCard('companion')}
          className="w-full flex items-center justify-between gap-3 mb-6 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
              <Heart size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white font-mono tracking-wide">COMPANION KERNEL</h2>
              <p className="text-xs text-white/40 font-sans">Setelan Companion</p>
            </div>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-white/40 transition-transform ${expandedCards.companion ? '' : 'rotate-180'}`}
          />
        </button>

        {expandedCards.companion && (
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
                  {config.is_professional_mode ? 'ON' : 'OFF'}
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
        )}
      </div>

      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <button
          onClick={() => toggleCard('speech')}
          className="w-full flex items-center justify-between gap-3 mb-6 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-300">
              <Speaker size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white font-mono tracking-wide">SPEECH & AUDIO</h2>
              <p className="text-xs text-white/40 font-sans">Mesin Suara</p>
            </div>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-white/40 transition-transform ${expandedCards.speech ? '' : 'rotate-180'}`}
          />
        </button>

        {expandedCards.speech && (
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
        )}
      </div>

      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <button
          onClick={() => toggleCard('visual')}
          className="w-full flex items-center justify-between gap-3 mb-6 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400">
              <Zap size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white font-mono tracking-wide">VISUAL & INTERFACE</h2>
              <p className="text-xs text-white/40 font-sans">Pengaturan Tampilan</p>
            </div>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-white/40 transition-transform ${expandedCards.visual ? '' : 'rotate-180'}`}
          />
        </button>

        {expandedCards.visual && (
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
        )}
      </div>

      {/* Theme Presets - Muncul hanya saat THEMES dipilih */}
      {config.appearance.background_type === 'themes' && expandedCards.visual && (
        <ThemeTab config={config} updateConfigLocal={updateConfigLocal} />
      )}

      {/* Emotional & Memory Card */}
      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <button
          onClick={() => toggleCard('emotional')}
          className="w-full flex items-center justify-between gap-3 mb-6 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <Heart size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white font-mono tracking-wide">EMOTIONAL & MEMORY</h2>
              <p className="text-xs text-white/40 font-sans">Resonansi & Sinkronisasi</p>
            </div>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-white/40 transition-transform ${expandedCards.emotional ? '' : 'rotate-180'}`}
          />
        </button>

        {expandedCards.emotional && (
          <div className="grid gap-6">
            {/* Care Pulse & Resonant Skin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={18} className="text-rose-400 animate-pulse" />
                  <span className="text-[11px] uppercase tracking-[0.27em] text-white/40 font-mono">Care Pulse</span>
                </div>
                <button
                  onClick={() => setConfig({ care_pulse_enabled: !config.care_pulse_enabled })}
                  className={`w-full rounded-2xl px-4 py-3 font-semibold transition ${config.care_pulse_enabled ? 'bg-secondary text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {config.care_pulse_enabled ? 'ENABLED' : 'DISABLED'}
                </button>
                <p className="text-[10px] text-white/30 italic font-mono mt-2">Proactive caring messages saat Anda sedang fokus</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles size={18} className="text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-[11px] uppercase tracking-[0.27em] text-white/40 font-mono">Resonant Skin</span>
                </div>
                <button
                  onClick={() => setConfig({ resonant_skin_enabled: !config.resonant_skin_enabled })}
                  className={`w-full rounded-2xl px-4 py-3 font-semibold transition ${config.resonant_skin_enabled ? 'bg-primary text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {config.resonant_skin_enabled ? 'ACTIVE' : 'INACTIVE'}
                </button>
                <p className="text-[10px] text-white/30 italic font-mono mt-2">Responsif terhadap sentuhan dan interaksi Anda</p>
              </div>
            </div>

            {/* Auto Sync */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3 mb-3">
                <RefreshCcw size={18} className="text-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
                <span className="text-[11px] uppercase tracking-[0.27em] text-white/40 font-mono">Auto Sync</span>
              </div>
              <label className="flex items-center gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={config.bio_sync_enabled}
                  onChange={() => setConfig({ bio_sync_enabled: !config.bio_sync_enabled })}
                  className="h-4 w-4 rounded border-white/20 bg-black/60 accent-primary"
                />
                Sinkronisasi bio-data & memory secara otomatis
              </label>
              <p className="text-[10px] text-white/30 italic font-mono mt-2">Menyimpan data emosi dan memori percakapan secara real-time</p>
            </div>

            {/* View Memory Button */}
            <button
              onClick={() => navigate('/iam-mia')}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-2xl font-bold font-mono text-xs transition-all border shadow-lg"
              style={{
                backgroundColor: `var(--color-primary)/20`,
                borderColor: `var(--color-primary)/50`,
                color: `var(--color-primary)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `var(--color-primary)/30`;
                e.currentTarget.style.borderColor = `var(--color-primary)/70`;
                e.currentTarget.style.boxShadow = `0 0 20px var(--color-primary)/30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `var(--color-primary)/20`;
                e.currentTarget.style.borderColor = `var(--color-primary)/50`;
                e.currentTarget.style.boxShadow = `0 0 0px transparent`;
              }}
            >
              <BookOpen size={16} />
              View Memory & Soul
            </button>
          </div>
        )}
      </div>

      {/* Crone Daemon Card */}
      <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <button
          onClick={() => toggleCard('crone')}
          className="w-full flex items-center justify-between gap-3 mb-6 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white font-mono tracking-wide">CRONE DAEMON</h2>
              <p className="text-xs text-white/40 font-sans">Background Task Scheduler</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${croneStatus?.scheduler_running ? 'bg-primary animate-pulse' : 'bg-error'}`} />
            <ChevronDown 
              size={20} 
              className={`text-white/40 transition-transform ${expandedCards.crone ? '' : 'rotate-180'}`}
            />
          </div>
        </button>

        {expandedCards.crone && (
          <div className="grid gap-6">
            {/* Status Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono mb-2 block">Scheduler Status</label>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${croneStatus?.scheduler_running ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-error'} animate-pulse`} />
                  <span className={`text-lg font-bold ${croneStatus?.scheduler_running ? 'text-primary' : 'text-error'}`}>
                    {croneLoading ? 'Loading...' : croneStatus?.scheduler_running ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono mb-2 block">Active Jobs</label>
                <div className="text-lg font-bold text-primary">
                  {croneLoading ? '...' : `${croneStatus?.jobs?.filter(j => j.status === 'Active').length ?? 0} / ${croneStatus?.jobs?.length ?? 0}`}
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => controlCrone('pause')}
                disabled={!croneStatus?.scheduler_running || croneLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-error/10 hover:bg-error/20 text-error disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono text-xs transition-all border border-error/30"
              >
                ⏸ PAUSE DAEMON
              </button>
              <button
                onClick={() => controlCrone('resume')}
                disabled={croneStatus?.scheduler_running || croneLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-success/10 hover:bg-success/20 text-success disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono text-xs transition-all border border-success/30"
              >
                ▶ RESUME DAEMON
              </button>
            </div>

            {/* Job List */}
            {croneStatus?.jobs && croneStatus.jobs.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono mb-3 block">Scheduled Jobs</label>
                <div className="space-y-2">
                  {croneStatus.jobs.map(job => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${job.status === 'Active' ? 'bg-primary' : 'bg-warning'}`} />
                        <span className="text-xs font-mono text-white/80">{job.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${job.status === 'Active' ? 'text-primary' : 'text-warning'}`}>
                          {job.status}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              const endpoint = job.status === 'Active' 
                                ? `/api/crone/pause/${job.id}` 
                                : `/api/crone/resume/${job.id}`;
                              
                              const res = await fetch(endpoint, { method: 'POST' });
                              if (res.ok) {
                                // Refresh status after successful toggle
                                const statusRes = await fetch('/api/crone/status');
                                const data = await statusRes.json();
                                setCroneStatus(data);
                              }
                            } catch (e) {
                              console.error(`[CompanionSettings] Failed to toggle job ${job.id}:`, e);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                            job.status === 'Active'
                              ? 'bg-error/10 hover:bg-error/20 text-error border border-error/30'
                              : 'bg-success/10 hover:bg-success/20 text-success border border-success/30'
                          }`}
                        >
                          {job.status === 'Active' ? '⏸ PAUSE' : '▶ RESUME'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-white/30 italic font-mono">
              💡 Tip: Pause the daemon to focus on coding. Resume to enable background memory pruning and maintenance tasks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
