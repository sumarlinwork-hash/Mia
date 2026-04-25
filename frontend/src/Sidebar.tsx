import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings2, Brain, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar({ onToggleZen }: any) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: "Home", icon: <Home size={22} />, path: "/" },
    { name: "Crone (Tasks)", icon: <Activity size={22} />, path: "/crone" },
    { name: "I'm_Mia (Memory)", icon: <Brain size={22} />, path: "/iam-mia" },
    { name: "Settings", icon: <Settings2 size={22} />, path: "/settings" },
  ];

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
            className="w-8 h-8 rounded-full animate-pulse shrink-0 group-hover:scale-110 transition-transform" 
            style={{ backgroundColor: '#00ffcc', boxShadow: '0 0 10px rgba(0,255,204,0.8), 0 0 20px rgba(0,255,204,0.4)' }}
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

      <div className="px-4 flex justify-center">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/10"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
}
