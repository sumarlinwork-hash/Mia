import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../hooks/useConfig';
import { useEmotion } from '../hooks/useEmotion';

const ResonantOrchestrator: React.FC = () => {
  const { config } = useConfig();
  const { emotion, refreshEmotion } = useEmotion();
  const location = useLocation();
  const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const heartbeatBufferRef = useRef<AudioBuffer | null>(null);
  const lastPulseRef = useRef(0);
  const [bpm, setBpm] = useState(60);
  const isEmotionView = location.pathname === '/emotion';
  const bpmRef = useRef(bpm);

  const ensureAudioContext = () => {
    if (audioContextRef.current) return audioContextRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  };

  useEffect(() => {
    bpmRef.current = bpm;
    if (sourceNodeRef.current) {
      // Use the 0.75x multiplier as preferred by the user for the "slow" deep sound
      sourceNodeRef.current.playbackRate.value = (bpm / 60) * 0.75;
    }
  }, [bpm]);

  // 1. Emotion/BPM Sync
  useEffect(() => {
    setBpm(60 + (emotion.arousal * 0.6));
  }, [emotion.arousal]);

  // 2. Authentic Heartbeat Audio Engine
  useEffect(() => {
    let cancelled = false;

    // Only play if on Emotion Dashboard
    if (!isEmotionView) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      return;
    }

    const initAudio = async () => {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      if (cancelled || !isEmotionView) return;

      // 1. Create Analyser for VU Meter
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      // 2. Create Gain Node for 50% Volume
      if (!gainNodeRef.current) {
        gainNodeRef.current = ctx.createGain();
        gainNodeRef.current.gain.value = 0.5; // Adjusted to 50%
      }

      // 3. Create Bass Booster (BiquadFilter)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200; // Focus on low frequencies
      bassFilter.gain.value = 12;      // Boost the bass

      const lowPass = ctx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 400;   // Muffle higher frequencies for "deep" sound

      // Connect nodes: Source -> BassFilter -> LowPass -> Gain -> Analyser -> Destination
      bassFilter.connect(lowPass);
      lowPass.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      // Load and Play Loop
      try {
        if (!heartbeatBufferRef.current) {
          const response = await fetch('/audio/heartbeat.mp3');
          const arrayBuffer = await response.arrayBuffer();
          heartbeatBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
        }

        if (cancelled || !isEmotionView) return;

        if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
        }

        const source = ctx.createBufferSource();
        source.buffer = heartbeatBufferRef.current;
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
      cancelled = true;
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    };
  }, [isEmotionView]);

  const animationFrameRef = useRef<number | null>(null);

  // Update Playback Rate when BPM changes is already handled by the first useEffect (lines 16-21)

  // Audio Level Broadcaster (VU Meter for organic animation)
  useEffect(() => {
    const updatePulse = () => {
      if (analyserRef.current && isEmotionView) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const now = performance.now();
        
        // Throttle UI broadcasts so My Heart does not rerender on every animation frame.
        if (now - lastPulseRef.current > 80) {
          lastPulseRef.current = now;
          const pulseEvent = new CustomEvent('heartbeatPulse', { detail: Math.min(1, average / 128) });
          window.dispatchEvent(pulseEvent);
        }
      }
      animationFrameRef.current = requestAnimationFrame(updatePulse);
    };

    if (isEmotionView) {
      updatePulse();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isEmotionView]);

  // 3. Resonant Skin (Touch/Ripple Effect)
  useEffect(() => {
    if (!config?.resonant_skin_enabled) return;

    const handleGlobalClick = async (e: MouseEvent) => {
      // 1. Resume AudioContext if suspended (Browser Policy)
      const ctx = ensureAudioContext();
      if (ctx?.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const id = Date.now();
      setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);

      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 1000);

      try {
        await fetch('/api/intimacy/touch', { method: 'POST' });
        refreshEmotion(); // Instant visual state refresh on click
      } catch {
        // Silent fail for touch sync
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [config?.resonant_skin_enabled, bpm, refreshEmotion]);

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
