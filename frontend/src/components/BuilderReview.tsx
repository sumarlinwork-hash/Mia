import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Edit2, Shield, Info, Terminal } from 'lucide-react';

interface AppManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  required_permissions: string[];
  execution_mode: string;
}

interface BuilderReviewProps {
  data: {
    manifest: AppManifest;
    logic: string;
  };
  onClose: () => void;
  onDeploy: (finalManifest: AppManifest) => void;
}

const BuilderReview: React.FC<BuilderReviewProps> = ({ data, onClose, onDeploy }) => {
  const [manifest, setManifest] = useState(data.manifest);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Quality Gate</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Tinjau rancangan AI sebelum deployment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            {/* Manifest Info */}
            <div className="space-y-6">
              <section>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Nama & Deskripsi</label>
                  <button onClick={() => setIsEditing(!isEditing)} className="text-primary/60 hover:text-primary transition-colors">
                    <Edit2 size={14} />
                  </button>
                </div>
                {isEditing ? (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={manifest.name} 
                      onChange={e => setManifest({...manifest, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                    />
                    <textarea 
                      value={manifest.description} 
                      onChange={e => setManifest({...manifest, description: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs h-20"
                    />
                  </div>
                ) : (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <h4 className="text-white font-bold mb-1">{manifest.name}</h4>
                    <p className="text-xs text-white/40 leading-relaxed">{manifest.description}</p>
                  </div>
                )}
              </section>

              <section>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Kategori & Mode</label>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60 font-bold">{manifest.category}</span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold">{manifest.execution_mode}</span>
                </div>
              </section>

              <section>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Izin yang Dibutuhkan</label>
                <div className="flex flex-wrap gap-2">
                  {manifest.required_permissions.map(p => (
                    <div key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                      <Shield size={10} /> {p}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Mock Logic Preview */}
            <div className="space-y-6">
              <section className="h-full flex flex-col">
                <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Sintesis Perilaku (Mock)</label>
                <div className="flex-1 bg-black/60 rounded-2xl p-4 border border-white/10 font-mono text-[10px] text-primary/60 overflow-hidden relative">
                  <Terminal size={16} className="absolute top-4 right-4 opacity-20" />
                  <pre className="whitespace-pre-wrap">{data.logic}</pre>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-10 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
            <Info className="text-primary mt-1 flex-shrink-0" size={18} />
            <p className="text-[11px] text-primary/80 leading-relaxed">
              <strong>Verifikasi Integritas:</strong> Manifest valid. Aplikasi siap dideploy ke kernel. Harap periksa izin akses di atas untuk memastikan keamanan data Anda.
            </p>
          </div>
        </div>

        <div className="p-8 bg-white/2 border-t border-white/5 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
          >
            Batal
          </button>
          <button 
            onClick={() => onDeploy(manifest)}
            className="flex-[2] py-4 rounded-2xl bg-primary text-black font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,204,0.3)]"
          >
            <Check size={20} /> Terapkan ke Kernel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuilderReview;
