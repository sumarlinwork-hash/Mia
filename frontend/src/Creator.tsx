import { useState } from 'react';
import { useConfig } from './hooks/useConfig';
import { normalizeThemeHue } from './design/theme';
import { useTheme } from './hooks/useTheme';
import { Sparkles, ImageIcon, SlidersHorizontal, ArrowRight, Play } from 'lucide-react';

export default function Creator() {
  const { config } = useConfig();
  const { hue } = useTheme();

  const [prompt, setPrompt] = useState('A cinematic neon sunrise over a futuristic cityscape');
  const uiOpacity = config?.appearance?.ui_opacity ?? 0.65;
  const currentHue = normalizeThemeHue(config?.appearance?.theme_hue ?? hue);

  return (
    <div className="min-h-screen p-8 text-white relative z-10" style={{ paddingLeft: '5rem' }}>
      <div className="max-w-7xl mx-auto space-y-10">
        <section 
          className="rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/20 backdrop-blur-3xl p-8 transition-colors duration-300"
          style={{ backgroundColor: `rgba(0, 0, 0, ${1 - uiOpacity})` }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2 text-primary text-[11px] uppercase tracking-[0.35em] font-bold">
                <Sparkles size={16} /> CREATOR KERNEL
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight">DALL Visual Prompt Studio</h1>
              <p className="mt-4 text-white/60 max-w-2xl leading-relaxed">
                A Creator preview card that follows the global appearance theme from Companion settings. Local Creator components do not expose separate theme controls.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="mb-3 font-semibold text-white">Global UI theme</div>
              <div className="space-y-2 text-xs">
                <div>Theme hue: {currentHue}</div>
                <div>UI opacity: {Math.round(uiOpacity * 100)}%</div>
                <div>Background type: {config?.appearance?.background_type}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-6">
            <div 
              className="rounded-[2rem] border border-white/10 p-8 shadow-2xl shadow-black/20 backdrop-blur-3xl transition-colors duration-300"
              style={{ backgroundColor: `rgba(0, 0, 0, ${1 - uiOpacity})` }}
            >
              <div className="flex items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold">DALL Card Preview</h2>
                  <p className="text-sm text-white/50 mt-2">Styled with the same opacity and palette rules used in LLM Warehouse.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-black text-xs font-bold uppercase tracking-[0.24em] transition-all hover:scale-[1.01] hover:shadow-[0_0_20px_var(--color-primary-soft)]">
                  <Play size={16} /> Generate
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="rounded-[2rem] border overflow-hidden shadow-lg transition-all duration-300"
                    style={{
                      background: 'var(--color-primary-surface)',
                      borderColor: 'var(--color-primary-soft)',
                      boxShadow: '0 0 30px var(--color-primary-soft)'
                    }}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(15, 23, 42, 0.92) 100%)', opacity: 0.85 }} />
                      <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white/85 font-mono text-sm tracking-wide">
                        DALL Preview {index}
                      </div>
  
                    </div>
                    <div className="p-4 bg-black/15 backdrop-blur-sm" style={{ backgroundColor: `rgba(15, 23, 42, ${Math.max(0.12, 0.2 - (1 - uiOpacity) * 0.1)})` }}>
                      <div className="text-xs uppercase tracking-[0.3em] text-white/50">Prompt</div>
                      <p className="mt-3 text-sm text-white/80 leading-relaxed line-clamp-3">{prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>

          <aside className="space-y-6">
            <div 
              className="rounded-[2rem] border border-white/10 p-8 shadow-2xl shadow-black/20 backdrop-blur-3xl transition-colors duration-300"
              style={{ backgroundColor: `rgba(0, 0, 0, ${1 - uiOpacity})` }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ImageIcon size={20} /></div>
                <div>
                  <h3 className="text-lg font-semibold">Prompt Panel</h3>
                  <p className="text-xs text-white/50">Use this area to shape the image concept before generation.</p>
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={6}
                className="w-full rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                style={{ backgroundColor: `rgba(15, 23, 42, ${Math.max(0.3, uiOpacity)})` }}
              />

              <div className="mt-5 flex items-center gap-3">
                <button className="inline-flex items-center gap-2 rounded-3xl bg-primary px-5 py-3 text-black font-bold uppercase tracking-[0.24em] transition-all hover:shadow-[0_0_30px_var(--color-primary-soft)]">
                  <ArrowRight size={16} /> Submit Prompt
                </button>
                <span className="text-xs text-white/40">Image generation will connect to the Creator kernel tooling when available.</span>
              </div>
            </div>

            <div 
              className="rounded-[2rem] border p-6 text-sm text-white/70 transition-colors duration-300"
              style={{ 
                backgroundColor: `rgba(0, 0, 0, ${1 - uiOpacity * 0.5})`,
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex items-center gap-3 mb-4 font-bold">
                <div className="rounded-2xl bg-white/5 p-3 text-white"><SlidersHorizontal size={18} /></div>
                <div>
                  <h4 className="font-semibold">Theme Guidance</h4>
                  <p className="text-xs text-white/50">Creator card UI follows the same opacity, background, and palette rules used throughout LLM Warehouse.</p>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />UI opacity is derived from global appearance settings.</li>
                <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />Creator preview follows the Companion appearance theme and does not expose separate theme controls.</li>
                <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />DALL cards keep a subtle glass surface with border and glow styling.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
