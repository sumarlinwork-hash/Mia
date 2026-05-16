import React, { useState, useEffect } from 'react';
import { usePerformance } from '../hooks/usePerformance';
import { Zap, Wifi, AlertTriangle } from 'lucide-react';

export const PerformanceOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const metrics = usePerformance();

  // Shortcut Listener (Alt + P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        setIsVisible(prev => {
          const next = !prev;
          if (next) {
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [safeModeActive, setSafeModeActive] = useState(false);

  useEffect(() => {
    const checkSafeMode = () => {
      setSafeModeActive(document.body.classList.contains('safe-mode'));
    };
    const interval = setInterval(checkSafeMode, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSafeMode = () => {
    if (document.body.classList.contains('safe-mode')) {
      document.body.classList.remove('safe-mode');
    } else {
      document.body.classList.add('safe-mode');
    }
  };

  if (!isVisible && !showNotification) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col items-end gap-3">
      {/* Status Notification */}
      {showNotification && (
        <div className="bg-primary/20 backdrop-blur-md border border-primary/50 text-primary px-4 py-2 rounded-xl text-xs font-bold animate-in slide-in-from-right-4 duration-300">
          Performance Monitor Active (Alt+P to hide)
        </div>
      )}

      {/* Main Stats Panel */}
      {isVisible && (
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 min-w-[200px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-widest">
              <Zap size={12} className="text-primary" />
              FPS
            </div>
            <span className={`text-sm font-mono font-bold ${metrics.fps < 30 ? 'text-red-400' : 'text-primary'}`}>
              {metrics.fps}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-widest">
              <Wifi size={12} className="text-blue-400" />
              WS Latency
            </div>
            <span className={`text-sm font-mono font-bold ${metrics.latency > 100 ? 'text-orange-400' : 'text-blue-400'}`}>
              {metrics.latency}ms
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-widest">
              <AlertTriangle size={12} className="text-yellow-400" />
              UI Blocking
            </div>
            <span className={`text-sm font-mono font-bold ${metrics.longTasks > 0 ? 'text-yellow-400' : 'text-white/40'}`}>
              {metrics.longTasks}
            </span>
          </div>

          <div className="mt-1 pt-3 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Safe Mode</div>
              <div className="text-[8px] text-white/20">Auto-Adaptive</div>
            </div>
            <button 
              onClick={toggleSafeMode}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                safeModeActive 
                ? 'bg-primary text-black shadow-[0_0_10px_var(--color-primary)]' 
                : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              {safeModeActive ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          <div className="mt-1 text-[8px] text-white/10 uppercase text-center font-bold tracking-tighter">
            Hardware: Ivy Bridge Optimized
          </div>
        </div>
      )}
    </div>
  );
};
