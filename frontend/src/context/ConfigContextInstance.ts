import { createContext } from 'react';
import type { MIAConfig } from '../types/config';

export interface ConfigContextType {
  config: MIAConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  updateConfig: (newConfig: MIAConfig) => void;
}

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined);
