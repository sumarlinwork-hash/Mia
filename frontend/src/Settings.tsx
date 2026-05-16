import { useState, useEffect, useCallback, useMemo } from 'react';
// MIA Architect Studio - Intelligence Core Logic
import {
  ArrowLeft, Save, Plus, Trash2, Pencil, Zap,
  CheckCircle2, XCircle, Info, RefreshCcw, Star
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useConfig } from './hooks/useConfig';
import { useInstalledSkills, queryKeys } from './hooks/useMIAQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketEvent } from './hooks/useWebSocket';

import type { MIAConfig, ProviderConfig } from './types/config';
import type { App as Skill } from './utils/viewModel';
import ResilienceDashboard from './ResilienceDashboard';


const PROTOCOLS = ["OpenAI Compatible", "Gemini API", "Groq"];
const PURPOSES = ["Inti Logika & Pikiran", "Persepsi Visual & Imajinasi", "Kreativitas & Kreasi Media", "Analisis Data & Pengetahuan", "Khusus Intimacy & Uncensored"];
const COSTS = ["Gratis berlimit", "Berbayar", "Lokal"];
const BACKGROUND_TYPES = ['video', 'image', 'color', 'themes'] as const;
type BackgroundType = MIAConfig['appearance']['background_type'];

const BACKGROUND_THEMES = [
  { id: 'aurora', label: 'Aurora', background: 'radial-gradient(circle at 20% 20%, rgba(0, 255, 204, 0.35), transparent 34%), radial-gradient(circle at 80% 10%, rgba(250, 37, 161, 0.25), transparent 32%), linear-gradient(135deg, #030712 0%, #111827 48%, #050505 100%)' },
  { id: 'graphite', label: 'Graphite', background: 'linear-gradient(135deg, #050505 0%, #171717 52%, #262626 100%)' },
  { id: 'midnight', label: 'Midnight', background: 'linear-gradient(135deg, #020617 0%, #172554 42%, #111827 100%)' },
  { id: 'sakura', label: 'Sakura', background: 'radial-gradient(circle at 80% 15%, rgba(251, 113, 133, 0.32), transparent 36%), linear-gradient(135deg, #1f1117 0%, #3b2430 48%, #09090b 100%)' },
];

const inferBackgroundType = (value: string): BackgroundType => {
  const path = value.split('?')[0].toLowerCase();
  if (path.startsWith('#')) return 'color';
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(path)) return 'video';
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/.test(path)) return 'image';
  return 'image';
};

const PRESETS: Record<string, Partial<ProviderConfig & { endpoint: string }>> = {
  "OpenAI": { protocol: "OpenAI Compatible", base_url: "https://api.openai.com", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Google Gemini": { protocol: "Gemini API", base_url: "https://generativelanguage.googleapis.com", endpoint: "/v1beta/models/{model_id}:generateContent", cost_label: COSTS[0], purpose: PURPOSES[0] },
  "Anthropic": { protocol: "OpenAI Compatible", base_url: "https://api.anthropic.com", endpoint: "/v1/messages", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Groq": { protocol: "Groq", base_url: "https://api.groq.com", endpoint: "/openai/v1/chat/completions", cost_label: COSTS[0], purpose: PURPOSES[0] },
  "DeepSeek": { protocol: "OpenAI Compatible", base_url: "https://api.deepseek.com", endpoint: "/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Mistral": { protocol: "OpenAI Compatible", base_url: "https://api.mistral.ai", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Perplexity": { protocol: "OpenAI Compatible", base_url: "https://api.perplexity.ai", endpoint: "/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[3] },
  "HuggingFace (Auto)": { protocol: "OpenAI Compatible", base_url: "https://router.huggingface.co", endpoint: "/v1/chat/completions", cost_label: COSTS[0], purpose: PURPOSES[0] },
  "Together AI": { protocol: "OpenAI Compatible", base_url: "https://api.together.xyz", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "OpenRouter": { protocol: "OpenAI Compatible", base_url: "https://openrouter.ai", endpoint: "/api/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Cohere": { protocol: "OpenAI Compatible", base_url: "https://api.cohere.ai", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Fireworks AI": { protocol: "OpenAI Compatible", base_url: "https://api.fireworks.ai", endpoint: "/inference/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "xAI (Grok)": { protocol: "OpenAI Compatible", base_url: "https://api.x.ai", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Local LLM": { protocol: "OpenAI Compatible", base_url: "http://localhost:11434", endpoint: "/v1/chat/completions", cost_label: COSTS[2], purpose: PURPOSES[0] },
  "Alibaba (Qwen)": { protocol: "OpenAI Compatible", base_url: "https://dashscope.aliyuncs.com", endpoint: "/compatible-mode/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "SiliconFlow": { protocol: "OpenAI Compatible", base_url: "https://api.siliconflow.cn", endpoint: "/v1/chat/completions", cost_label: COSTS[0], purpose: PURPOSES[0] },
  "SeaLLMs (Sea AI)": { protocol: "OpenAI Compatible", base_url: "https://api.siliconflow.cn", endpoint: "/v1/chat/completions", cost_label: COSTS[0], purpose: PURPOSES[0] },
  "ByteDance / TikTok": { protocol: "OpenAI Compatible", base_url: "https://api.openrouter.ai", endpoint: "/api/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Xiaomi (MiLM)": { protocol: "OpenAI Compatible", base_url: "https://api.siliconflow.cn", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Moonshot AI (Kimi)": { protocol: "OpenAI Compatible", base_url: "https://api.moonshot.cn", endpoint: "/v1/chat/completions", cost_label: COSTS[1], purpose: PURPOSES[0] },
  "Custom": { protocol: "OpenAI Compatible", base_url: "", endpoint: "", cost_label: COSTS[0], purpose: PURPOSES[0] },
};

interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'info';
}

export default function Settings() {
  const { config, loading, updateConfig: setGlobalConfig, refreshConfig } = useConfig();
  const [originalConfig, setOriginalConfig] = useState<MIAConfig | null>(null);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('intelligence');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['intelligence', 'appearance', 'personality', 'skills', 'resilience'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editName, setEditName] = useState<string | null>(null);
  const { data: skills = [] } = useInstalledSkills();
  const queryClient = useQueryClient();

  useWebSocketEvent('skills_updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.skills });
  }, [queryClient]));

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillCode, setSkillCode] = useState("");
  const [testCountdown, setTestCountdown] = useState<number>(0);
  const [activeTest, setActiveTest] = useState<string | null>(null);


  // Form State
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

  const previewUrl = useMemo(() => {
    if (!newProvider.base_url) return '';
    return newProvider.model_id
      ? newProvider.base_url.replace('{model_id}', newProvider.model_id)
      : newProvider.base_url;
  }, [newProvider.base_url, newProvider.model_id]);


  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // Color Helpers
  const rgbaToHex = (rgba: string) => {
    if (!rgba.startsWith('rgba')) return rgba;
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return "#00ffcc";
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const getOpacity = (rgba: string) => {
    if (!rgba.startsWith('rgba')) return 1;
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    return match && match[4] ? parseFloat(match[4]) : 1;
  };

  const combineToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const applyAppearance = (appearance: MIAConfig['appearance']) => {
    if (!config) return;
    const newConf = { ...config, appearance };
    updateConfigLocal(newConf);
    // AUTO-SAVE: Instant persistence for visual changes
    handleSave(newConf, true);
  };

  const handleBackgroundTypeChange = (backgroundType: BackgroundType) => {
    if (!config) return;
    const nextUrl =
      backgroundType === 'color' ? (config.appearance.background_url.startsWith('#') ? config.appearance.background_url : '#0a0a0a') :
      backgroundType === 'themes' ? (BACKGROUND_THEMES.some(theme => theme.id === config.appearance.background_url) ? config.appearance.background_url : BACKGROUND_THEMES[0].id) :
      config.appearance.background_url;

    applyAppearance({
      ...config.appearance,
      background_type: backgroundType,
      background_url: nextUrl,
    });
  };

  const handleBackgroundUrlChange = (value: string) => {
    if (!config) return;
    const backgroundType = value.trim() ? inferBackgroundType(value.trim()) : config.appearance.background_type;
    applyAppearance({
      ...config.appearance,
      background_url: value,
      background_type: backgroundType,
    });
  };

  const handleLocalBackgroundUpload = () => {
    if (!config) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = config.appearance.background_type === 'video' ? 'video/*' : 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !config) return;

      const previousConfig = config;
      const detectedType: BackgroundType = file.type.startsWith('video/') ? 'video' : 'image';
      const localPreviewUrl = URL.createObjectURL(file);
      updateConfigLocal({
        ...config,
        appearance: {
          ...config.appearance,
          background_url: localPreviewUrl,
          background_type: detectedType,
        }
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'chatbg');
      setIsUploading(true);

      try {
        const res = await fetch('/api/upload-bg', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.detail || 'Upload failed');

        const finalConfig = {
          ...previousConfig,
          appearance: {
            ...previousConfig.appearance,
            background_url: data.url,
            background_type: detectedType,
          }
        };

        updateConfigLocal(finalConfig);
        // AUTO-SAVE: Persist the new upload immediately
        await handleSave(finalConfig, true);
        
        addToast("Background berhasil diperbarui secara instan", "success");
      } catch (err) {
        setGlobalConfig(previousConfig);
        addToast("Upload gagal: " + (err instanceof Error ? err.message : "Error"), "error");
      } finally {
        URL.revokeObjectURL(localPreviewUrl);
        setIsUploading(false);
      }
    };
    input.click();
  };

  useEffect(() => {
    let isMounted = true;

    if (config && !originalConfig && isMounted) {
      setTimeout(() => {
        // Deep clone to prevent reference sharing
        if (isMounted) setOriginalConfig(JSON.parse(JSON.stringify(config)));
      }, 0);
    }

    return () => { isMounted = false; };
  }, [config, originalConfig]);


  const updateConfigLocal = async (newConf: MIAConfig) => {
    setGlobalConfig(newConf);
    setHasChanges(JSON.stringify(newConf) !== JSON.stringify(originalConfig));
  };

  const handleSave = async (updatedConfig = config, isSilent = false) => {
    if (!updatedConfig) return;
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
      
      const savedConfig = JSON.parse(JSON.stringify(updatedConfig));
      setOriginalConfig(savedConfig);
      setHasChanges(false);
      
      if (!isSilent) {
        addToast("Konfigurasi berhasil disimpan secara permanen", "success");
      }
    } catch (err) {
      if (!isSilent) {
        addToast("Gagal menyimpan: " + (err instanceof Error ? err.message : "Internal Error"), "error");
        if (originalConfig) {
          setGlobalConfig(originalConfig);
        }
      } else {
        console.error("[Silent Save] Failed:", err);
      }
    } finally {
      if (!isSilent) setIsSaving(false);
    }
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
    await handleSave(updatedConfig);
    await refreshConfig();
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
    await handleSave(updatedConfig);
  };

  const toggleProvider = async (name: string) => {
    if (!config) return;
    const updatedConfig = { ...config };
    updatedConfig.providers[name].is_active = !updatedConfig.providers[name].is_active;
    await handleSave(updatedConfig);
  };

  const testProvider = async (name: string) => {
    if (!config) return;
    // Start Countdown
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
        const failProviders = { ...config.providers };
        failProviders[name].latency = 9999;
        setGlobalConfig({ ...config, providers: failProviders });
      }
    } catch (err) {
      const error = err as Error;
      addToast(`Masalah Jaringan: ${error.message}`, 'error');
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
    
    // Start Countdown
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
        addToast(`Koneksi Berhasil! Latensi: ${data.latency}ms`, "success");
      } else {
        addToast(`Gagal: ${data.message}`, "error");
      }
    } catch {
      addToast("Kesalahan Jaringan saat pengetesan", "error");
    } finally {
      clearInterval(timer);
      setActiveTest(null);
      setTestCountdown(0);
    }
  };

  const startEdit = (name: string, p: ProviderConfig) => {
    setEditName(name);
    setNewProvider({ ...p, display_name: name });
    setIsAutoUrl(p.base_url?.includes('{model_id}') || false);
    setView('edit');
  };

  const uninstallSkill = async (id: string) => {
    if (!confirm(`Hapus keahlian "${id}"?`)) return;
    try {
      const res = await fetch(`/api/skills/uninstall/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        queryClient.invalidateQueries({ queryKey: queryKeys.skills });
        addToast("Skill dihapus", "success");
      }
    } catch { addToast("Gagal menghapus skill", "error"); }
  };

  const testSkill = async (id: string) => {
    addToast(`Menguji: ${id}...`, "info");
    try {
      const res = await fetch(`/api/skills/test/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        addToast(`Hasil: ${data.output}`, "success");
      } else {
        addToast(data.message, "error");
      }
    } catch { addToast("Uji coba gagal", "error"); }
  };

  const openEditSkill = async (skill: Skill) => {
    try {
      const res = await fetch(`/api/memory/file?name=../skills/${skill.id}.py`);
      const data = await res.json();
      if (data.content) {
        setSkillCode(data.content);
        setEditingSkill(skill);
      } else {
        setSkillCode("# Plugin source editing not yet supported for directory-based skills.");
        setEditingSkill(skill);
      }
    } catch {
      addToast("Gagal mengambil kode skill", "error");
    }
  };

  const saveSkillEdit = async () => {
    if (!editingSkill) return;
    try {
      const res = await fetch('/api/skills/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSkill.id, code: skillCode })
      });
      const data = await res.json();
      if (data.status === 'success') {
        queryClient.invalidateQueries({ queryKey: queryKeys.skills });
        addToast("Logic skill berhasil diperbarui!", "success");
        setEditingSkill(null);
      }
    } catch { addToast("Gagal menyimpan skill", "error"); }
  };

  if (loading || !config) return <div className="h-screen w-full flex items-center justify-center text-primary font-mono animate-pulse">Memuat Jiwa MIA...</div>;

  return (
    <div className="min-h-screen w-full p-4 sm:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-all">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
          </div>
          <div className="flex gap-3">
            {view === 'list' ? (
              <button
                onClick={() => setView('add')}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={20} /> Daftarkan Provider Baru
              </button>
            ) : (
              <button
                onClick={() => { setView('list'); setEditName(null); setIsAutoUrl(false); }}
                className="px-6 py-2.5 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
              >
                Batal
              </button>
            )}
          </div>
        </header>

        <div className="flex gap-8 mb-8 border-b border-white/10">
          {['intelligence', 'appearance', 'personality', 'skills', 'resilience'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white'}`}
            >
              {tab === 'skills' ? 'Manage Abilities' : tab === 'resilience' ? 'Resilience Audit' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'intelligence' && (
          <>
            <div className="mb-10 p-8 rounded-[32px] bg-primary/5 border border-primary/20 backdrop-blur-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/20 text-primary"><Zap size={20} /></div>
                <div>
                  <h2 className="text-xl font-bold text-white">System Operation Mode</h2>
                  <p className="text-xs text-white/40">Tentukan tingkat keamanan dan visibilitas operasional MIA.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'SAFE_MODE', label: 'SAFE MODE', desc: 'Prioritas Keamanan Tinggi (Default)', color: 'border-green-500/30' },
                  { id: 'POWER_MODE', label: 'POWER MODE', desc: 'Visibilitas Penuh & Expert Access', color: 'border-primary/50' },
                  { id: 'BEGINNER_MODE', label: 'BEGINNER MODE', desc: 'Antarmuka Sederhana & Aman', color: 'border-blue-500/30' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => updateConfigLocal({ ...config, os_mode: mode.id })}
                    className={`p-4 rounded-2xl border text-left transition-all group ${config.os_mode === mode.id
                      ? `bg-primary/10 ${mode.color} ring-1 ring-primary/20`
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                  >
                    <div className={`text-xs font-bold mb-1 ${config.os_mode === mode.id ? 'text-primary' : 'text-white/60'}`}>{mode.label}</div>
                    <div className="text-[10px] text-white/40 group-hover:text-white/60">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {view === 'list' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {Object.entries(config.providers).map(([name, p]: [string, ProviderConfig]) => (
                    <div key={name} className={`relative p-6 rounded-3xl border backdrop-blur-3xl transition-all group ${p.is_active ? 'border-white/10 bg-black/40' : 'border-white/5 bg-black/20 opacity-60'}`}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                          <Zap size={24} className={p.is_active ? "animate-pulse" : ""} />
                        </div>
                        <div className="flex gap-2">
                          <div className="group relative">
                            <Info size={14} className="text-white/20 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Protocol: {p.protocol} | Purpose: {p.purpose}
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(name, p)} className="p-2 text-white/40 hover:text-white"><Pencil size={18} /></button>
                            <button onClick={() => deleteProvider(name)} className="p-2 text-white/40 hover:text-error"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white">{name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 uppercase tracking-tighter">{p.cost_label}</span>
                          {p.is_default && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-black uppercase tracking-tighter">DEFAULT</span>}
                        </div>
                        <p className="text-xs text-white/40 font-mono">Model: {p.model_id}</p>
                      </div>

                      <div className="space-y-2 mb-8 font-mono text-[11px] text-white/60">
                        <div className="flex justify-between">
                          <span>Purpose:</span>
                          <span className="text-white/80">{p.purpose}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Latency(avg):</span>
                          <span className="text-primary">{p.latency} ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Health:</span>
                          <span className={p.health_fail > 0 ? 'text-error' : 'text-green-400'}>
                            OK {p.health_ok} / FAIL {p.health_fail}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-white/20'}`} />
                          <span className="text-xs font-bold text-white/90">Status: {p.is_active ? 'ON' : 'OFF'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => testProvider(name)}
                            disabled={activeTest === name}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[11px] font-bold text-white transition-all disabled:opacity-50"
                          >
                            <RefreshCcw size={12} className={activeTest === name ? "animate-spin" : ""} />
                            {activeTest === name ? `Testing (${testCountdown}s)...` : 'Test'}
                          </button>
                          <div
                            onClick={() => toggleProvider(name)}
                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${p.is_active ? 'bg-primary' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${p.is_active ? 'left-6' : 'left-1'}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {hasChanges && (
                  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg p-4 rounded-3xl bg-black/80 backdrop-blur-3xl border border-primary/30 flex items-center justify-between animate-in slide-in-from-bottom-10 duration-700 shadow-2xl z-[200]">
                    <div className="flex items-center gap-4 ml-2">
                      <div className="p-2 rounded-full bg-primary/20 text-primary"><Zap size={20} className="animate-pulse" /></div>
                      <div>
                        <div className="text-[11px] font-bold text-white uppercase tracking-widest">Brain Sync Required</div>
                        <div className="text-[10px] text-white/40">Provider configuration updated</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => originalConfig && setGlobalConfig(originalConfig)} className="px-6 py-2.5 rounded-xl text-white/60 text-xs font-bold hover:text-white transition-all bg-white/5">Discard</button>
                      <button onClick={() => handleSave()} disabled={isSaving || isUploading} className="flex items-center gap-2 px-8 py-2.5 bg-primary text-black rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50">
                        {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                        Sync Brain
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="max-w-3xl backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 animate-in zoom-in-95 duration-300 shadow-2xl shadow-black/50" style={{ backgroundColor: `rgba(26, 26, 26, ${1 - (config?.appearance?.ui_opacity ?? 0.5)})` }}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary"><Star size={20} /></div>
                    <h2 className="text-xl font-bold text-white">Formulir Registrasi Intelijen</h2>
                  </div>
                  <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Step 3 of 9: Intelligence Setup</div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="relative mb-8">
                    <label className="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                      Pilih Intelegensi Inti (Preset)
                      {newProvider.display_name && <CheckCircle2 size={12} className="text-green-500" />}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {Object.entries(PRESETS).map(([key, preset]) => {
                        const isSelected = newProvider.display_name === key;
                        const handleSelectPreset = () => {
                          const isCustom = key === 'Custom';
                          setIsAutoUrl(!isCustom);
                          setNewProvider({ ...newProvider, display_name: key, ...preset, base_url: isCustom ? '' : (preset.base_url + (preset.endpoint || '')) });
                        };
                        return (
                          <div key={key} onClick={handleSelectPreset} className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center text-center gap-2 ${isSelected ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(0,255,204,0.3)] scale-105 z-10' : 'border-white/5 hover:border-white/20'}`} style={!isSelected ? { backgroundColor: `rgba(255, 255, 255, ${(1 - (config?.appearance?.ui_opacity ?? 0.5)) * 0.1})` } : {}}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${isSelected ? 'bg-primary text-black' : 'bg-black/50 text-white/60'}`}>{key.charAt(0)}</div>
                            <div className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-white/80'}`}>{key}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Nama Display (Bebas) {newProvider.display_name.length < 3 ? <XCircle size={12} className="text-error" /> : <CheckCircle2 size={12} className="text-green-500" />}</label>
                      <input type="text" value={newProvider.display_name} onChange={e => setNewProvider({ ...newProvider, display_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" placeholder="MIA Main Brain" />
                    </div>
                    <div className="relative">
                      <label className="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest mb-2">ID Model {!newProvider.model_id ? <XCircle size={12} className="text-error" /> : <CheckCircle2 size={12} className="text-green-500" />}</label>
                      <input type="text" value={newProvider.model_id} onChange={e => setNewProvider({ ...newProvider, model_id: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" placeholder="gpt-4o" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
                        API Key
                        {(() => {
                          const isLocal = newProvider.base_url.includes("localhost") || newProvider.base_url.includes("127.0.0.1");
                          const isValid = newProvider.api_key.length >= 8 || isLocal;
                          return isValid ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-error" />;
                        })()}
                      </label>
                      <input type="password" value={newProvider.api_key} onChange={e => setNewProvider({ ...newProvider, api_key: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" placeholder="sk-proj-..." />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Target URL (Full Path) {isAutoUrl && <span className="px-2 py-0.5 rounded-full text-[9px] bg-primary/20 text-primary font-bold tracking-normal normal-case">Smart-Configured</span>}</label>
                      <input type="text" value={isAutoUrl ? previewUrl : newProvider.base_url} readOnly={isAutoUrl} placeholder={isAutoUrl ? 'Masukkan Model ID di atas untuk melihat URL' : 'Masukkan URL lengkap API endpoint'} onChange={e => !isAutoUrl && setNewProvider({ ...newProvider, base_url: e.target.value })} className={`w-full bg-white/5 border rounded-xl px-4 py-3 outline-none font-mono text-sm transition-all ${isAutoUrl ? 'border-primary/20 text-primary/80 cursor-default' : 'border-white/10 text-white focus:border-primary'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Kelompok Saraf (Purpose)</label>
                      <select value={newProvider.purpose} onChange={e => setNewProvider({ ...newProvider, purpose: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary">
                        {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Label Biaya</label>
                      <select value={newProvider.cost_label} onChange={e => setNewProvider({ ...newProvider, cost_label: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary">
                        {COSTS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <button onClick={() => { setView('list'); setIsAutoUrl(false); }} className="py-4 bg-white/5 border border-white/10 text-white/60 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all active:scale-95">Batal</button>
                    <button onClick={testNewProvider} disabled={activeTest === "NEW_FORM"} className="py-4 bg-white/10 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                      {activeTest === "NEW_FORM" ? <RefreshCcw size={20} className="animate-spin" /> : <Zap size={20} />}
                      {activeTest === "NEW_FORM" ? `Testing (${testCountdown}s)` : 'Test Connection'}
                    </button>
                    <button onClick={handleAddOrEditProvider} disabled={isSaving} className="py-4 bg-primary text-black rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50">
                      {isSaving ? <RefreshCcw className="animate-spin" /> : <Save size={20} />}
                      Simpan & Aktifkan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'appearance' && (
          <div className="relative max-w-4xl backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 pb-28 sm:pb-32 animate-in slide-in-from-right-4 duration-300" style={{ backgroundColor: `rgba(26, 26, 26, ${1 - (config?.appearance?.ui_opacity ?? 0.5)})` }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/20 text-secondary"><Zap size={20} /></div>
                Visual & Interface Settings
              </h2>
              <button onClick={() => handleSave()} disabled={!hasChanges || isSaving || isUploading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-primary text-black rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100">
                {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                {hasChanges ? 'Simpan Perubahan' : 'Sudah Tersimpan'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-4">UI Transparency: {Math.round(config.appearance.ui_opacity * 100)}%</label>
                <input type="range" min="0.1" max="1" step="0.05" value={config.appearance.ui_opacity} onChange={e => updateConfigLocal({ ...config, appearance: { ...config.appearance, ui_opacity: parseFloat(e.target.value) } })} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">MIA Bubble Color & Opacity</label>
                  <div className="flex flex-col gap-3 p-4 rounded-2xl border border-white/5" style={{ backgroundColor: `rgba(255, 255, 255, ${(1 - (config?.appearance?.ui_opacity ?? 0.5)) * 0.1})` }}>
                    <div className="flex gap-4 items-center">
                      <input type="color" value={rgbaToHex(config.appearance.bubble_color_mia)} onChange={e => updateConfigLocal({ ...config, appearance: { ...config.appearance, bubble_color_mia: combineToRgba(e.target.value, getOpacity(config.appearance.bubble_color_mia)) } })} className="w-12 h-12 rounded-lg bg-transparent border-none cursor-pointer" />
                      <div className="flex-1">
                        <input type="range" min="0" max="1" step="0.05" value={getOpacity(config.appearance.bubble_color_mia)} onChange={e => updateConfigLocal({ ...config, appearance: { ...config.appearance, bubble_color_mia: combineToRgba(rgbaToHex(config.appearance.bubble_color_mia), parseFloat(e.target.value)) } })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
                        <div className="flex justify-between text-[10px] mt-1 text-white/20 font-mono">
                          <span>Alpha: {Math.round(getOpacity(config.appearance.bubble_color_mia) * 100)}%</span>
                          <span>HEX: {rgbaToHex(config.appearance.bubble_color_mia)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">User Bubble Color & Opacity</label>
                  <div className="flex flex-col gap-3 p-4 rounded-2xl border border-white/5" style={{ backgroundColor: `rgba(255, 255, 255, ${(config?.appearance?.ui_opacity ?? 0.5) * 0.1})` }}>
                    <div className="flex gap-4 items-center">
                      <input type="color" value={rgbaToHex(config.appearance.bubble_color_user)} onChange={e => updateConfigLocal({ ...config, appearance: { ...config.appearance, bubble_color_user: combineToRgba(e.target.value, getOpacity(config.appearance.bubble_color_user)) } })} className="w-12 h-12 rounded-lg bg-transparent border-none cursor-pointer" />
                      <div className="flex-1">
                        <input type="range" min="0" max="1" step="0.05" value={getOpacity(config.appearance.bubble_color_user)} onChange={e => updateConfigLocal({ ...config, appearance: { ...config.appearance, bubble_color_user: combineToRgba(rgbaToHex(config.appearance.bubble_color_user), parseFloat(e.target.value)) } })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
                        <div className="flex justify-between text-[10px] mt-1 text-white/20 font-mono">
                          <span>Alpha: {Math.round(getOpacity(config.appearance.bubble_color_user) * 100)}%</span>
                          <span>HEX: {rgbaToHex(config.appearance.bubble_color_user)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Background Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BACKGROUND_TYPES.map(type => (
                    <button key={type} onClick={() => handleBackgroundTypeChange(type)} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${config.appearance.background_type === type ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{type}</button>
                  ))}
                </div>
              </div>

              {config.appearance.background_type === 'themes' && (
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Theme Cepat</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {BACKGROUND_THEMES.map(theme => (
                      <button key={theme.id} onClick={() => applyAppearance({ ...config.appearance, background_type: 'themes', background_url: theme.id })} className={`h-24 rounded-xl border text-left p-3 overflow-hidden transition-all ${config.appearance.background_url === theme.id ? 'border-primary ring-2 ring-primary/30' : 'border-white/10 hover:border-white/30'}`} style={{ background: theme.background }}><span className="text-xs font-bold text-white drop-shadow">{theme.label}</span></button>
                    ))}
                  </div>
                </div>
              )}

              {config.appearance.background_type !== 'color' && config.appearance.background_type !== 'themes' ? (
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Background URL / Local Path</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" value={config.appearance.background_url} onChange={e => handleBackgroundUrlChange(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary font-mono text-xs" placeholder="/assets/chatbg/file.mp4 or https://..." />
                    <button onClick={handleLocalBackgroundUpload} disabled={isUploading} className={`w-full sm:w-auto justify-center px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-xs hover:bg-white/20 transition-all flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>{isUploading ? <RefreshCcw className="animate-spin" size={16} /> : <Plus size={16} />}{isUploading ? 'Uploading...' : 'Upload Lokal'}</button>
                  </div>
                  <p className="mt-2 text-[10px] text-white/30">Paste URL image/video atau upload file lokal. Preview berubah langsung tanpa F5.</p>
                </div>
              ) : config.appearance.background_type === 'color' ? (
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Background Solid Color</label>
                  <input type="color" value={config.appearance.background_url.startsWith('#') ? config.appearance.background_url : '#0a0a0a'} onChange={e => updateConfigLocal({ ...config, appearance: { ...config.appearance, background_url: e.target.value } })} className="w-full h-12 rounded-xl bg-transparent border border-white/10 cursor-pointer" />
                </div>
              ) : null}
            </div>
            
            {hasChanges && (
              <div className="fixed sm:absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 p-4 rounded-2xl bg-black/80 backdrop-blur-2xl border border-primary/30 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between animate-in slide-in-from-bottom-4 duration-500 shadow-2xl z-[10]">
                <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,204,0.6)]" /><span className="text-xs font-bold text-white/80">Perubahan visual terdeteksi</span></div>
                <div className="flex gap-2">
                  <button onClick={() => originalConfig && (setGlobalConfig(originalConfig), setHasChanges(false))} className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-white/60 text-xs font-bold hover:text-white transition-all">Batalkan</button>
                  <button onClick={() => handleSave()} disabled={isSaving || isUploading} className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-6 py-2 bg-primary text-black rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50">{isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}Simpan Sekarang</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'personality' && (
          <div className="relative max-w-3xl backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 animate-in slide-in-from-right-4 duration-300" style={{ backgroundColor: `rgba(26, 26, 26, ${1 - (config?.appearance?.ui_opacity ?? 0.5)})` }}>
            <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/20 text-primary"><RefreshCcw size={20} /></div>Personality & Behavior Core</h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">AI Name</label><input type="text" value={config.bot_name} onChange={e => updateConfigLocal({ ...config, bot_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" /></div>
                <div><label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">AI Age</label><input type="number" value={config.bot_age} onChange={e => updateConfigLocal({ ...config, bot_age: parseInt(e.target.value) || 0 })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" /></div>
              </div>
              <div className="flex items-center justify-between p-6 rounded-2xl border border-white/10" style={{ backgroundColor: `rgba(255, 255, 255, ${(1 - (config?.appearance?.ui_opacity ?? 0.5)) * 0.1})` }}>
                <div><h3 className="font-bold text-white mb-1">Professional Mode</h3><p className="text-[10px] text-white/40">Gunakan terminologi produktivitas dan estetika netral.</p></div>
                <div onClick={() => updateConfigLocal({ ...config, is_professional_mode: !config.is_professional_mode })} className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${config.is_professional_mode ? 'bg-primary' : 'bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.is_professional_mode ? 'left-7' : 'left-1'}`} /></div>
              </div>
              <div><label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Base System Persona</label><textarea value={config.bot_persona} onChange={e => updateConfigLocal({ ...config, bot_persona: e.target.value })} rows={6} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary font-sans leading-relaxed" placeholder="Definisikan karakter MIA di sini..." /></div>
              <div className="pt-8 mt-8 border-t border-white/5">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6">Voice & Speech Engine</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">STT Engine</label><select value={config.stt_engine} onChange={e => updateConfigLocal({ ...config, stt_engine: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"><option value="speech_recognition">Python Native (Google)</option><option value="whisper">OpenAI Whisper (Local)</option></select></div>
                  <div><label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">TTS Engine</label><select value={config.tts_engine} onChange={e => updateConfigLocal({ ...config, tts_engine: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"><option value="edge-tts">Edge-TTS</option><option value="elevenlabs">ElevenLabs</option><option value="gtts">Google TTS</option></select></div>
                </div>
                {config.tts_engine === 'elevenlabs' && (<div className="mt-4 animate-in slide-in-from-top-2 duration-300"><label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">ElevenLabs API Key</label><input type="password" value={config.elevenlabs_api_key} onChange={e => updateConfigLocal({ ...config, elevenlabs_api_key: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary" placeholder="sk-..." /></div>)}
              </div>
            </div>
            {hasChanges && (
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/60 backdrop-blur-2xl border border-primary/30 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 shadow-2xl z-[10]">
                <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,204,0.6)]" /><span className="text-xs font-bold text-white/80">Karakter MIA telah berubah</span></div>
                <div className="flex gap-2">
                  <button onClick={() => originalConfig && setGlobalConfig(originalConfig)} className="px-4 py-2 rounded-xl text-white/60 text-xs font-bold hover:text-white transition-all">Batalkan</button>
                  <button onClick={() => handleSave()} disabled={isSaving || isUploading} className="flex items-center gap-2 px-6 py-2 bg-primary text-black rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50">{isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}Simpan Karakter</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="max-w-6xl mx-auto animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold text-white flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/20 text-primary"><Zap size={24} /></div>Skills & Autonomous Abilities</h2><div className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">MIA Self-Expansion Module</div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30 shadow-2xl flex flex-col items-center justify-center text-center group cursor-pointer hover:scale-[1.02] transition-all"><div className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center mb-4 shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform"><Plus size={32} /></div><h3 className="text-lg font-bold text-white mb-2">Pesan Keahlian Baru</h3><p className="text-xs text-white/50 leading-relaxed">Cukup bicarakan kebutuhan Anda di chat utama, dan MIA akan menulis kodenya sendiri untuk Anda.</p></div>
              {skills.map((skill: Skill) => (
                <div key={skill.id} className="p-6 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 hover:border-primary/40 transition-all group">
                  <div className="flex justify-between items-start mb-4"><div className="p-3 rounded-2xl bg-white/5 text-white/70 group-hover:text-primary transition-colors"><Zap size={20} /></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => openEditSkill(skill)} className="p-2 text-white/40 hover:text-white"><Pencil size={16} /></button><button onClick={() => uninstallSkill(skill.id)} className="p-2 text-white/40 hover:text-error"><Trash2 size={16} /></button></div></div>
                  <h3 className="text-lg font-bold text-white mb-1">{skill.name}</h3><p className="text-xs text-white/40 line-clamp-2 mb-6 h-8">{skill.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5"><span className="text-[10px] font-mono text-white/20 uppercase">{skill.created_at ? new Date(skill.created_at).toLocaleDateString() : 'Active'}</span><button onClick={() => testSkill(skill.id)} className="px-4 py-1.5 rounded-full bg-white/5 text-white/70 text-[10px] font-bold hover:bg-primary hover:text-black transition-all">Test Ability</button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resilience' && (<ResilienceDashboard />)}

        {/* Skill Editor Modal */}
        {editingSkill && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-[#1a1a1a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary"><Pencil size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Edit Ability: {editingSkill.name}</h2>
                    <p className="text-xs text-white/40">Modifikasi logika Python secara langsung untuk memperluas kapabilitas MIA.</p>
                  </div>
                </div>
                <button onClick={() => setEditingSkill(null)} className="p-2 text-white/40 hover:text-white transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <textarea
                  value={skillCode}
                  onChange={(e) => setSkillCode(e.target.value)}
                  className="flex-1 w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-primary font-mono text-sm outline-none focus:border-primary/30 transition-all resize-none custom-scrollbar"
                  spellCheck={false}
                />
              </div>

              <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-between">
                <div className="text-[10px] text-white/20 font-mono">
                  CAUTION: Mengubah kode secara tidak tepat dapat menyebabkan malfungsi pada modul skill.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingSkill(null)}
                    className="px-6 py-2.5 rounded-xl text-white/60 text-xs font-bold hover:text-white transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveSkillEdit}
                    className="flex items-center gap-2 px-8 py-2.5 bg-primary text-black rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30"
                  >
                    <Save size={16} />
                    Simpan Logic
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-[100]">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-3 rounded-2xl border backdrop-blur-xl animate-in slide-in-from-right-4 duration-300 shadow-2xl ${t.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : t.type === 'info' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-error/10 border-error/50 text-error'}`}><div className={`w-2 h-2 rounded-full ${t.type === 'success' ? 'bg-green-400' : t.type === 'info' ? 'bg-primary' : 'bg-error'}`} /><span className="text-sm font-bold">{t.msg}</span></div>
        ))}
      </div>
    </div>
  );
}
