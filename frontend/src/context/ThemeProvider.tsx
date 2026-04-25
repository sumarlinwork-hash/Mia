import React, { useState, useEffect } from 'react';
import { theme, type ThemeHue } from '../design/theme';
import { ThemeContext } from './ThemeContext';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hue, setHue] = useState<ThemeHue>('teal');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Fetch initial hue from config if possible, or use default
    fetch('http://localhost:8000/api/config')
      .then(res => res.json())
      .then(data => {
        if (data?.appearance?.theme_hue) {
          setHue(data.appearance.theme_hue as ThemeHue);
        }
      })
      .catch(() => console.log('Using default theme hue'));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const selectedTheme = theme.colors[hue];

    root.style.setProperty('--color-primary', selectedTheme.primary);
    root.style.setProperty('--color-primary-hover', selectedTheme.primaryHover);
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
