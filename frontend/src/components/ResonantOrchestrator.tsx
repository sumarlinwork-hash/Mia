import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../hooks/useConfig';

const ResonantOrchestrator: React.FC = () => {
  const { config } = useConfig();
  const location = useLocation();
  const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [bpm, setBpm] = useState(60);
  const isEmotionView = location.pathname === '/emotion';
  const bpmRef = useRef(bpm);

  useEffect(() => {
    bpmRef.current = bpm;
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = bpm / 60;
    }
  }, [bpm]);

  // 1. Emotion/BPM Sync
  useEffect(() => {
    const fetchBpm = () => {
      fetch('/api/emotion')
        .then(res => res.json())
        .then(data => setBpm(60 + (data.arousal * 0.6)))
        .catch(() => {});
    };
    fetchBpm();
    const interval = setInterval(fetchBpm, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Authentic Heartbeat Audio Engine
  useEffect(() => {
    // Only play if on Emotion Dashboard
    if (!isEmotionView) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      return;
    }

    const initAudio = async () => {
      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      // 1. Create Gain Node for 100% Volume
      if (!gainNodeRef.current) {
        gainNodeRef.current = ctx.createGain();
        gainNodeRef.current.gain.value = 1.0; // Adjusted to 100%
      }

      // 2. Create Bass Booster (BiquadFilter)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200; // Focus on low frequencies
      bassFilter.gain.value = 12;      // Boost the bass

      const lowPass = ctx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 400;   // Muffle higher frequencies for "deep" sound

      // Connect nodes: Source -> BassFilter -> LowPass -> Gain -> Destination
      bassFilter.connect(lowPass);
      lowPass.connect(gainNodeRef.current);
      gainNodeRef.current.connect(ctx.destination);

      // Load and Play Loop
      try {
        const response = await fetch('/audio/heartbeat.mp3');
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        
        source.playbackRate.value = (bpmRef.current / 60) * 0.75;
        
        source.connect(bassFilter); // Connect to the start of the chain
        source.start(0);
        sourceNodeRef.current = source;
      } catch (err) {
        console.error("Failed to load heartbeat audio:", err);
      }
    };

    initAudio();

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    };
  }, [isEmotionView]);

  // Update Playback Rate when BPM changes
  useEffect(() => {
    bpmRef.current = bpm;
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = (bpm / 60) * 0.75;
    }
  }, [bpm]);

  // 3. Resonant Skin (Touch/Ripple Effect)
  useEffect(() => {
    if (!config?.resonant_skin_enabled) return;

    const handleGlobalClick = async (e: MouseEvent) => {
      const id = Date.now();
      setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 1000);

      try {
        await fetch('/api/intimacy/touch', { method: 'POST' });
      } catch {
        // Silent fail for touch sync
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [config?.resonant_skin_enabled, bpm]);

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
