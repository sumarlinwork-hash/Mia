import React from 'react';
import { 
  Shield, 
  Search, 
  Activity, 
  Bell, 
  ChevronDown,
  Cpu
} from 'lucide-react';
import clsx from 'clsx';

interface StudioTopbarProps {
  projectName: string;
  systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export const StudioTopbar: React.FC<StudioTopbarProps> = ({ projectName, systemStatus }) => {
  return (
    <div className="h-12 flex items-center justify-between px-4 z-30 select-none panel-toolbar">
      {/* Left Section: Logo & Project */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield size={14} className="text-black" />
          </div>
          <span className="text-xs font-bold tracking-widest text-white/90">MIA<span className="text-primary">AS</span></span>
        </div>
        
        <div className="h-4 w-px bg-white/10 mx-2" />
        
        <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors group">
          <span className="text-xs font-medium text-white/60 group-hover:text-white/90">{projectName}</span>
          <ChevronDown size={14} className="text-white/30" />
        </button>
      </div>

      {/* Center Section: Command Palette Trigger */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
          </div>
          <input 
            id="topbar-search-input"
            name="search"
            type="text" 
            placeholder="Search commands or files... (Ctrl + P)"
            className="w-full bg-white/[0.03] border border-white/5 rounded-md py-1.5 pl-10 pr-4 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white/[0.05] transition-all"
            readOnly
          />
        </div>
      </div>

      {/* Right Section: System Metrics & Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          {/* CPU/Kernel Load */}
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-white/30" />
            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-primary/50" />
            </div>
          </div>

          {/* System Health */}
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03] border border-white/5">
            <Activity size={14} className={clsx(
              "animate-pulse",
              systemStatus === 'HEALTHY' ? "text-green-500" : 
              systemStatus === 'WARNING' ? "text-yellow-500" : "text-red-500"
            )} />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-tight">SHAD-CSA: {systemStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-white/40 hover:text-white transition-colors relative">
            <Bell size={18} />
            <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border-2 border-[#0a0a0a]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-soft border border-white/10 flex items-center justify-center text-[10px] font-bold shadow-inner text-primary">
            JD
          </div>
        </div>
      </div>
    </div>
  );
};
