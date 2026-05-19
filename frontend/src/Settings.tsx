import { Link } from 'react-router-dom';
import { 
  Heart, Cpu, Code, ShoppingBag, ArrowLeft, ShieldAlert, Sparkles 
} from 'lucide-react';
import { useConfig } from './hooks/useConfig';

export default function Settings() {
  const { config } = useConfig();
  const uiOpacity = config?.appearance?.ui_opacity ?? 0.6;

  return (
    <div className="min-h-screen w-full flex flex-col p-6 sm:p-12 max-w-6xl mx-auto overflow-hidden animate-fade-in relative z-10">
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-white/10 mb-12">
        <div>
          <h1 className="text-3xl font-black font-mono tracking-widest text-white flex items-center gap-3">
            <ShieldAlert className="text-primary animate-pulse" size={28} />
            MIA CONFIGURATION HUB
          </h1>
          <p className="text-xs text-white/40 font-mono mt-1 uppercase tracking-widest">Decoupled Contextual Architecture</p>
        </div>
        <Link 
          to="/" 
          className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-mono font-bold text-white transition-all flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          KEMBALI KE HOME
        </Link>
      </div>

      {/* Overview Explanation */}
      <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md mb-12 flex items-start gap-4">
        <Sparkles className="text-primary shrink-0 animate-bounce mt-1" size={20} />
        <div>
          <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Arsitektur Modular Terdistribusi</h4>
          <p className="text-xs text-white/60 leading-relaxed mt-1">
            Untuk meminimalkan bloat memori dan meningkatkan fluiditas FPS, seluruh setelan MIA kini telah didegradasi & diintegrasikan secara kontekstual ke dalam masing-masing ruang kerja terkait. Silakan pilih gateway di bawah untuk mengakses setelan.
          </p>
        </div>
      </div>

      {/* Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Companion Settings */}
        <Link 
          to="/" 
          className="p-8 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 hover:border-pink-500/40 transition-all duration-500 group flex flex-col justify-between h-72 shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: `rgba(0, 0, 0, ${uiOpacity})` }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-pink-500/10 transition-all" />
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-3xl bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform">
              <Heart size={28} className="fill-pink-500/10" />
            </div>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-full">CONTEXTUAL DRAWER</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-mono group-hover:text-pink-400 transition-colors">Setelan Companion</h3>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">Personalitas bot (name, age, persona), transparansi UI, skema warna tema, edge-tts, dan ElevenLabs key.</p>
          </div>
        </Link>

        {/* Card 2: LLM Warehouse Cockpit */}
        <Link 
          to="/llm" 
          className="p-8 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 hover:border-primary/40 transition-all duration-500 group flex flex-col justify-between h-72 shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: `rgba(0, 0, 0, ${uiOpacity})` }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all" />
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-3xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Cpu size={28} />
            </div>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-full">STANDALONE PAGE</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-mono group-hover:text-primary transition-colors">LLM Warehouse Cockpit</h3>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">Registrasi provider intelijen, custom endpoint, API key, latency metrics, dan pengalihan dynamic routing.</p>
          </div>
        </Link>

        {/* Card 3: Studio Settings */}
        <Link 
          to="/studio" 
          className="p-8 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 hover:border-cyan-500/40 transition-all duration-500 group flex flex-col justify-between h-72 shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: `rgba(0, 0, 0, ${uiOpacity})` }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-3xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Code size={28} />
            </div>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-full">WORKSPACE SIDEBAR</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">Workspace & Git Cockpit</h3>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">Audit skill otonom yang aktif, status percabangan Git, resilience monitor grafis, dan sandbox execution profile.</p>
          </div>
        </Link>

        {/* Card 4: Mia Store */}
        <Link 
          to="/skills" 
          className="p-8 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 hover:border-yellow-500/40 transition-all duration-500 group flex flex-col justify-between h-72 shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: `rgba(0, 0, 0, ${uiOpacity})` }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-yellow-500/10 transition-all" />
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-3xl bg-yellow-500/10 text-yellow-400 group-hover:scale-110 transition-transform">
              <ShoppingBag size={28} />
            </div>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-full">SHARED APP STORE</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-mono group-hover:text-yellow-400 transition-colors">Mia Store</h3>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">Pencarian dan pengunduhan modul skill baru terbagi atas Lifestyles & Chat dan Developer & Automation.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
