import React, { useState } from 'react';
import { 
  Files, 
  Search, 
  GitBranch, 
  Box, 
  Settings, 
  Database,
  CloudLightning,
  ShieldAlert
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarIconProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string | number;
}

const SidebarIcon: React.FC<SidebarIconProps> = ({ icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={clsx(
      "w-12 h-12 flex items-center justify-center transition-all duration-200 relative group",
      active ? "text-blue-500 border-l-2 border-blue-500 bg-blue-500/5" : "text-white/30 hover:text-white/70"
    )}
    title={label}
  >
    {icon}
    {badge && (
      <div className="absolute top-2 right-2 min-w-[14px] h-[14px] bg-blue-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white px-0.5 border border-[#0a0a0a]">
        {badge}
      </div>
    )}
    {/* Tooltip hint on hover (simple) */}
    {!active && (
      <div className="absolute left-14 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </div>
    )}
  </button>
);

interface StudioSidebarProps {
  children?: React.ReactNode;
  title: string;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({ children, title }) => {
  const [activeTab, setActiveTab] = useState('explorer');

  return (
    <div className="flex h-full border-r border-white/5 bg-[#0a0a0a]">
      {/* Icon Bar */}
      <div className="w-12 flex flex-col items-center py-2 gap-1 border-r border-white/5">
        <SidebarIcon 
          icon={<Files size={20} />} 
          label="Explorer" 
          active={activeTab === 'explorer'} 
          onClick={() => setActiveTab('explorer')} 
        />
        <SidebarIcon 
          icon={<Search size={20} />} 
          label="Global Search" 
          active={activeTab === 'search'} 
          onClick={() => setActiveTab('search')} 
        />
        <SidebarIcon 
          icon={<GitBranch size={20} />} 
          label="Source Control" 
          active={activeTab === 'git'} 
          onClick={() => setActiveTab('git')} 
          badge={2}
        />
        <SidebarIcon 
          icon={<Database size={20} />} 
          label="Distributed Ledger" 
          active={activeTab === 'ledger'} 
          onClick={() => setActiveTab('ledger')} 
        />
        <SidebarIcon 
          icon={<Box size={20} />} 
          label="Extensions" 
          active={activeTab === 'extensions'} 
          onClick={() => setActiveTab('extensions')} 
        />
        
        <div className="flex-1" />

        <SidebarIcon 
          icon={<CloudLightning size={20} />} 
          label="Chaos Engine" 
          active={activeTab === 'chaos'} 
          onClick={() => setActiveTab('chaos')} 
        />
        <SidebarIcon 
          icon={<ShieldAlert size={20} />} 
          label="Resilience Guard" 
          active={activeTab === 'resilience'} 
          onClick={() => setActiveTab('resilience')} 
        />
        <SidebarIcon 
          icon={<Settings size={20} />} 
          label="Studio Settings" 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
        />
      </div>

      {/* Panel Area */}
      <div className="w-64 flex flex-col bg-[#050505]/40 backdrop-blur-sm overflow-hidden animate-in slide-in-from-left duration-300">
        <div className="h-9 px-4 flex items-center justify-between border-b border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{title}</span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/5">
          {children}
        </div>
      </div>
    </div>
  );
};
