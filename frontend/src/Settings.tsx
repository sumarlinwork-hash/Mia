import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Heart, Cpu, Code, ShoppingBag, ShieldAlert, ChevronLeft, Database, Zap 
} from 'lucide-react';
import { useConfig } from './hooks/useConfig';
import type { MIAConfig } from './types/config';
import CompanionKernelSettings from './components/settings/CompanionKernelSettings';
import StudioKernelSettings from './components/settings/StudioKernelSettings';

type KernelTab = 'companion' | 'studio' | 'llm' | 'store';

const kernelCards = [
  {
    id: 'companion' as KernelTab,
    title: 'Setelan Companion',
    description: 'Personalitas bot, voice engine, UI theme, dan experience khusus di gateway Companion.',
    icon: Heart,
    action: 'Open companion kernel settings',
    colorClass: 'border-pink-500/40 bg-pink-500/5 hover:border-pink-500/30',
  },
  {
    id: 'llm' as KernelTab,
    title: 'LLM Warehouse',
    description: 'Provider selection, endpoint custom, health metrics, dan routing khusus kernel LLM.',
    icon: Cpu,
    action: 'Open LLM cockpit',
    colorClass: 'border-primary/40 bg-primary/5 hover:border-primary/30',
  },
  {
    id: 'studio' as KernelTab,
    title: 'Workspace Settings',
    description: 'Workspace kernel controls, resilience audit, git workspace, dan sandbox behavior.',
    icon: Code,
    action: 'Open studio kernel settings',
    colorClass: 'border-cyan-500/40 bg-cyan-500/5 hover:border-cyan-500/30',
  },
  {
    id: 'store' as KernelTab,
    title: 'Mia Store',
    description: 'Marketplace kernel, skill deployment, dan app management untuk setiap domain.',
    icon: ShoppingBag,
    action: 'Open store kernel',
    colorClass: 'border-yellow-500/40 bg-yellow-500/5 hover:border-yellow-500/30',
  },
];

export default function Settings() {
  const { config, loading, updateConfig, refreshConfig } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedTab = query.get('tab') as KernelTab | null;
  const uiOpacity = config?.appearance?.ui_opacity ?? 0.6;

  const updateConfigLocal = async (newConfig: MIAConfig) => {
    if (!config) return;
    updateConfig(newConfig);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!res.ok) throw new Error('Failed to persist kernel config');
      await refreshConfig();
    } catch (error) {
      console.error('Failed to save kernel config', error);
      await refreshConfig();
    }
  };

  if (loading || !config) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-primary font-mono animate-pulse bg-transparent">Memuat konfigurasi kernel...</div>
    );
  }

  const baseCardClasses = 'p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl transition-all duration-500 group flex flex-col justify-between h-72 shadow-2xl relative overflow-hidden';

  const renderSelectedPanel = () => {
    switch (selectedTab) {
      case 'companion':
        return (
          <div className="space-y-8">
            <KernelPanelHeader title="Companion Kernel" subtitle="Setelan khusus untuk gateway Companion" />
            <CompanionKernelSettings config={config} updateConfigLocal={(newConfig) => { updateConfigLocal(newConfig); }} />
          </div>
        );
      case 'studio':
        return (
          <div className="space-y-8">
            <KernelPanelHeader title="Studio Kernel" subtitle="Workspace kernel settings & resilience controls" />
            <StudioKernelSettings config={config} updateConfigLocal={(newConfig) => { updateConfigLocal(newConfig); }} />
          </div>
        );
      case 'llm':
        return (
          <div className="rounded-[2rem] border border-white/10 bg-black/75 p-8 backdrop-blur-3xl shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-3xl bg-primary/15 text-primary">
                <Cpu size={22} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-mono">LLM Kernel</div>
                <h2 className="mt-2 text-2xl font-bold text-white">LLM Warehouse Cockpit</h2>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-8">Masuk ke kernel LLM untuk mengelola provider, tes koneksi, dan memilih jalur eksekusi untuk model-model intelektual Anda.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <LinkButton to="/llm" label="Open LLM Cockpit" />
              <ActionCard icon={<ShieldAlert />} title="Provider Safety" description="Pastikan setiap provider aktif hanya ketika diperlukan untuk menjaga stabilitas kernel." />
            </div>
          </div>
        );
      case 'store':
        return (
          <div className="rounded-[2rem] border border-white/10 bg-black/75 p-8 backdrop-blur-3xl shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-3xl bg-yellow-500/15 text-yellow-300">
                <ShoppingBag size={22} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-mono">Marketplace Kernel</div>
                <h2 className="mt-2 text-2xl font-bold text-white">Mia Store</h2>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-8">Kelola skill, aplikasi, dan template yang berjalan dengan kernel shared app. Setiap app deployment dilampirkan pada gateway yang relevan.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <LinkButton to="/skills" label="Open Mia Store" />
              <ActionCard icon={<Zap />} title="Gateway Alokasi" description="Skill yang terpasang akan dijaga agar tidak mengganggu Companion, Studio, dan LLM kernel." />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col p-6 sm:p-12 max-w-6xl mx-auto overflow-hidden animate-fade-in relative z-10">
      <div className="flex flex-col gap-6 pb-6 border-b border-white/10 mb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black font-mono tracking-widest text-white flex items-center gap-3">
              <ShieldAlert className="text-primary animate-pulse" size={28} />
              MIA KERNEL SETTINGS
            </h1>
            <p className="text-xs text-white/40 font-mono mt-1 uppercase tracking-widest">Satu aplikasi, banyak kernel, setiap kernel dengan ruang setting yang terpisah.</p>
          </div>
          {selectedTab && (
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:bg-white/10"
            >
              <ChevronLeft size={16} /> Kembali ke Hub
            </button>
          )}
        </div>

        {!selectedTab && (
          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Arsitektur Modular Terdistribusi</h4>
              <p className="text-xs text-white/60 leading-relaxed mt-1">Pilih kernel yang ingin Anda konfigurasi. Setiap gateway memiliki ruang setting sendiri agar aplikasi tetap konsisten, ringan, dan estetis.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-white/80">
              <Database size={14} /> Kernel Modular
            </span>
          </div>
        )}
      </div>

      {selectedTab ? (
        renderSelectedPanel()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kernelCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                to={`/settings?tab=${card.id}`}
                className={`${baseCardClasses} ${card.colorClass}`}
                style={{ backgroundColor: `rgba(0, 0, 0, ${uiOpacity})` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div className="p-4 rounded-3xl bg-white/5 text-white/80 group-hover:scale-110 transition-transform">
                    <Icon size={28} />
                  </div>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-full">KERNEL</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-mono group-hover:text-white transition-colors">{card.title}</h3>
                  <p className="text-xs text-white/40 mt-2 leading-relaxed">{card.description}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-primary font-bold">
                  <span>{card.action}</span>
                  <Zap size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KernelPanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/70 p-6 backdrop-blur-3xl shadow-2xl">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Kernel Panel</span>
        <h2 className="text-3xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-sm text-white/60 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function LinkButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-primary/10 px-6 py-4 text-sm font-semibold text-white transition hover:bg-primary/15"
    >
      {label}
    </Link>
  );
}

function ActionCard({ icon, title, description }: { icon: JSX.Element; title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
      <div className="flex items-center gap-3 mb-4 text-primary">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}
