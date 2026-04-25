import React, { useState, useEffect, useCallback } from 'react';
import type { MIAConfig } from '../types/config';
import { ConfigContext } from './ConfigContextInstance';

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<MIAConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/config');
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
    
    const load = async () => {
      await fetchConfig();
    };
    
    if (isMounted) {
      load();
    }
    
    // Listen for manual updates from Settings
    const handleUpdate = () => fetchConfig();
    window.addEventListener('configUpdated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('configUpdated', handleUpdate);
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
