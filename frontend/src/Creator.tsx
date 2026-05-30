import { useState } from 'react';
import { ArrowRight, Boxes, Clapperboard, Download, Film, ImageIcon, Play, Sparkles, Wand2 } from 'lucide-react';
import { useConfig } from './hooks/useConfig';
import { normalizeThemeHue } from './design/theme';
import { useTheme } from './hooks/useTheme';

const assetCards = [
  { name: 'Hero frame', kind: 'Image', state: 'Draft' },
  { name: 'Voice bed', kind: 'Audio', state: 'Queued' },
  { name: 'Motion pass', kind: 'Video', state: 'Idle' },
];

const activity = [
  'Brief synced with Creator kernel',
  'Asset bin initialized',
  'Timeline placeholder ready',
];

export default function Creator() {
  const { config } = useConfig();
  const { hue } = useTheme();
  const [brief, setBrief] = useState('A cinematic neon sunrise over a futuristic cityscape');
  const uiOpacity = config?.appearance?.ui_opacity ?? 0.65;
  const currentHue = normalizeThemeHue(config?.appearance?.theme_hue ?? hue);
  const surfaceStyle = { backgroundColor: `rgba(0, 0, 0, ${1 - uiOpacity})` };

  return (
    <div className="min-h-screen p-8 pb-20 text-white relative z-10" style={{ paddingLeft: '5rem' }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-lg border border-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-3xl lg:flex-row lg:items-center lg:justify-between" style={surfaceStyle}>
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
              <Sparkles size={14} />
              Creator Kernel
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Creator Cockpit</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
              Shape media briefs, collect generated assets, arrange timeline beats, preview drafts, and prepare exports from one kernel surface.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-white/60">
            <div className="mb-2 font-semibold text-white">Global theme</div>
            <div className="space-y-1 font-mono">
              <div>Hue: {currentHue}</div>
              <div>Opacity: {Math.round(uiOpacity * 100)}%</div>
              <div>Background: {config?.appearance?.background_type || 'theme'}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="rounded-lg border border-white/10 p-5 backdrop-blur-3xl" style={surfaceStyle}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wand2 size={16} className="text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-[0.18em]">Brief Composer</h2>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                  <ArrowRight size={13} />
                  Submit
                </button>
              </div>
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-white outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 p-5 backdrop-blur-3xl" style={surfaceStyle}>
                <div className="mb-4 flex items-center gap-2">
                  <Boxes size={16} className="text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-[0.18em]">Asset Bin</h2>
                </div>
                <div className="space-y-3">
                  {assetCards.map((asset) => (
                    <div key={asset.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                          <ImageIcon size={15} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{asset.name}</div>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">{asset.kind}</div>
                        </div>
                      </div>
                      <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/50">{asset.state}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 p-5 backdrop-blur-3xl" style={surfaceStyle}>
                <div className="mb-4 flex items-center gap-2">
                  <Clapperboard size={16} className="text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-[0.18em]">Timeline</h2>
                </div>
                <div className="space-y-4">
                  {['Scene', 'Voice', 'Music'].map((track, index) => (
                    <div key={track}>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{track}</div>
                      <div className="h-9 rounded-md border border-white/10 bg-black/25 p-1">
                        <div className="h-full rounded bg-primary/30" style={{ width: `${72 - index * 16}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-white/10 p-5 backdrop-blur-3xl" style={surfaceStyle}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film size={16} className="text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-[0.18em]">Preview</h2>
                </div>
                <button className="inline-flex h-8 items-center gap-2 rounded-md bg-white/10 px-3 text-[10px] font-bold text-white">
                  <Play size={12} fill="currentColor" />
                  Play
                </button>
              </div>
              <div className="aspect-video rounded-lg border border-white/10 bg-[linear-gradient(135deg,var(--color-primary)_0%,rgba(15,23,42,0.92)_100%)] p-4">
                <div className="flex h-full items-center justify-center rounded-md bg-black/25 text-center font-mono text-xs text-white/75">
                  Draft preview player
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 p-5 backdrop-blur-3xl" style={surfaceStyle}>
              <div className="mb-4 flex items-center gap-2">
                <Download size={16} className="text-primary" />
                <h2 className="text-sm font-black uppercase tracking-[0.18em]">Render Export</h2>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-white/60">MP4 draft</span>
                  <span className="text-primary">Idle</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-full w-[12%] rounded-full bg-primary" />
                </div>
              </div>
              <button className="mt-4 w-full rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                Queue Export
              </button>
            </div>

            <div className="rounded-lg border border-white/10 p-5 backdrop-blur-3xl" style={surfaceStyle}>
              <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em]">Activity</h2>
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
