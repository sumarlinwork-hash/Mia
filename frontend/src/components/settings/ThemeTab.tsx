import React from 'react';
import { Zap } from 'lucide-react';
import { theme, type ThemeHue } from '../../design/theme';
import { useTheme } from '../../hooks/useTheme';
import type { MIAConfig } from '../../types/config';

interface ThemeTabProps {
  config: MIAConfig;
  updateConfigLocal: (newConfig: MIAConfig) => void;
}

const ThemeTab: React.FC<ThemeTabProps> = ({ config, updateConfigLocal }) => {
  const { hue, setHue } = useTheme();

  const handleHueChange = (newHue: ThemeHue) => {
    setHue(newHue);
    updateConfigLocal({
      ...config,
      appearance: {
        ...config.appearance,
        theme_hue: newHue
      }
    });
  };

  return (
    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
          <Zap size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white font-mono tracking-wide">UI THEME SETTINGS</h2>
          <p className="text-xs text-white/40 font-sans">Pilih tema warna global aplikasi</p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono mb-4 block">
            Primary Color Hue
          </label>
          <div className="flex flex-wrap gap-3">
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
                      ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,255,204,0.2)]' 
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'}
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

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <h3 className="text-sm font-bold text-white mb-2 font-mono">Theme Preview</h3>
          <p className="text-xs text-white/40 mb-4 font-sans">
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
    </div>
  );
};

export default ThemeTab;
