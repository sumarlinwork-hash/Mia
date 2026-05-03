import React, { useState, useEffect, useCallback } from 'react';
import type { MIAConfig } from '../types/config';
import { ConfigContext } from './ConfigContextInstance';
import { useWebSocketMessage, type WSMessage } from '../hooks/useWebSocket';

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
    fetchConfig();
  }, [fetchConfig]);

  // Listen for config_update from global WebSocket
  useWebSocketMessage(useCallback((data: WSMessage) => {
    if (data.type === 'config_update') {
      console.log("[Global Config] Update received, refreshing...");
      fetchConfig();
    }
  }, [fetchConfig]));

  const updateConfig = (newConfig: MIAConfig) => {
    setConfig(newConfig);
  };

  return (
    <ConfigContext.Provider value={{ config, loading, error, refreshConfig: fetchConfig, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};
