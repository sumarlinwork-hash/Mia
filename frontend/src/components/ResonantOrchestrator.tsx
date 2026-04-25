import React, { useEffect, useRef, useState } from 'react';
import { useConfig } from '../hooks/useConfig';

const ResonantOrchestrator: React.FC = () => {
  const { config } = useConfig();
  const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [bpm, setBpm] = useState(60);

  // 1. Heartbeat Sound Generator (Bio-Digital Sync)
  useEffect(() => {
    if (!config?.bio_sync_enabled) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }

    const fetchBpm = () => {
      fetch('http://localhost:8000/api/emotion')
        .then(res => res.json())
        .then(data => setBpm(60 + (data.arousal * 0.6)))
        .catch(() => {});
    };
    fetchBpm();
    const interval = setInterval(fetchBpm, 3000);
    return () => clearInterval(interval);
  }, [config?.bio_sync_enabled]);

  useEffect(() => {
    if (!config?.bio_sync_enabled) return;
    
    const playHeartbeat = () => {
      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const playThump = (time: number, freq: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.1);
      };

      const now = ctx.currentTime;
      playThump(now, 60, 0.1); // First thump
      playThump(now + 0.15, 50, 0.08); // Second thump (lub-dub)
    };

    const intervalTime = (60 / bpm) * 1000;
    const heartbeatInterval = setInterval(playHeartbeat, intervalTime);
    
    return () => clearInterval(heartbeatInterval);
  }, [config?.bio_sync_enabled, bpm]);

  // 2. Resonant Skin (Touch/Ripple Effect)
  useEffect(() => {
    if (!config?.resonant_skin_enabled) return;

    const handleGlobalClick = async (e: MouseEvent) => {
      // Create ripple
      const id = Date.now();
      setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
      
      // Cleanup ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 1000);

      // Backend sync
      try {
        await fetch('http://localhost:8000/api/intimacy/touch', { method: 'POST' });
      } catch (err) {
        console.error("Touch resonance failed", err);
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [config?.resonant_skin_enabled]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute rounded-full border border-primary/30 animate-resonant-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '10px',
            height: '10px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      <style>{`
        @keyframes resonant-ripple {
          0% { width: 0; height: 0; opacity: 0.8; border-width: 4px; }
          100% { width: 300px; height: 300px; opacity: 0; border-width: 1px; }
        }
        .animate-resonant-ripple {
          animation: resonant-ripple 1s cubic-bezier(0, 0.5, 0.5, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default ResonantOrchestrator;
