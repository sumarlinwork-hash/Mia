import React from 'react';
import { Folder, File, ChevronRight, ChevronDown, FileCode, Edit2, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  onFileClick: (path: string) => void;
  onFileRename: (path: string) => void;
  onFileDelete: (path: string) => void;
  activePath?: string;
}

const TreeNode: React.FC<{ 
  node: FileNode; 
  level: number; 
  onFileClick: (path: string) => void; 
  onFileRename: (path: string) => void;
  onFileDelete: (path: string) => void;
  activePath?: string 
}> = ({ node, level, onFileClick, onFileRename, onFileDelete, activePath }) => {
  const [isOpen, setIsOpen] = React.useState(level === 0);
  const isSelected = activePath === node.path;

  const handleClick = () => {
    if (node.is_dir) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleClick}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        className={clsx(
          "flex items-center gap-2 py-1.5 px-3 cursor-pointer transition-colors group",
          isSelected ? "bg-blue-500/20 text-blue-400" : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
      >
        <span className="w-4 h-4 flex items-center justify-center">
          {node.is_dir ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <FileCode size={14} className={clsx(isSelected ? "text-blue-400" : "text-white/30 group-hover:text-white/60")} />
          )}
        </span>
        
        {node.is_dir ? <Folder size={16} className="text-blue-500/60" /> : <File size={14} className="opacity-0 w-0" />}
        <span className="text-xs font-medium truncate flex-1">{node.name}</span>

        {!node.is_dir && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onFileRename(node.path); }}
              className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-white"
            >
              <Edit2 size={12} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onFileDelete(node.path); }}
              className="p-1 hover:bg-red-500/20 rounded-md text-white/40 hover:text-red-500"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {node.is_dir && isOpen && node.children && (
        <div className="mt-0.5">
          {node.children.map(child => (
            <TreeNode 
              key={child.path} 
              node={child} 
              level={level + 1} 
              onFileClick={onFileClick} 
              onFileRename={onFileRename}
              onFileDelete={onFileDelete}
              activePath={activePath} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const StudioFileTree: React.FC<FileTreeProps> = ({ files, onFileClick, onFileRename, onFileDelete, activePath }) => {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]/50 backdrop-blur-md border-r border-white/5 w-64 shrink-0 overflow-y-auto custom-scrollbar">
      <div className="h-14 flex items-center px-6 border-b border-white/5 shrink-0">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Explorer</span>
      </div>
      
      <div className="py-4">
        {files.length === 0 ? (
          <div className="px-6 py-4 text-[10px] text-white/20 italic">No files found</div>
        ) : (
          files.map(node => (
            <TreeNode 
              key={node.path} 
              node={node} 
              level={0} 
              onFileClick={onFileClick} 
              onFileRename={onFileRename}
              onFileDelete={onFileDelete}
              activePath={activePath} 
            />
          ))
        )}
      </div>
    </div>
  );
};
