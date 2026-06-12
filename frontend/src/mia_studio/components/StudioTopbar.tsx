import React from 'react';
import { 
  Shield, 
  Search, 
  Activity, 
  Bell, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Terminal,
  PanelLeftClose
} from 'lucide-react';
import clsx from 'clsx';

interface StudioTopbarProps {
  projectName: string;
  systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  onToggleTerminal?: () => void;
  onToggleSidebar?: () => void;
}

export const StudioTopbar: React.FC<StudioTopbarProps> = ({ projectName, systemStatus, onToggleTerminal, onToggleSidebar }) => {
  return (
    <div className="h-12 flex items-center justify-between px-4 z-30 select-none panel-toolbar border-b border-white/[0.05]">
      {/* Left Section: Logo, Navigation, Menus */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shadow-[0_0_10px_rgba(208,255,0,0.2)]">
            <Shield size={14} className="text-black" />
          </div>
        </div>
        
        {/* Back / Forward Nav */}
        <div className="flex items-center gap-1">
          <button className="p-1 rounded text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button className="p-1 rounded text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Desktop Menus */}
        <div className="hidden lg:flex items-center gap-1">
          {['File', 'Edit', 'View', 'Window', 'Help'].map((menu) => (
            <button key={menu} className="px-2.5 py-1 text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors">
              {menu}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Project Name */}
        <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors group">
          <span className="text-xs font-semibold text-white/80 group-hover:text-white">{projectName}</span>
          <ChevronDown size={14} className="text-white/30" />
        </button>
      </div>

      {/* Center Section: Command Palette Trigger */}
      <div className="flex-1 max-w-lg mx-8 hidden md:block">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={14} className="text-white/30 group-hover:text-white/50 transition-colors" />
          </div>
          <input 
            id="topbar-search-input"
            name="search"
            type="text" 
            placeholder="Search commands or files... (Ctrl + P)"
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-black/60 transition-all shadow-inner"
            readOnly
          />
        </div>
      </div>

      {/* Right Section: Actions & Status */}
      <div className="flex items-center gap-4">
        
        {/* Layout & Terminal Toggles */}
        <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-lg border border-white/5">
          <button onClick={onToggleSidebar} className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors" title="Toggle Sidebar">
            <PanelLeftClose size={14} />
          </button>
          <button onClick={onToggleTerminal} className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors" title="Toggle Terminal">
            <Terminal size={14} />
          </button>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Status Pill */}
        <div className="flex items-center gap-3 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
          <div className="flex items-center gap-2" title="System Status">
            <Activity size={14} className={clsx(
              "animate-pulse",
              systemStatus === 'HEALTHY' ? "text-green-400" : 
              systemStatus === 'WARNING' ? "text-yellow-400" : "text-red-400"
            )} />
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5" title="Execution Mode">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">LOCAL</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-2">
          <button className="text-white/40 hover:text-white transition-colors relative">
            <Bell size={18} />
            <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border-2 border-[#0a0a0a]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-dark to-primary border border-primary/30 flex items-center justify-center text-[11px] font-bold shadow-lg text-black">
            JD
          </div>
        </div>
      </div>
    </div>
  );
};
