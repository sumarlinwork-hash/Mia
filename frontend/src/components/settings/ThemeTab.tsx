import React from 'react';
import { Zap } from 'lucide-react';
import { theme, type ThemeHue } from '../../design/theme';
import { useTheme } from '../../hooks/useTheme';
import type { MIAConfig } from '../../types/config';

interface ThemeTabProps {
  config: MIAConfig;
  updateConfig: (newConfig: MIAConfig) => void;
}

const ThemeTab: React.FC<ThemeTabProps> = ({ config, updateConfig }) => {
  const { hue, setHue } = useTheme();

  const handleHueChange = (newHue: ThemeHue) => {
    setHue(newHue);
    updateConfig({
      ...config,
      appearance: {
        ...config.appearance,
        theme_hue: newHue
      }
    });
  };

  return (
    <div className="max-w-3xl bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 animate-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20 text-primary">
          <Zap size={20} />
        </div>
        UI Theme Settings
      </h2>
      
      <div className="grid grid-cols-1 gap-6">
        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest">
          Primary Color Hue
        </label>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(theme.colors) as ThemeHue[]).map((colorHue) => {
            const isSelected = hue === colorHue;
            const colorData = theme.colors[colorHue];
            
            return (
              <button
                key={colorHue}
                onClick={() => handleHueChange(colorHue)}
                className={`
                  group relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all
                  ${isSelected 
                    ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(0,255,204,0.2)]' 
                    : 'bg-white/5 border-white/10 hover:border-white/30'}
                `}
              >
                <div 
                  className="w-8 h-8 rounded-full shadow-lg transition-transform group-hover:scale-110" 
                  style={{ backgroundColor: colorData.primary }}
                />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-white/40'}`}>
                  {colorHue}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-2">Theme Preview</h3>
        <p className="text-xs text-white/40 mb-4">
          Changes are applied instantly to the interface. Save to persist across sessions.
        </p>
        <div className="flex gap-2">
          <div className="px-4 py-2 rounded-lg bg-primary text-black font-bold text-xs">Primary Button</div>
          <div className="px-4 py-2 rounded-lg border border-primary text-primary font-bold text-xs">Outline Button</div>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary">
            <Zap size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeTab;
