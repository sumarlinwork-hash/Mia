import { useState, useEffect, useRef } from 'react';
import { WS_EVENT_BUS } from './useWebSocket';

export interface PerformanceMetrics {
  fps: number;
  latency: number;
  longTasks: number;
  beLatency: number;
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    latency: 0,
    longTasks: 0,
    beLatency: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const longTaskCount = useRef(0);

  useEffect(() => {
    // 1. FPS Tracker
    let rafId: number;
    const calculateFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        setMetrics(prev => ({ 
          ...prev, 
          fps: Math.round((frameCount.current * 1000) / delta) 
        }));
        frameCount.current = 0;
        lastTime.current = now;
      }
      rafId = requestAnimationFrame(calculateFPS);
    };
    rafId = requestAnimationFrame(calculateFPS);

    // 2. Long Task Observer (detect UI Blocking > 50ms)
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            longTaskCount.current++;
            setMetrics(prev => ({ ...prev, longTasks: longTaskCount.current }));
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      console.warn("[Performance] Longtask observer not supported");
    }

    // 3. WS Latency Listener
    const handleLatency = (e: Event) => {
      const rtt = (e as CustomEvent).detail.rtt;
      setMetrics(prev => ({ ...prev, latency: Math.round(rtt) }));
    };

    WS_EVENT_BUS.addEventListener('ws:latency', handleLatency);

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      WS_EVENT_BUS.removeEventListener('ws:latency', handleLatency);
    };
  }, []);

  useEffect(() => {
    // STAGE 5: Adaptive Runtime - Safe Mode Auto-Trigger
    // If FPS < 24 for 5 consecutive seconds, enable safe-mode
    if (metrics.fps > 0 && metrics.fps < 24) {
      const timer = setTimeout(() => {
        document.body.classList.add('safe-mode');
        console.warn("[MIA] Performance critical. Safe Mode activated.");
      }, 5000);
      return () => clearTimeout(timer);
    } else if (metrics.fps >= 30) {
      // Auto-recover if performance is stable (Optional, but good for user)
      // document.body.classList.remove('safe-mode');
    }
  }, [metrics.fps]);

  return metrics;
}
