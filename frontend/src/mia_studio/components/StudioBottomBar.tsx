import React from 'react';
import { 
  GitBranch, 
  AlertCircle, 
  Terminal, 
  Zap,
  Globe,
  Lock
} from 'lucide-react';
import clsx from 'clsx';

interface StudioBottomBarProps {
  branch?: string;
  errors?: number;
  warnings?: number;
  isSecure?: boolean;
}

export const StudioBottomBar: React.FC<StudioBottomBarProps> = ({ 
  branch = "main", 
  errors = 0, 
  warnings = 0,
  isSecure = true
}) => {
  return (
    <div className="h-6 bg-blue-600 border-t border-white/5 flex items-center justify-between px-3 z-30 select-none text-[10px] font-medium text-white">
      {/* Left Section */}
      <div className="flex items-center gap-4 h-full">
        <button className="flex items-center gap-1.5 hover:bg-white/10 px-2 h-full transition-colors">
          <GitBranch size={12} />
          <span>{branch}</span>
        </button>

        <button className="flex items-center gap-3 hover:bg-white/10 px-2 h-full transition-colors">
          <div className="flex items-center gap-1">
            <AlertCircle size={12} />
            <span>{errors}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap size={12} className="text-yellow-300" />
            <span>{warnings}</span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 px-2 text-white/80">
          <Terminal size={12} />
          <span className="uppercase tracking-widest text-[9px] font-bold">Terminal Active</span>
        </div>
      </div>

      {/* Center: System Pulse */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/10 border border-white/10">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        <span className="uppercase tracking-[0.2em] text-[8px] font-black italic">MIA KERNEL : SECURE</span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1.5 px-2">
          <Globe size={12} className="text-white/70" />
          <span>UTF-8</span>
        </div>

        <div className="flex items-center gap-1.5 px-2">
          <span>TypeScript JSX</span>
        </div>

        <div className={clsx(
          "flex items-center gap-1.5 px-3 h-full font-bold uppercase tracking-tighter",
          isSecure ? "bg-green-500/20 text-white" : "bg-red-500 text-white"
        )}>
          <Lock size={10} />
          <span>Military Grade</span>
        </div>
      </div>
    </div>
  );
};
