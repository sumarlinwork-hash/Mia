import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Sparkles, AlertCircle, Plus, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PreviewModalProps {
  app: {
    id: string;
    name: string;
    category?: string;
  };
  onClose: () => void;
  onInstall: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ app, onClose, onInstall }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/apps/${app.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_input: userMsg,
          session_id: 'user_session_123' // Mock session ID
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        setUsage(data.session_usage);
        setIsFallback(data.is_fallback);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Maaf, terjadi kesalahan: ${data.error}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Maaf, koneksi ke preview engine terputus." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{app.name} <span className="text-[10px] text-white/20 ml-2 font-mono uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md">Preview Sandbox</span></h3>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{app.category || 'Aplikasi'}</span>
                {usage && (
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold">
                    <History size={10} /> Sisa percobaan global: {usage}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-black/20">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <BotIcon className="mb-4 text-white/20" />
              <p className="text-sm max-w-xs">Uji kemampuan <strong>{app.name}</strong> di sini. Masukkan kueri untuk melihat cara kerjanya.</p>
            </div>
          )}
          
          {messages.map((m, i) => (
            <motion.div 
              key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                m.role === 'user' 
                ? 'bg-white/10 text-white rounded-tr-none' 
                : 'bg-primary/5 border border-primary/10 text-white/90 rounded-tl-none'
              }`}>
                <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                  {m.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl rounded-tl-none flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              </div>
            </div>
          )}

          {isFallback && (
            <div className="flex justify-center pt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold">
                <AlertCircle size={12} /> Mode hemat aktif (preview menggunakan template)
              </div>
            </div>
          )}
        </div>

        {/* Footer / Input */}
        <div className="p-6 bg-white/2 border-t border-white/5 space-y-4">
          <div className="relative">
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ketik kueri uji coba..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-6 pr-14 py-4 text-white text-sm outline-none focus:border-primary transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/20 italic">
              * Preview terbatas pada fungsionalitas inti saja.
            </p>
            <button 
              onClick={onInstall}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={14} /> Tambahkan Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

export default PreviewModal;
