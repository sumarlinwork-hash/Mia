import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfig } from './hooks/useConfig';
import { 
  Zap, RefreshCcw, Save, Trash2, Pencil, Plus, Star, Shield, Info, ArrowLeft,
  CheckCircle2, XCircle, Brain, Activity
} from 'lucide-react';

import type { MIAConfig, ProviderConfig } from './types/config';

const PROTOCOLS = ["OpenAI Compatible", "Gemini API", "Groq", "Native Binary (.gguf)"];
const PURPOSES = ["Inti Logika & Pikiran", "Persepsi Visual & Imajinasi", "Kreativitas & Kreasi Media", "Analisis Data & Pengetahuan", "Khusus Intimacy & Uncensored"];
const COSTS = ["Gratis berlimit", "Berbayar", "Lokal"];

const PRESETS: Record<string, Partial<ProviderConfig & { endpoint: string }>> = {
  "OpenAI": { protocol: "OpenAI Compatible", base_url: "https://api.openai.com", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Google Gemini": { protocol: "Gemini API", base_url: "https://generativelanguage.googleapis.com", endpoint: "/v1beta/models/{model_id}:generateContent", cost_label: COSTS[0], purpose: PURPOSES[0] },
  "Anthropic": { protocol: "OpenAI Compatible", base_url: "https://api.anthropic.com", endpoint: "/v1/messages", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Groq": { protocol: "Groq", base_url: "https://api.groq.com", endpoint: "/openai/v1/chat/completions", cost_label: COSTS[0], purpose: PURPOSES[0] },
  "DeepSeek": { protocol: "OpenAI Compatible", base_url: "https://api.deepseek.com", endpoint: "/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Mistral": { protocol: "OpenAI Compatible", base_url: "https://api.mistral.ai", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Perplexity": { protocol: "OpenAI Compatible", base_url: "https://api.perplexity.ai", endpoint: "/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[3] },
  "Local LLM": { protocol: "OpenAI Compatible", base_url: "http://localhost:11434", endpoint: "/v1/chat/completions", cost_label: COSTS[2], purpose: PURPOSES[0] },
  "Custom": { protocol: "OpenAI Compatible", base_url: "", endpoint: "", cost_label: COSTS[0], purpose: PURPOSES[0] },
};

interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'info';
}

export default function LLMPage() {
  const { config, loading, updateConfig: setGlobalConfig, refreshConfig } = useConfig();
  const [originalConfig, setOriginalConfig] = useState<MIAConfig | null>(null);
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'health'>('list');
  const [editName, setEditName] = useState<string | null>(null);
  const [testCountdown, setTestCountdown] = useState<number>(0);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newProvider, setNewProvider] = useState<ProviderConfig>({
    display_name: '',
    model_id: '',
    api_key: '',
    protocol: PROTOCOLS[0],
    base_url: '',
    purpose: PURPOSES[0],
    cost_label: COSTS[0],
    is_active: true,
    is_default: false,
    latency: 0,
    health_ok: 0,
    health_fail: 0
  });

  const [isAutoUrl, setIsAutoUrl] = useState(false);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (config && !originalConfig && isMounted) {
      setTimeout(() => {
        if (isMounted) setOriginalConfig(JSON.parse(JSON.stringify(config)));
      }, 0);
    }
    return () => { isMounted = false; };
  }, [config, originalConfig]);

  const addToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const handleSave = useCallback(async (updatedConfig = config, isSilent = false) => {
    if (!updatedConfig) return;
    const rollbackConfig = originalConfig ? JSON.parse(JSON.stringify(originalConfig)) : null;
    const savedConfig = JSON.parse(JSON.stringify(updatedConfig));
    setOriginalConfig(savedConfig);
    setHasChanges(false);
    if (!isSilent) setIsSaving(true);
    
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Unknown server error" }));
        throw new Error(errorData.detail || "Server rejected config update");
      }
      
      if (!isSilent) {
        addToast("Konfigurasi berhasil disimpan secara permanen", "success");
      }
      await refreshConfig();
    } catch (err) {
      setOriginalConfig(rollbackConfig);
      if (rollbackConfig) {
        setGlobalConfig(rollbackConfig);
      }
      setHasChanges(true);
      if (!isSilent) {
        addToast("Gagal menyimpan ke server: " + (err instanceof Error ? err.message : "Internal Error"), "error");
      }
    } finally {
      if (!isSilent) setIsSaving(false);
    }
  }, [config, originalConfig, setGlobalConfig, refreshConfig, addToast]);

  const debouncedSave = useCallback((updatedConfig: MIAConfig) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await handleSave(updatedConfig, true);
      } catch (err) {
        console.error("Auto-Save failed:", err);
      }
    }, 800);
  }, [handleSave]);

  const updateConfigLocal = async (newConf: MIAConfig) => {
    setGlobalConfig(newConf);
    setHasChanges(JSON.stringify(newConf) !== JSON.stringify(originalConfig));
    debouncedSave(newConf);
  };

  const startEdit = (name: string, p: ProviderConfig) => {
    setEditName(name);
    setNewProvider({ ...p, display_name: name });
    setIsAutoUrl(false);
    setView('edit');
  };

  const handleAddOrEditProvider = async () => {
    if (!config) return;
    const updatedConfig = { ...config };
    if (view === 'edit' && editName) {
      delete updatedConfig.providers[editName];
    }

    updatedConfig.providers[newProvider.display_name] = {
      ...newProvider,
      is_active: true,
      is_default: updatedConfig.providers[newProvider.display_name]?.is_default || Object.keys(config.providers).length === 0,
      latency: updatedConfig.providers[newProvider.display_name]?.latency || 0,
      health_ok: updatedConfig.providers[newProvider.display_name]?.health_ok || 0,
      health_fail: updatedConfig.providers[newProvider.display_name]?.health_fail || 0
    };
    
    handleSave(updatedConfig);
    setView('list');
    setEditName(null);
    setNewProvider({
      display_name: '', model_id: '', api_key: '',
      protocol: PROTOCOLS[0], base_url: '',
      purpose: PURPOSES[0], cost_label: COSTS[0],
      is_active: true, is_default: false, latency: 0, health_ok: 0, health_fail: 0
    });
    setIsAutoUrl(false);
  };

  const deleteProvider = async (name: string) => {
    if (!config) return;
    const updatedConfig = { ...config };
    delete updatedConfig.providers[name];
    handleSave(updatedConfig);
  };

  const toggleProvider = async (name: string) => {
    if (!config) return;
    const updatedConfig = { ...config };
    updatedConfig.providers[name].is_active = !updatedConfig.providers[name].is_active;
    handleSave(updatedConfig);
  };

  const testProvider = async (name: string) => {
    if (!config) return;
    const timeout = config.test_timeout || 30;
    setActiveTest(name);
    setTestCountdown(timeout);
    const timer = setInterval(() => {
      setTestCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    try {
      const res = await fetch(`/api/providers/test/${encodeURIComponent(name)}`, { method: 'POST' });
      const data = await res.json();

      if (data.status === 'success') {
        addToast(`${name} terhubung: ${data.latency}ms`, 'success');
      } else {
        addToast(`${name} gagal: ${data.message || 'Error tidak dikenal'}`, 'error');
      }
    } catch (err) {
      addToast(`Masalah Jaringan: ${(err as Error).message}`, 'error');
    } finally {
      await refreshConfig();
      clearInterval(timer);
      setActiveTest(null);
      setTestCountdown(0);
    }
  };

  const testNewProvider = async () => {
    const isLocal = newProvider.base_url.includes("localhost") || newProvider.base_url.includes("127.0.0.1");
    if (!newProvider.api_key && !isLocal) {
      addToast("API Key wajib diisi untuk tes", "error");
      return;
    }
    
    const timeout = config?.test_timeout || 30;
    setActiveTest("NEW_FORM");
    setTestCountdown(timeout);
    const timer = setInterval(() => {
      setTestCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: newProvider.display_name || "New Provider",
          api_key: newProvider.api_key,
          base_url: newProvider.base_url,
          protocol: newProvider.protocol,
          model_id: newProvider.model_id,
          purpose: newProvider.purpose
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        addToast(`Koneksi Sukses! Latensi: ${data.latency}ms`, 'success');
      } else {
        addToast(`Gagal: ${data.message}`, 'error');
      }
    } catch (err) {
      addToast(`Error: ${(err as Error).message}`, 'error');
    } finally {
      clearInterval(timer);
      setActiveTest(null);
      setTestCountdown(0);
    }
  };

  const uiOpacity = config?.appearance?.ui_opacity ?? 0.8;

  if (loading || !config) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-primary font-mono animate-pulse bg-transparent">
        Memuat LLM Warehouse Cockpit...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-white p-8 md:p-12 animate-fade-in font-sans relative z-10" style={{ paddingLeft: '5rem' }}>
      <div className="max-w-7xl mx-auto">
        {/* Top Header Cockpit */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,255,204,0.2)]">
                <Brain size={28} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-black font-mono tracking-wider text-white">LLM WAREHOUSE</h1>
                <p className="text-xs text-white/40 font-mono">Cockpit Manajemen & Diagnostic Provider Intelijen MIA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {view === 'list' ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => setView('health')}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary/20 text-secondary font-mono font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all border border-secondary/30 text-xs"
                >
                  <Activity size={16} /> PROVIDER HEALTH
                </button>
                <button 
                  onClick={() => setView('add')}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-mono font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)] text-xs"
                >
                  <Plus size={16} /> REGISTRASI MODEL
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView('list')}
                className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-mono font-bold rounded-2xl transition-all text-xs"
              >
                <ArrowLeft size={16} /> KEMBALI
              </button>
            )}
          </div>
        </div>

        {/* Intelligence Settings Grid */}
        {view === 'health' ? (
          // Provider Health Dashboard
          <div className="space-y-8 animate-slide-up">
            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary"><Activity size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-white font-mono tracking-wide">PROVIDER HEALTH MONITOR</h2>
                  <p className="text-xs text-white/40 font-sans">Real-time diagnostics untuk semua LLM providers yang terdaftar.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(config.providers).map(([name, p]: [string, ProviderConfig]) => {
                  const healthScore = p.health_ok + p.health_fail > 0 
                    ? Math.round((p.health_ok / (p.health_ok + p.health_fail)) * 100)
                    : 100;
                  
                  // Determine health status for styling
                  const isHealthy = healthScore > 90;
                  const isDegraded = healthScore > 50 && healthScore <= 90;
                  
                  return (
                    <div 
                      key={name}
                      className={`relative p-6 rounded-[2rem] border backdrop-blur-3xl transition-all ${
                        isHealthy 
                          ? 'border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5' 
                          : isDegraded
                          ? 'border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5'
                          : 'border-[var(--color-error)]/20 bg-[var(--color-error)]/5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-black tracking-tight text-white uppercase">{name}</h3>
                          <span className="text-[10px] font-mono text-white/40">
                            {p.latency}ms latency
                          </span>
                        </div>
                        <div className={`text-3xl font-black ${
                          isHealthy ? 'text-[var(--color-primary)]' : isDegraded ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'
                        }`}>
                          {healthScore}%
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 text-[10px] font-mono text-white/60 border-t border-b border-white/5 py-3">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={p.is_active ? 'text-[var(--color-primary)] font-bold' : 'text-white/40 font-bold'}>
                            {p.is_active ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span className="text-white/80 font-bold">{p.health_ok} OK / {p.health_fail} FAIL</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span className="text-white/80 font-bold truncate">{p.model_id}</span>
                        </div>
                      </div>

                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            isHealthy ? 'bg-[var(--color-primary)]' : isDegraded ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'
                          }`}
                          style={{ width: `${healthScore}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-8 animate-slide-up">
            {/* System Operation Mode Panel */}
            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Shield size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-white font-mono tracking-wide">SYSTEM OPERATION MODE</h2>
                  <p className="text-xs text-white/40 font-sans">Sesuaikan profil eksekusi & kelonggaran keamanan sandbox kernel.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'SAFE_MODE', label: 'SAFE MODE', desc: 'Prioritas Keamanan Tinggi (Lokal & Terisolasi)', color: 'border-green-500/30' },
                  { id: 'POWER_MODE', label: 'POWER MODE', desc: 'Akses Otonom & Eksekusi Otoritatif', color: 'border-primary/50' },
                  { id: 'BEGINNER_MODE', label: 'BEGINNER MODE', desc: 'Antarmuka Ramah Pemula & Aman', color: 'border-blue-500/30' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => updateConfigLocal({ ...config, os_mode: mode.id })}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      config.os_mode === mode.id
                        ? `bg-primary/10 ${mode.color} ring-1 ring-primary/20`
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`text-xs font-bold font-mono mb-2 ${config.os_mode === mode.id ? 'text-primary' : 'text-white/70'}`}>
                      {mode.label}
                    </div>
                    <div className="text-[10px] text-white/40 leading-relaxed group-hover:text-white/60">{mode.desc}</div>
                    {config.os_mode === mode.id && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Providers List Grid */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <h2 className="text-xl font-bold font-mono tracking-widest uppercase">INTELLIGENCE STATIONS</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(config.providers).map(([name, p]: [string, ProviderConfig]) => (
                  <div 
                    key={name} 
                    className={`relative p-6 rounded-[2.5rem] border backdrop-blur-3xl transition-all group duration-500 hover:scale-[1.02] ${
                      p.is_active 
                        ? 'border-white/10 bg-black/40 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' 
                        : 'border-white/5 bg-black/20 opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-3 rounded-2xl text-primary ${p.is_active ? 'bg-primary/10 animate-pulse' : 'bg-white/5'}`}>
                        <Zap size={22} />
                      </div>
                      <div className="flex gap-2">
                        <div className="group relative">
                          <Info size={14} className="text-white/20 hover:text-white/60 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-black border border-white/10 rounded-xl text-[10px] leading-relaxed text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                            Protocol: <span className="text-primary font-mono">{p.protocol}</span><br />
                            Purpose: <span className="text-primary font-mono">{p.purpose}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button onClick={() => startEdit(name, p)} className="p-2 text-white/40 hover:text-white transition-colors" title="Edit"><Pencil size={15} /></button>
                          <button onClick={() => deleteProvider(name)} className="p-2 text-white/40 hover:text-red-400 transition-colors" title="Hapus"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-black font-mono tracking-tight text-white">{name}</h3>
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-widest">{p.cost_label}</span>
                        {p.is_default && <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-primary text-black uppercase tracking-widest">DEFAULT</span>}
                      </div>
                      <p className="text-[10px] text-white/40 font-mono truncate" title={p.model_id}>Model ID: {p.model_id}</p>
                    </div>

                    <div className="space-y-2.5 mb-6 font-mono text-[10px] text-white/60 border-t border-b border-white/5 py-4">
                      <div className="flex justify-between">
                        <span>FUNGSI INTEL:</span>
                        <span className="text-white/80 font-bold">{p.purpose}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>RATA LATENSI:</span>
                        <span className="text-primary font-bold">{p.latency} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>STATISTIK DIAGNOSE:</span>
                        <span className={p.health_fail > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                          OK {p.health_ok} / FAIL {p.health_fail}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-white/20'}`} />
                        <span className="text-[10px] font-bold font-mono text-white/80 uppercase">Status: {p.is_active ? 'ONLINE' : 'MUTED'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => testProvider(name)}
                          disabled={activeTest === name}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-[9px] font-bold text-white transition-all disabled:opacity-50 font-mono"
                        >
                          <RefreshCcw size={10} className={activeTest === name ? "animate-spin" : ""} />
                          {activeTest === name ? `TESTING (${testCountdown}s)` : 'TEST PING'}
                        </button>
                        <div
                          onClick={() => toggleProvider(name)}
                          className={`w-9 h-5 rounded-full relative cursor-pointer transition-all ${p.is_active ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${p.is_active ? 'left-5' : 'left-1'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Form Add / Edit intelligence preset cockpit */
          <div className="max-w-3xl backdrop-blur-3xl border border-white/15 rounded-[32px] p-8 md:p-10 animate-in zoom-in-95 duration-300 shadow-2xl shadow-black/80 mx-auto" style={{ backgroundColor: `rgba(15, 15, 15, ${1 - uiOpacity + 0.1})` }}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 text-primary"><Star size={20} /></div>
                <h2 className="text-lg font-black font-mono tracking-wide text-white">
                  {view === 'add' ? 'REGISTRASI PROVIDER BARU' : 'EDIT STASIUN PROVIDER'}
                </h2>
              </div>
              <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">MIA CORE v4.1</div>
            </div>

            <div className="space-y-6">
              {/* Presets Grid Selector */}
              {view === 'add' && (
                <div>
                  <label className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 font-mono">
                    Pilih Templat Cerdas (Preset)
                    {newProvider.display_name && <CheckCircle2 size={12} className="text-green-500" />}
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2.5">
                    {Object.keys(PRESETS).map(key => {
                      const isSelected = newProvider.display_name === key;
                      const handleSelectPreset = () => {
                        const isCustom = key === 'Custom';
                        setIsAutoUrl(!isCustom);
                        setNewProvider({ 
                          ...newProvider, 
                          display_name: key === 'Custom' ? '' : key, 
                          ...PRESETS[key], 
                          base_url: isCustom ? '' : (PRESETS[key].base_url + (PRESETS[key].endpoint || '')) 
                        });
                      };
                      return (
                        <div 
                          key={key} 
                          onClick={handleSelectPreset} 
                          className={`cursor-pointer p-3 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center text-center gap-1.5 ${
                            isSelected 
                              ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(0,255,204,0.2)] scale-[1.03] z-10' 
                              : 'border-white/5 hover:border-white/15 bg-white/[0.01]'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-primary text-black' : 'bg-black/50 text-white/40'}`}>
                            {key.charAt(0)}
                          </div>
                          <div className={`text-[10px] font-bold truncate w-full ${isSelected ? 'text-primary' : 'text-white/75'}`}>
                            {key}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Nama Tampilan Provider</label>
                  <input
                    type="text"
                    value={newProvider.display_name}
                    onChange={e => setNewProvider({ ...newProvider, display_name: e.target.value })}
                    placeholder="Contoh: Google Gemini, Local Llama"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
                    disabled={view === 'edit'}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Model ID (Sesuai Provider)</label>
                  <input
                    type="text"
                    value={newProvider.model_id}
                    onChange={e => setNewProvider({ ...newProvider, model_id: e.target.value })}
                    placeholder="Contoh: gemini-2.5-flash-lite"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Endpoint API URL</label>
                    {isAutoUrl && <span className="text-[8px] font-bold font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">AUTO-ROUTING</span>}
                  </div>
                  <input
                    type="text"
                    value={newProvider.base_url}
                    onChange={e => setNewProvider({ ...newProvider, base_url: e.target.value })}
                    placeholder="https://api.openai.com/v1/chat/completions"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">API Secret Authorization Key</label>
                  <input
                    type="password"
                    value={newProvider.api_key}
                    onChange={e => setNewProvider({ ...newProvider, api_key: e.target.value })}
                    placeholder={newProvider.api_key ? "••••••••••••••••" : "Masukkan API key Anda"}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Protokol Komunikasi</label>
                  <select
                    value={newProvider.protocol}
                    onChange={e => setNewProvider({ ...newProvider, protocol: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono appearance-none"
                  >
                    {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-white/40 uppercase tracking-widest">Tujuan Penggunaan (Purpose)</label>
                  <select
                    value={newProvider.purpose}
                    onChange={e => setNewProvider({ ...newProvider, purpose: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-primary/50 text-white font-mono appearance-none"
                  >
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Form Buttons Actions */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={testNewProvider}
                  disabled={activeTest === "NEW_FORM"}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-mono font-bold transition-all disabled:opacity-50"
                >
                  <RefreshCcw size={14} className={activeTest === "NEW_FORM" ? "animate-spin" : ""} />
                  {activeTest === "NEW_FORM" ? `TESTING CONNECTION (${testCountdown}s)` : 'TEST DIAGNOSTIC PING'}
                </button>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setView('list')}
                    className="px-6 py-3 rounded-2xl hover:bg-white/5 text-white/60 text-xs font-mono font-bold hover:text-white transition-all bg-white/[0.01]"
                  >
                    BATAL
                  </button>
                  <button 
                    type="button"
                    onClick={handleAddOrEditProvider}
                    disabled={!newProvider.display_name || !newProvider.model_id}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-black rounded-2xl text-xs font-mono font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Save size={14} />
                    SIMPAN PROVIDER
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Save Sync Bar */}
      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg p-4 rounded-3xl bg-black/90 backdrop-blur-3xl border border-primary/30 flex items-center justify-between animate-in slide-in-from-bottom-10 duration-700 shadow-2xl z-[200]">
          <div className="flex items-center gap-4 ml-2">
            <div className="p-2 rounded-full bg-primary/20 text-primary"><Zap size={20} className="animate-pulse" /></div>
            <div>
              <div className="text-[11px] font-bold text-white uppercase tracking-widest font-mono">Brain Sync Required</div>
              <div className="text-[10px] text-white/40 font-mono">Konfigurasi dirubah, sinkronkan ke server?</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => originalConfig && setGlobalConfig(originalConfig)} className="px-5 py-2.5 rounded-xl text-white/60 text-xs font-bold hover:text-white transition-all bg-white/5 font-mono">Discard</button>
            <button onClick={() => handleSave()} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 font-mono">
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
              Sync Brain
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            {t.type === 'success' && <CheckCircle2 size={16} className="text-green-400" />}
            {t.type === 'error' && <XCircle size={16} className="text-red-400" />}
            {t.type === 'info' && <Info size={16} className="text-primary" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
