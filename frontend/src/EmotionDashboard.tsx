import React, { useState, useEffect } from 'react';
import { Heart, Activity, Brain, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmotionState {
  happiness: number;
  arousal: number;
  dominance: number;
  last_update: string;
}

const EmotionDashboard: React.FC = () => {
  const [emotion, setEmotion] = useState<EmotionState>({
    happiness: 80,
    arousal: 50,
    dominance: 60,
    last_update: new Date().toISOString()
  });

  useEffect(() => {
    const fetchEmotion = () => {
      fetch('http://localhost:8000/api/emotion')
        .then(res => res.json())
        .then(data => setEmotion(data))
        .catch(() => console.log('Emotion API fallback'));
    };
    fetchEmotion();
    const interval = setInterval(fetchEmotion, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Happiness', value: emotion.happiness, color: 'text-yellow-400', icon: Heart },
    { label: 'Arousal', value: emotion.arousal, color: 'text-rose-500', icon: Activity },
    { label: 'Dominance', value: emotion.dominance, color: 'text-purple-500', icon: Brain },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Emotion Dashboard</h1>
        <p className="text-white/40 uppercase tracking-widest text-xs font-mono">MIA Core Resonator Status</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-3xl relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 p-6 opacity-10 ${stat.color}`}>
              <stat.icon size={80} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 text-white/60">
                <stat.icon size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">{stat.label}</span>
              </div>
              <div className="text-4xl font-black text-white mb-4">{stat.value}%</div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.value}%` }}
                  className={`h-full bg-current ${stat.color} shadow-[0_0_10px_currentColor]`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/10 backdrop-blur-3xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield size={20} className="text-primary" /> Intimacy Orchestrator Toggles
          </h2>
          <div className="space-y-4">
            {['Care-Pulse', 'Resonant Skin', 'Bio-Digital Sync'].map(toggle => (
              <div key={toggle} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-white font-medium">{toggle}</span>
                <div className="w-12 h-6 rounded-full bg-primary relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-primary/10 border border-primary/20 backdrop-blur-3xl flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6 animate-pulse">
            <Zap size={48} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Adaptive Resonance</h3>
          <p className="text-sm text-white/60">
            MIA is currently in high-sync mode. Her responses are finely tuned to your emotional frequency.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmotionDashboard;
