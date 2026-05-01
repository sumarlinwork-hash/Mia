import React from 'react';
import { X, FileCode } from 'lucide-react';
import clsx from 'clsx';
import { useFileStore } from '../context/FileStoreContext';

interface StudioTabsProps {
  tabs: string[];
  activeTab: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

export const StudioTabs: React.FC<StudioTabsProps> = ({ tabs, activeTab, onTabClick, onTabClose }) => {
  const { files } = useFileStore();

  return (
    <div className="flex h-10 bg-[#0a0a0a] border-b border-white/5 overflow-x-auto custom-scrollbar no-scrollbar">
      {tabs.map(path => {
        const isActive = activeTab === path;
        const fileName = path.split('/').pop();
        const isDirty = files[path]?.isDirty;

        return (
          <div 
            key={path}
            onClick={() => onTabClick(path)}
            className={clsx(
              "flex items-center gap-2 px-4 border-r border-white/5 cursor-pointer transition-all min-w-[120px] max-w-[200px] group",
              isActive ? "bg-white/5 text-blue-400" : "text-white/40 hover:bg-white/[0.02] hover:text-white/60"
            )}
          >
            <FileCode size={14} className={clsx(isActive ? "text-blue-400" : "text-white/20")} />
            <span className="text-xs truncate flex-1">{fileName}</span>
            
            {isDirty && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(path);
              }}
              className={clsx(
                "p-0.5 rounded-md hover:bg-white/10 hover:text-white transition-colors opacity-0 group-hover:opacity-100",
                isActive ? "opacity-100" : ""
              )}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
