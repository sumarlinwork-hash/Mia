import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Bot, PenTool, Workflow, BarChart3, Rocket } from 'lucide-react';
import labels from '../utils/labels';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface SimpleBuilderProps {
  onClose: () => void;
  onGenerate: (data: { template_id: string; app_name: string; prompt: string }) => void;
}

const SimpleBuilder: React.FC<SimpleBuilderProps> = ({ onClose, onGenerate }) => {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [appName, setAppName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    fetch('/api/apps/templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(data);
        setLoadingTemplates(false);
      })
      .catch(() => setLoadingTemplates(false));
  }, []);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bot': return <Bot size={24} />;
      case 'PenTool': return <PenTool size={24} />;
      case 'Workflow': return <Workflow size={24} />;
      case 'BarChart3': return <BarChart3 size={24} />;
      default: return <Rocket size={24} />;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Pilih Template</h2>
            {loadingTemplates ? (
              <div className="py-10 text-center text-white/20 animate-pulse">Memuat template...</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {templates.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => { setSelectedTemplate(t.id); nextStep(); }}
                    className={`p-6 rounded-2xl border text-left transition-all ${
                      selectedTemplate === t.id 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="mb-4">{getIcon(t.icon)}</div>
                    <div className="font-bold text-sm mb-1">{t.name}</div>
                    <div className="text-[10px] opacity-60 leading-relaxed">{t.description}</div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Detail Aplikasi</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Nama Aplikasi</label>
                <input 
                  type="text" 
                  value={appName} 
                  onChange={e => setAppName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                  placeholder="Contoh: Asisten Diet"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Tujuan Aplikasi</label>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary h-32"
                  placeholder="Jelaskan apa yang ingin Anda capai..."
                />
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Sparkles size={32} className="animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Sintesis AI Sedang Berjalan</h2>
            <p className="text-sm text-white/40">MIA sedang merancang logika aplikasi berdasarkan template {templates.find(t => t.id === selectedTemplate)?.name}.</p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    if (step === 3) {
      setTimeout(() => {
        onGenerate({
          template_id: selectedTemplate!,
          app_name: appName,
          prompt: prompt
        });
      }, 2000);
    }
  }, [step, selectedTemplate, appName, prompt, onGenerate]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>

        <div className="p-10">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {step < 3 && (
            <div className="flex justify-between mt-10">
              <button 
                onClick={step === 1 ? onClose : prevStep}
                className="px-6 py-3 rounded-xl text-white/40 font-bold hover:text-white transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={18} /> {step === 1 ? 'Batal' : 'Kembali'}
              </button>
              {step === 2 && (
                <button 
                  onClick={nextStep}
                  disabled={!appName || !prompt}
                  className="px-8 py-3 rounded-xl bg-primary text-black font-bold hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-30 disabled:grayscale"
                >
                  Sintesis <ChevronRight size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleBuilder;
