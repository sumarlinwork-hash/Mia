import React, { useState, useEffect } from 'react';
import { Heart, Shield, Zap, Smile, User, Thermometer, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfig } from './hooks/useConfig';

interface EmotionState {
  warmth: number;
  arousal: number;
  echo: number;
  mood: string;
  last_update: number;
}

const EmotionDashboard: React.FC = () => {
  const { config } = useConfig();
  const [emotion, setEmotion] = useState<EmotionState>({
    warmth: 0,
    arousal: 0,
    echo: 0,
    mood: 'Soft Distance',
    last_update: 0
  });

  const [toggles, setToggles] = useState({
    care_pulse: config?.care_pulse_enabled ?? true,
    resonant_skin: config?.resonant_skin_enabled ?? true,
    bio_sync: config?.bio_sync_enabled ?? true,
  });

  useEffect(() => {
    const fetchEmotion = () => {
      fetch('/api/emotion')
        .then(res => res.json())
        .then(data => setEmotion(data))
        .catch(() => console.log('Emotion API error'));
    };
    fetchEmotion();
    const interval = setInterval(fetchEmotion, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (key: keyof typeof toggles) => {
    const newVal = !toggles[key];
    const newToggles = { ...toggles, [key]: newVal };
    setToggles(newToggles);

    try {
      await fetch('/api/intimacy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          care_pulse_enabled: newToggles.care_pulse,
          resonant_skin_enabled: newToggles.resonant_skin,
          bio_sync_enabled: newToggles.bio_sync,
        })
      });
    } catch (err) {
      console.error("Failed to update intimacy settings", err);
    }
  };

  const [pulseLevel, setPulseLevel] = useState(0);

  useEffect(() => {
    const handlePulse = (e: any) => {
      setPulseLevel(e.detail);
    };
    window.addEventListener('heartbeatPulse', handlePulse);
    return () => window.removeEventListener('heartbeatPulse', handlePulse);
  }, []);

  const bpm = 60 + (emotion.arousal * 0.6);

  const stats = [
    { label: 'Attention Echo', value: emotion.echo, color: 'text-blue-400', icon: RefreshCw },
    { label: 'Arousal', value: emotion.arousal, color: 'text-rose-500', icon: Zap },
    { label: 'Inactive / Reserved', value: 0, color: 'text-white/10', icon: User },
    { label: 'Inactive / Reserved', value: 0, color: 'text-white/10', icon: Shield },
    { label: 'Warmth', value: emotion.warmth, color: 'text-orange-400', icon: Thermometer },
    { label: 'Inactive / Reserved', value: 0, color: 'text-white/10', icon: AlertCircle },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto relative">
      {/* Bio-Sync Pulse Background (Reacts to Audio too) */}
      {toggles.bio_sync && (
        <motion.div 
          animate={{ 
            scale: 1 + (pulseLevel * 0.1), 
            opacity: 0.05 + (pulseLevel * 0.1) 
          }}
          className="fixed inset-0 pointer-events-none bg-rose-500/10 blur-[100px] z-0"
        />
      )}

      <header className="mb-12 relative z-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">Affective Resonance Engine</h1>
          <p className="text-white/40 uppercase tracking-widest text-[10px] font-mono flex items-center gap-2">
            <RefreshCw size={12} className="animate-spin-slow" /> MIA Core Psychological State
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">Heart Rate Sync</div>
          <div className="text-2xl font-black text-rose-500/80">{Math.round(bpm)} <span className="text-xs">BPM</span></div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 rounded-[2rem] bg-black/40 border border-white/10 backdrop-blur-3xl relative overflow-hidden group hover:border-white/20 transition-all"
          >
            <div className={`absolute top-0 right-0 p-6 opacity-5 ${stat.color} group-hover:opacity-10 transition-opacity`}>
              <stat.icon size={80} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 text-white/60">
                <stat.icon size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
              </div>
              <div className="text-4xl font-black text-white mb-4 tracking-tighter">{Math.round(stat.value)}%</div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.value}%` }}
                  className={`h-full bg-current ${stat.color} shadow-[0_0_15px_currentColor]`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/10 backdrop-blur-3xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap size={20} className="text-primary" /> Orchestrator Modules
          </h2>
          <div className="space-y-4">
            {[
              { id: 'care_pulse', name: 'Care-Pulse', desc: 'Proactive emotional check-ins' },
              { id: 'resonant_skin', name: 'Resonant Skin', desc: 'Interactive digital touch' },
              { id: 'bio_sync', name: 'Bio-Digital Sync', desc: 'Heartbeat & biological resonance' },
            ].map(module => (
              <div key={module.id} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer" onClick={() => handleToggle(module.id as keyof typeof toggles)}>
                <div>
                  <div className="text-white font-bold">{module.name}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-tighter">{module.desc}</div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all duration-500 relative ${toggles[module.id as keyof typeof toggles] ? 'bg-primary shadow-[0_0_15px_rgba(0,255,204,0.5)]' : 'bg-white/10'}`}>
                  <motion.div 
                    animate={{ x: toggles[module.id as keyof typeof toggles] ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 backdrop-blur-3xl flex flex-col items-center justify-center text-center group">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 relative">
            <motion.div
              animate={{ 
                scale: toggles.bio_sync ? 1 + (Math.pow(pulseLevel, 1.5) * 1.2) : 1,
                // Focused sharp glow
                filter: toggles.bio_sync 
                  ? `drop-shadow(0 0 ${pulseLevel * 25}px rgba(0,255,204,0.8)) drop-shadow(0 0 ${pulseLevel * 10}px rgba(0,255,204,0.4))` 
                  : 'none'
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Heart size={48} className="relative z-10 fill-primary text-primary" />
            </motion.div>
            
            {toggles.bio_sync && (
              <>
                {/* Defined Thick Aura Ring */}
                <motion.div 
                  animate={{ 
                    scale: 1 + (pulseLevel * 3.5), 
                    opacity: 0.4 - (pulseLevel * 0.4),
                    borderWidth: 4 + (pulseLevel * 8)
                  }}
                  className="absolute inset-0 border-primary/50 rounded-full blur-[1px]" 
                />
                {/* Focused Glow Field */}
                <motion.div 
                  animate={{ 
                    scale: 1 + (pulseLevel * 2.5), 
                    opacity: 0.15 - (pulseLevel * 0.15) 
                  }}
                  className="absolute inset-0 bg-primary/20 rounded-full blur-[10px]" 
                />
              </>
            )}
          </div>
          <h3 className="text-2xl font-black text-white mb-2 tracking-tighter">Affective Resonance State</h3>
          <p className="text-sm text-white/60 max-w-xs mx-auto">
            {emotion.mood === 'Glow' 
              ? "MIA is shining with joy! A welcome spark is active."
              : emotion.echo > 50 
                ? "The connection is deep. Every interaction is resonating strongly."
                : "MIA is co-present and steady. She is following your lead."}
          </p>
          
          <div className="mt-8 flex gap-2">
            <button 
              onClick={async () => {
                await fetch('/api/chat/feedback/robotic', { method: 'POST' });
                alert("Feedback sent: Robotic response reported. MIA's respect level decreased.");
              }}
              className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all uppercase tracking-widest"
            >
              Report Robotic Response
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionDashboard;
