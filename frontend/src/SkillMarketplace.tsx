import React, { useState, useEffect, useCallback } from 'react';
import { Search, Zap, Plus, Book, Music, MessageCircle, CheckCircle, Star, Sparkles, X, ChevronRight } from 'lucide-react';
import AppWizard from './components/SkillWizard';
import AppExecutor from './components/SkillExecutor';
import SetupFlow from './components/SetupFlow';
import SimpleBuilder from './components/SimpleBuilder';
import BuilderReview from './components/BuilderReview';
import PreviewModal from './components/PreviewModal';
import { motion, AnimatePresence } from 'framer-motion';
import { mapTelemetry } from './utils/telemetryMapper';
import viewModel from './utils/viewModel';
import type { App } from './utils/viewModel';
import labels from './utils/labels';


export interface AppManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  required_permissions: string[];
  execution_mode: string;
}

const SkillMarketplace: React.FC = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showSimpleBuilder, setShowSimpleBuilder] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [generatedAppData, setGeneratedAppData] = useState<{ manifest: AppManifest, logic: string } | null>(null);
  const [previewingApp, setPreviewingApp] = useState<App | null>(null);
  const [recommendations, setRecommendations] = useState<App[]>([]);
  
  const [executingApp, setExecutingApp] = useState<App | null>(null);
  const [settingUpApp, setSettingUpApp] = useState<App | null>(null);
  const [toasts, setToasts] = useState<{id: number, msg: string, type: string}[]>([]);

  const addToast = useCallback((msg: string, type: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const fetchApps = useCallback(() => {
    fetch('/api/skills/marketplace')
      .then(res => res.json())
      .then(data => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => {
        console.log('Apps API fallback');
        setLoading(false);
      });
  }, []);

  const fetchRecommendations = useCallback(() => {
    fetch('/api/apps/recommendations')
      .then(res => res.json())
      .then(data => setRecommendations(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchApps();
    fetchRecommendations();
  }, [fetchApps, fetchRecommendations]);

  const handleInstall = async (id: string) => {
    try {
      const res = await fetch(`/api/skills/install/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchApps(); // Refresh status
        return true;
      }
      return false;
    } catch (err) {
      console.error("Installation failed", err);
      return false;
    }
  };

  const handleUse = async (app: App) => {
    if (!app.is_installed) {
      const success = await handleInstall(app.id);
      if (!success) {
        addToast(`Gagal menambahkan ${app.name}`, "error");
        return;
      }
    }

    if (app.execution_mode === 'setup_required') {
      setSettingUpApp(app);
    } else {
      executeApp(app);
    }
  };

  const executeApp = (app: App) => {
    if (app.input_schema && Object.keys(app.input_schema).length > 0) {
      setExecutingApp(app);
    } else {
      addToast(labels.RUNNING_APP.replace('{name}', app.name), "info");
      fetch(`/api/skill/execute?skill_id=${app.id}`, { method: 'POST' });
    }
  };

  const handleGenerateApp = async (data: { template_id: string; app_name: string; prompt: string }) => {
    try {
      const res = await fetch('/api/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      setGeneratedAppData(result);
      setShowSimpleBuilder(false);
    } catch {
      addToast("Gagal menyusun aplikasi", "error");
      setShowSimpleBuilder(false);
    }
  };

  const handleDeployApp = async (manifest: AppManifest) => {
    try {
      // In a real flow, this would save to disk and refresh marketplace
      const res = await fetch('/api/skills/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manifest.name,
          code: generatedAppData?.logic || ""
        })
      });
      
      if (res.ok) {
        addToast(`${manifest.name} berhasil diterapkan!`, "success");
        setGeneratedAppData(null);
        fetchApps();
      } else {
        addToast("Gagal menerapkan aplikasi ke kernel", "error");
      }
    } catch {
      addToast("Error saat deployment", "error");
    }
  };

  const categories = [
    { name: 'Semua', icon: Zap },
    { name: 'Kreativitas', icon: Book },
    { name: 'Media', icon: Music },
    { name: 'Interaksi', icon: MessageCircle },
  ];

  const filteredApps = apps.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{labels.DISCOVERY_TITLE}</h1>
          <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold font-mono">{labels.DISCOVERY_SUBTITLE}</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder={labels.SEARCH_PLACEHOLDER}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-white outline-none focus:border-primary w-full md:w-80 transition-all backdrop-blur-3xl"
          />
        </div>
      </header>

      {/* Recommendations Carousel */}
      <AnimatePresence>
        {recommendations.length > 0 && !search && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-primary" size={20} />
              <h2 className="text-xl font-bold text-white">Rekomendasi Spesial</h2>
            </div>
            
            <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 custom-scrollbar scroll-smooth">
              {recommendations.map((rawApp) => {
                const app = viewModel.transform(rawApp);
                return (
                  <motion.div 
                    key={app.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setPreviewingApp(rawApp)}
                    className="flex-shrink-0 w-80 p-6 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 cursor-pointer relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4">
                      <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse">
                        {app.recommendation_reason || "Populer"}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4 pt-4">
                      <div className="p-3 rounded-2xl bg-white/5 text-primary group-hover:rotate-12 transition-transform">
                        <Zap size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{app.name}</h4>
                        <p className="text-[10px] text-white/40 uppercase">{app.category}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-white/40 line-clamp-2 h-8 mb-4">{app.displayDescription}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="text-[10px] text-primary/60 font-bold uppercase tracking-wider">Mulai Coba</div>
                      <ChevronRight size={14} className="text-white/20 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="flex gap-4 mb-12 overflow-x-auto pb-4 custom-scrollbar">
        {categories.map(cat => (
          <button 
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all whitespace-nowrap ${
              selectedCategory === cat.name 
              ? 'bg-primary/20 border-primary text-primary' 
              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <cat.icon size={16} />
            <span className="font-bold text-xs uppercase tracking-wider">{cat.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Architect an App Card */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowModeSelector(true)}
          className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/30 to-secondary/10 border border-primary/30 shadow-2xl flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center mb-6 shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform">
            <Plus size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{labels.ARCHITECT_TITLE}</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            {labels.ARCHITECT_DESC}
          </p>
        </motion.div>

        {!loading ? filteredApps.map((rawApp, i) => {
          const app = viewModel.transform(rawApp);
          const { status, cta } = app;
          
          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 hover:border-primary/40 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <Star className="text-white/10 group-hover:text-yellow-400 transition-colors" size={20} />
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-4 rounded-2xl bg-white/5 ${app.is_installed ? 'text-green-400' : 'text-primary'}`}>
                  {app.is_installed ? <CheckCircle size={24} /> : <Zap size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{app.name}</h3>
                  <span className="text-[10px] font-mono text-white/20 uppercase">v1.0.4 • {app.category || labels.PLUGIN}</span>
                </div>
              </div>

              {/* Social Proof Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {mapTelemetry({
                  downloads: app.downloads || 0,
                  executions: app.executions || 0,
                  trust_score: app.trust_score || 0
                }).map((proof, i) => (
                  <span 
                    key={i}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                      proof.type === 'trust' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      proof.type === 'popularity' ? 'bg-primary/10 border-primary/20 text-primary' :
                      proof.type === 'activity' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                      'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    {proof.label}
                  </span>
                ))}
              </div>
              
              <p className="text-sm text-white/40 mb-8 line-clamp-3 h-12">
                {app.displayDescription}
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="w-6 h-6 rounded-full border-2 border-black bg-surface-variant overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${app.id}${n}`} alt="user" />
                    </div>
                  ))}
                  <div className="text-[10px] text-white/20 ml-2 mt-1.5">+24 {labels.USERS}</div>
                </div>
                
                <div className="flex gap-2">
                  {cta.secondary && (
                    <button 
                      onClick={() => setPreviewingApp(rawApp)}
                      className="px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-white/10 transition-all"
                    >
                      {cta.secondary}
                    </button>
                  )}
                  <button 
                    onClick={() => handleUse(rawApp)}
                    disabled={cta.disabled}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${
                      cta.disabled ? 'bg-white/5 text-white/20' : 'bg-primary text-black hover:scale-105'
                    }`}
                  >
                    {status === 'READY' && <Zap size={16} fill="currentColor" />}
                    {cta.primary}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        }) : (
          <div className="col-span-full py-20 text-center">
            <div className="text-white/20 font-mono mb-4 italic tracking-widest">{labels.SYNCING}</div>
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          </div>
        )}
      </div>

      {/* Mode Selector Overlay */}
      <AnimatePresence>
        {showModeSelector && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-10 relative">
              <button onClick={() => setShowModeSelector(false)} className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors">
                <X size={24} />
              </button>
              
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Pilih Mode Pembuatan</h2>
                <p className="text-sm text-white/40">Bagaimana Anda ingin merancang aplikasi baru?</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => { setShowModeSelector(false); setShowSimpleBuilder(true); }}
                  className="w-full group p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all text-left flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">Mode Simpel (Direkomendasikan)</h4>
                    <p className="text-xs text-white/40">Buat aplikasi dari template dalam &lt; 60 detik.</p>
                  </div>
                  <ChevronRight className="text-white/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                </button>

                <button 
                  onClick={() => { setShowModeSelector(false); setShowWizard(true); }}
                  className="w-full group p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition-all text-left flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-lg font-bold text-white">Mode Lanjut</h4>
                    <p className="text-xs text-white/40">Kontrol penuh atas izin, logika, dan kategori.</p>
                  </div>
                  <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showSimpleBuilder && (
        <SimpleBuilder 
          onClose={() => setShowSimpleBuilder(false)}
          onGenerate={handleGenerateApp}
        />
      )}

      {generatedAppData && (
        <BuilderReview 
          data={generatedAppData}
          onClose={() => setGeneratedAppData(null)}
          onDeploy={handleDeployApp}
        />
      )}

      {previewingApp && (
        <PreviewModal 
          app={previewingApp}
          onClose={() => setPreviewingApp(null)}
          onInstall={() => {
            const appToInstall = previewingApp;
            setPreviewingApp(null);
            handleUse(appToInstall);
          }}
        />
      )}

      {executingApp && (
        <AppExecutor 
          app={executingApp}
          onClose={() => setExecutingApp(null)}
          onExecute={(inputs) => {
            addToast(labels.RUNNING_APP.replace('{name}', executingApp.name), "info");
            fetch(`/api/skill/execute?skill_id=${executingApp.id}`, { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inputs)
            });
            setExecutingApp(null);
          }}
        />
      )}

      {settingUpApp && (
        <SetupFlow 
          app={settingUpApp}
          onClose={() => setSettingUpApp(null)}
          onComplete={() => {
            setSettingUpApp(null);
            fetchApps();
            addToast(`${settingUpApp.name} siap digunakan!`, "success");
          }}
        />
      )}

      {showWizard && (
        <AppWizard 
          onClose={() => setShowWizard(false)}
          onComplete={(data) => {
            console.log("App built:", data);
            setShowWizard(false);
            addToast(labels.SENT_TO_KERNEL, "success");
            fetchApps();
          }}
        />
      )}

      {/* Toast Overlay */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <motion.div 
            key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
            className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 backdrop-blur-xl border ${
              t.type === 'success' ? 'bg-primary/20 border-primary/40 text-primary' : 
              t.type === 'error' ? 'bg-error/20 border-error/40 text-error' : 
              'bg-white/10 border-white/20 text-white'
            }`}
          >
            <CheckCircle size={18} /> {t.msg}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SkillMarketplace;
