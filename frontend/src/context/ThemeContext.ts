import { createContext } from 'react';
import type { ThemeHue } from '../design/theme';

export interface ThemeContextType {
  hue: ThemeHue;
  setHue: (hue: ThemeHue) => void;
  isDark: boolean;
  toggleDark: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
