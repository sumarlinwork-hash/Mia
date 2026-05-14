import React, { useState, useEffect } from 'react';
import { normalizeThemeHue, theme, type ThemeHue } from '../design/theme';
import { ThemeContext } from './ThemeContext';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hue, setHue] = useState<ThemeHue>('teal');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Fetch initial hue from config if possible, or use default
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setHue(normalizeThemeHue(data?.appearance?.theme_hue));
      })
      .catch(() => console.log('Using default theme hue'));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const selectedTheme = theme.colors[normalizeThemeHue(hue)];

    root.style.setProperty('--color-primary', selectedTheme.primary);
    root.style.setProperty('--color-primary-hover', selectedTheme.primaryHover);
    root.style.setProperty('--color-primary-soft', selectedTheme.primarySoft);
    root.style.setProperty('--color-primary-surface', selectedTheme.primarySurface);
    root.style.setProperty('--neon-glow-color', selectedTheme.glow);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [hue, isDark]);

  const toggleDark = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ hue, setHue, isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
