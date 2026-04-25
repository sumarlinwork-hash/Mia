import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings2, Brain, Activity, ChevronLeft, ChevronRight, Heart, Zap, Shield } from 'lucide-react';
import { useConfig } from './hooks/useConfig';

interface SidebarProps {
  onToggleZen: () => void;
  isZenMode: boolean;
}

export default function Sidebar({ onToggleZen, isZenMode }: SidebarProps) {
  const { config } = useConfig();
  const [collapsed, setCollapsed] = useState(false);
  const [emotion, setEmotion] = useState({ arousal: 50, happiness: 80, dominance: 60 });
  const location = useLocation();
  const navigate = useNavigate();

  const isPro = config?.is_professional_mode;

  const navItems = [
    { name: "Home", icon: <Home size={22} />, path: "/" },
    { name: isPro ? "Task Engine" : "Crone (Tasks)", icon: <Activity size={22} />, path: "/crone" },
    { name: isPro ? "Memory Store" : "I'm_Mia (Memory)", icon: <Brain size={22} />, path: "/iam-mia" },
    { name: isPro ? "Resonance Hub" : "Emotion Dashboard", icon: <Heart size={22} />, path: "/emotion" },
    { name: isPro ? "Skill Marketplace" : "Discovery Marketplace", icon: <Zap size={22} />, path: "/skills" },
    { name: "Settings", icon: <Settings2 size={22} />, path: "/settings" },
  ];

  useEffect(() => {
    const fetchEmotion = () => {
      fetch('http://localhost:8000/api/emotion')
        .then(res => res.json())
        .then(data => setEmotion(data))
        .catch(() => {});
    };
    fetchEmotion();
    const interval = setInterval(fetchEmotion, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col justify-between py-6 border-r border-white/10 backdrop-blur-xl transition-all duration-300 ease-in-out bg-black/40 shadow-2xl ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        <div 
          onClick={() => onToggleZen()}
          className={`flex items-center gap-3 px-6 mb-10 transition-all cursor-pointer group ${collapsed ? 'justify-center px-0' : ''}`}
          title="Toggle Zen Mode"
        >
          <div 
            className={`w-8 h-8 rounded-full shrink-0 group-hover:scale-110 transition-transform ${isZenMode ? 'animate-bounce shadow-[0_0_20px_#00ffcc]' : 'animate-pulse'}`} 
            style={{ backgroundColor: '#00ffcc', boxShadow: isZenMode ? '0 0 20px #00ffcc' : '0 0 10px rgba(0,255,204,0.8), 0 0 20px rgba(0,255,204,0.4)' }}
          ></div>
          {!collapsed && (
            <span 
              className="font-mono font-bold text-xl tracking-widest whitespace-nowrap animate-fade-in group-hover:text-white transition-colors"
              style={{ color: '#00ffcc', textShadow: '0 0 10px rgba(0,255,204,0.8)' }}
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
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all font-mono group cursor-pointer ${
                  isActive 
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
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-3 flex items-center gap-2">
              <Shield size={10} /> {isPro ? "Intelligence Hub" : "Intimacy Orchestrator"}
            </div>
            <div className="space-y-3">
              <SidebarStat label={isPro ? "Energy" : "Arousal"} value={emotion.arousal} color="bg-rose-500" />
              <SidebarStat label={isPro ? "Harmony" : "Happiness"} value={emotion.happiness} color="bg-yellow-400" />
              <SidebarStat label={isPro ? "Focus" : "Dominance"} value={emotion.dominance} color="bg-purple-500" />
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
      <span>{value}%</span>
    </div>
    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);
