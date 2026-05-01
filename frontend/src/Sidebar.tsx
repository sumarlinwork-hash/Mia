import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings2, Brain, Activity, ChevronLeft, ChevronRight, Heart, Zap, Shield, Flower, Flower2, Flower2Icon, LucideFlower2 } from 'lucide-react';
import { useConfig } from './hooks/useConfig';

interface SidebarProps {
  onToggleZen: () => void;
  isZenMode: boolean;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export default function Sidebar({ onToggleZen, isZenMode, collapsed, setCollapsed }: SidebarProps) {
  const { config } = useConfig();
  const [emotion, setEmotion] = useState({ arousal: 0, echo: 0, warmth: 0 });
  const location = useLocation();
  const navigate = useNavigate();

  const isPro = config?.is_professional_mode;

  const navItems = [
    { name: isPro ? "Home" : "I love you", icon: <Home size={22} />, path: "/" },
    { name: isPro ? "Crone Tasks" : "My grind", icon: <Activity size={22} />, path: "/crone" },
    { name: isPro ? "Memory Store" : "I'm Mia", icon: <Brain size={22} />, path: "/iam-mia" },
    { name: isPro ? "Resonance Hub" : "My heart", icon: <Heart size={22} />, path: "/emotion" },
    { name: isPro ? "Mia Store" : "My Store", icon: <Zap size={22} />, path: "/skills" },
    { name: isPro ? "MIA Studio" : "My Garden", icon: <Flower size={22} />, path: "/studio" },
    { name: "Settings", icon: <Settings2 size={22} />, path: "/settings" },
  ];

  useEffect(() => {
    const fetchEmotion = () => {
      fetch('/api/emotion')
        .then(res => res.json())
        .then(data => setEmotion(data))
        .catch(() => { });
    };
    fetchEmotion();
    const interval = setInterval(fetchEmotion, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col justify-between py-6 border-r border-white/10 backdrop-blur-xl transition-all duration-500 ease-in-out shadow-2xl ${collapsed ? 'w-20' : 'w-64'
        }`}
      style={{ backgroundColor: `rgba(0, 0, 0, ${1 - (config?.appearance?.ui_opacity ?? 0.5)})` }}
    >
      <div>
        <div
          onClick={() => onToggleZen()}
          className={`flex items-center gap-3 px-6 mb-10 transition-all cursor-pointer group ${collapsed ? 'justify-center px-0' : ''}`}
          title="Toggle Zen Mode"
        >
          <div
            className={`w-8 h-8 rounded-full shrink-0 group-hover:scale-110 transition-transform ${isZenMode ? 'animate-bounce' : 'animate-pulse'}`}
            style={{
              backgroundColor: 'var(--color-primary)',
              boxShadow: isZenMode
                ? '0 0 20px var(--color-primary)'
                : '0 0 10px var(--color-primary), 0 0 20px var(--color-primary)'
            }}
          ></div>
          {!collapsed && (
            <span
              className="font-mono font-bold text-xl tracking-widest whitespace-nowrap animate-fade-in group-hover:text-white transition-colors"
              style={{ color: 'var(--color-primary)', textShadow: '0 0 10px var(--color-primary)' }}
            >MIA</span>
          )}
        </div>


        <nav className="flex flex-col gap-2 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname === "" && item.path === "/");
            return (
              <div
                key={item.path}
                onClick={(e) => {
                  e.stopPropagation();
                  // Strict Path Comparison: React Router root is always "/"
                  const isCurrent = location.pathname === item.path;
                  if (isCurrent) {
                    onToggleZen();
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all font-mono group cursor-pointer ${isActive
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,204,0.1)]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.name : ""}
              >
                <div className="shrink-0">{item.icon}</div>
                {!collapsed && <span className="whitespace-nowrap animate-fade-in">{item.name}</span>}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="px-4 space-y-4">
        {!collapsed && config && (
          <div
            className="p-4 rounded-2xl border border-white/10 mb-4 transition-all duration-500"
            style={{ backgroundColor: `rgba(255, 255, 255, ${(1 - (config?.appearance?.ui_opacity ?? 0.5)) * 0.05})` }}
          >
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-3 flex items-center gap-2">
              <Shield size={10} /> {isPro ? "Intelligence Hub" : "Intimacy Orchestrator"}
            </div>
            <div className="space-y-3">
              <SidebarStat label="Attention Echo" value={emotion.echo} color="bg-blue-400" />
              <SidebarStat label="Arousal" value={emotion.arousal} color="bg-rose-500" />
              <SidebarStat label="Warmth" value={emotion.warmth} color="bg-orange-400" />
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/10"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

const SidebarStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase">
      <span>{label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-1000`}
        style={{ width: `${Math.round(value)}%` }}
      ></div>
    </div>
  </div>
);
