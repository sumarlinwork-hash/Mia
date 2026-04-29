import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Shield, Key, CheckCircle } from 'lucide-react';
import type { App } from '../utils/viewModel';

interface SetupFlowProps {
  app: App;
  onClose: () => void;
  onComplete: () => void;
}

const SetupFlow: React.FC<SetupFlowProps> = ({ app, onClose, onComplete }) => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call to save configuration
      console.log(`Saving config for ${app.id}:`, config);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, we would call:
      // await fetch(`/api/apps/config/${app.id}`, { 
      //   method: 'POST', 
      //   body: JSON.stringify(config) 
      // });
      
      setSuccess(true);
      setTimeout(() => {
        onComplete(); // Mark READY and close
      }, 1000);
    } catch (err) {
      console.error("Failed to save config", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          <div className="p-8">
            <header className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Konfigurasi {app.name}</h2>
                <p className="text-white/40 text-sm">Lengkapi pengaturan berikut untuk mulai menggunakan aplikasi.</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-white/40 transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="space-y-6 mb-10">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-4">
                <Shield className="text-primary shrink-0" size={20} />
                <p className="text-xs text-white/60 leading-relaxed">
                  Data Anda disimpan secara lokal dan aman. MIA hanya menggunakan kunci API ini untuk menjalankan tugas yang Anda minta.
                </p>
              </div>

              {/* Mock Configuration Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <Key size={12} /> API Key
                  </label>
                  <input 
                    type="password" 
                    placeholder="Masukkan kunci API..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                    onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center gap-2 text-[10px] text-white/20 font-mono">
                  <CheckCircle size={10} /> IZIN: AKSES INTERNET
                </div>
              </div>
            </div>

            <footer className="flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || success}
                className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                  success ? 'bg-green-500 text-white' : 'bg-primary text-black hover:scale-[1.02]'
                }`}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                ) : success ? (
                  <><CheckCircle size={18} /> Berhasil</>
                ) : (
                  <><Save size={18} /> Simpan & Lanjutkan</>
                )}
              </button>
            </footer>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SetupFlow;
