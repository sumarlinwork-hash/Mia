import React, { useState, useEffect, useCallback } from 'react';
import { Search, Zap, Plus, Book, Music, MessageCircle, CheckCircle, Star } from 'lucide-react';
import SkillWizard from './components/SkillWizard';
import SkillExecutor from './components/SkillExecutor';
import { motion } from 'framer-motion';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category?: string;
  created_at?: string;
  is_installed?: boolean;
  input_schema?: Record<string, string>;
}

const SkillMarketplace: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [executingSkill, setExecutingSkill] = useState<Skill | null>(null);
  const [toasts, setToasts] = useState<{id: number, msg: string, type: string}[]>([]);

  const addToast = (msg: string, type: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const fetchSkills = useCallback(() => {
    fetch('http://localhost:8000/api/skills/marketplace')
      .then(res => res.json())
      .then(data => {
        setSkills(data);
        setLoading(false);
      })
      .catch(() => {
        console.log('Skills API fallback');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleInstall = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/skills/install/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchSkills(); // Refresh status
      }
    } catch (err) {
      console.error("Installation failed", err);
    }
  };

  const handleRun = (skill: Skill) => {
    // If skill has schema, show executor. Else run direct.
    if (skill.input_schema && Object.keys(skill.input_schema).length > 0) {
      setExecutingSkill(skill);
    } else {
      addToast(`Running ${skill.name}...`, "info");
      fetch(`http://localhost:8000/api/skill/execute?skill_id=${skill.id}`, { method: 'POST' });
    }
  };

  const categories = [
    { name: 'All', icon: Zap },
    { name: 'Creativity', icon: Book },
    { name: 'Media', icon: Music },
    { name: 'Interaction', icon: MessageCircle },
  ];

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Discovery Marketplace</h1>
          <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold font-mono">Expand MIA's Cognitive Horizons</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search abilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-white outline-none focus:border-primary w-full md:w-80 transition-all backdrop-blur-3xl"
          />
        </div>
      </header>

      <div className="flex gap-4 mb-12 overflow-x-auto pb-4 custom-scrollbar">
        {categories.map(cat => (
          <button 
            key={cat.name}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
          >
            <cat.icon size={16} />
            <span className="font-bold text-xs uppercase tracking-wider">{cat.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Architect a Skill Card (The Strongest Feature) */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowWizard(true)}
          className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/30 to-secondary/10 border border-primary/30 shadow-2xl flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center mb-6 shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform">
            <Plus size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Architect a Skill</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Describe a new ability in chat, and MIA will synthesize the logic herself.
          </p>
        </motion.div>

        {!loading ? filteredSkills.map((skill, i) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 hover:border-primary/40 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <Star className="text-white/10 group-hover:text-yellow-400 transition-colors" size={20} />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-4 rounded-2xl bg-white/5 ${skill.is_installed ? 'text-green-400' : 'text-primary'}`}>
                {skill.is_installed ? <CheckCircle size={24} /> : <Zap size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{skill.name}</h3>
                <span className="text-[10px] font-mono text-white/20 uppercase">v1.0.4 • {skill.category || 'Plugin'}</span>
              </div>
            </div>
            
            <p className="text-sm text-white/40 mb-8 line-clamp-3 h-12">
              {skill.description}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(n => (
                  <div key={n} className="w-6 h-6 rounded-full border-2 border-black bg-surface-variant overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${skill.id}${n}`} alt="user" />
                  </div>
                ))}
                <div className="text-[10px] text-white/20 ml-2 mt-1.5">+24 users</div>
              </div>
              
              {skill.is_installed ? (
                <button 
                  onClick={() => handleRun(skill)}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-black font-bold hover:scale-105 transition-transform"
                >
                  <Zap size={16} fill="currentColor" /> Run
                </button>
              ) : (
                <button 
                  onClick={() => handleInstall(skill.id)}
                  className="px-6 py-2 rounded-full bg-primary text-black font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                  Install
                </button>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center">
            <div className="text-white/20 font-mono mb-4 italic tracking-widest">SYNCHRONIZING WITH CENTRAL NEXUS...</div>
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          </div>
        )}
      </div>

      {executingSkill && (
        <SkillExecutor 
          skill={executingSkill}
          onClose={() => setExecutingSkill(null)}
          onExecute={(inputs) => {
            addToast(`Executing ${executingSkill.name}...`, "info");
            fetch(`http://localhost:8000/api/skill/execute?skill_id=${executingSkill.id}`, { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inputs)
            });
            setExecutingSkill(null);
          }}
        />
      )}

      {showWizard && (
        <SkillWizard 
          onClose={() => setShowWizard(false)}
          onComplete={(data) => {
            console.log("Skill built:", data);
            setShowWizard(false);
            addToast("Skill sent to Kernel!", "success");
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
