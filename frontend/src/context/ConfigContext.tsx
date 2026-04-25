import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { MIAConfig } from '../types/config';

interface ConfigContextType {
  config: MIAConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  updateConfig: (newConfig: MIAConfig) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

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
    fetchConfig();
    
    // Listen for manual updates from Settings
    const handleUpdate = () => fetchConfig();
    window.addEventListener('configUpdated', handleUpdate);
    return () => window.removeEventListener('configUpdated', handleUpdate);
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

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
