import React, { useState, useEffect, useCallback } from 'react';
import type { MIAConfig } from '../types/config';
import { ConfigContext } from './ConfigContextInstance';

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<MIAConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const load = async () => {
      await fetchConfig();
    };
    
    if (isMounted) {
      load();
    }
    
    // Global Real-time Sync
    const connectWS = () => {
      if (!isMounted) return;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/heartbeat`;
      
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'config_update') {
            console.log("[Global Config] Update received, refreshing...");
            fetchConfig();
            // Dispatch for other non-context listeners (like App.tsx background)
            window.dispatchEvent(new Event('configUpdated'));
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWS, 5000);
        }
      };
    };

    connectWS();
    
    // Listen for manual updates from Settings
    const handleUpdate = () => fetchConfig();
    window.addEventListener('configUpdated', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('configUpdated', handleUpdate);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [fetchConfig]);

  const updateConfig = (newConfig: MIAConfig) => {
    setConfig(newConfig);
  };

  return (
    <ConfigContext.Provider value={{ config, loading, error, refreshConfig: fetchConfig, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};
