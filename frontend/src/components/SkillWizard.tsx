import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Shield, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import labels from '../utils/labels';

interface AppData {
  name: string;
  description: string;
  category: string;
  permissions: string[];
  logic: string;
}

interface AppWizardProps {
  onClose: () => void;
  onComplete: (appData: AppData) => void;
}

const AppWizard: React.FC<AppWizardProps> = ({ onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: '',
    description: '',
    category: 'Utility',
    permissions: [] as string[],
    logic: ''
  });

  const categories = ['Kreativitas', 'Media', 'Interaksi', 'Utilitas', 'Produktivitas'];
  const permissions = ['Akses File', 'Akses Internet', 'Akses Memori', 'Kontrol Sistem'];

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Identitas & Tujuan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Nama Aplikasi</label>
                <input 
                  type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="Contoh: YouTube Summarizer"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Kategori</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button 
                      key={c} onClick={() => setData({...data, category: c})}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${data.category === c ? 'bg-primary text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Deskripsi</label>
                <textarea 
                  value={data.description} onChange={e => setData({...data, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary h-24"
                  placeholder="Apa kegunaan aplikasi ini?"
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Izin Akses</h2>
            <p className="text-white/40 text-sm mb-6">Pilih sumber daya yang perlu diakses oleh aplikasi ini.</p>
            <div className="space-y-3">
              {permissions.map(p => (
                <div 
                  key={p} onClick={() => {
                    const next = data.permissions.includes(p) ? data.permissions.filter(x => x !== p) : [...data.permissions, p];
                    setData({...data, permissions: next});
                  }}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${data.permissions.includes(p) ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/60'}`}
                >
                  <span className="font-bold text-sm">{p}</span>
                  <Shield size={16} />
                </div>
              ))}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Sintesis Logika</h2>
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center text-center">
              <Sparkles className="text-primary mb-4 animate-pulse" size={48} />
              <h3 className="text-lg font-bold text-white mb-2">MIA sedang Berpikir...</h3>
              <p className="text-sm text-white/40 mb-6">Saya sedang menyusun kode Python berdasarkan kebutuhan Anda.</p>
              <div className="w-full bg-black/40 rounded-xl p-4 font-mono text-[10px] text-primary/60 text-left overflow-hidden h-40">
                <div className="animate-typing">
                  {`class ${data.name.replace(/\s+/g, '')}App(ToolAdapter):\n  async def execute(self, args):\n    # Menyusun logika...\n    pass`}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-10">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
              <Check size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Aplikasi Siap!</h2>
            <p className="text-white/40 mb-8">Aplikasi {data.name} telah berhasil disusun dan siap untuk diterapkan.</p>
            <button 
              onClick={() => onComplete(data)}
              className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,255,204,0.3)]"
            >
              TERAPKAN KE KERNEL
            </button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>

        <div className="p-10 pt-12">
          {/* Progress Bar */}
          <div className="flex gap-2 mb-10">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${step >= i ? 'bg-primary' : 'bg-white/10'}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {step < 4 && (
            <div className="flex justify-between mt-10">
              <button 
                onClick={step === 1 ? onClose : prevStep}
                className="px-6 py-3 rounded-xl text-white/40 font-bold hover:text-white transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={18} /> {step === 1 ? 'Batal' : 'Kembali'}
              </button>
              <button 
                onClick={nextStep}
                disabled={step === 1 && !data.name}
                className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Lanjutkan <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppWizard;
