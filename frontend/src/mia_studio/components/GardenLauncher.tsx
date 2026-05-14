import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  Edit3,
  FolderTree,
  LayoutGrid,
  Mic,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  Workflow,
  EyeOff,
  Monitor
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GardenLauncherProps {
  projectName: string;
  onSubmit: (prompt: string) => void;
  onToggleZen?: () => void;
}

const suggestions = [
  'Think of a suitable starter task for me, implement it, and walk me through the solution',
  'Explain this project to me',
  'Connect your favorite apps to My Garden',
];

export const GardenLauncher: React.FC<GardenLauncherProps> = ({ projectName, onSubmit, onToggleZen }) => {
  const [prompt, setPrompt] = useState('');
  const [ides, setIdes] = useState<{id: string, name: string}[]>([]);
  const [showIdeDropdown, setShowIdeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const trimmedPrompt = prompt.trim();

  // Fetch IDEs on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/studio/ide/list')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.ides) setIdes(d.ides);
      })
      .catch(e => console.error("Failed to fetch IDEs:", e));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowIdeDropdown(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const openLocalIde = async (ide_command: string) => {
    setShowIdeDropdown(false);
    try {
      await fetch('http://localhost:8000/api/studio/ide/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectName || 'mia', ide_command })
      });
    } catch (e) {
      console.error("Failed to launch IDE:", e);
    }
  };

  // Keyboard Shortcut for Zen Mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onToggleZen?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleZen]);

  const pinnedLabel = useMemo(() => {
    const base = projectName?.trim() || 'mia';
    return base.length > 18 ? `${base.slice(0, 18)}...` : base;
  }, [projectName]);

  const submitPrompt = () => {
    if (!trimmedPrompt) return;
    onSubmit(trimmedPrompt);
  };

  const chooseSuggestion = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="h-screen w-full surface-root text-white overflow-hidden font-sans">
      <div className="h-full flex">
        <aside className="hidden md:flex w-[300px] shrink-0 flex-col panel-toolbar">
          <div className="h-9 flex items-center gap-4 px-4 text-white/70">
            <button 
              onClick={() => navigate(-1)} 
              className="p-1 rounded hover:bg-white/10 motion-micro" 
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <button className="p-1 rounded hover:bg-white/10 motion-micro" aria-label="Forward">
              <ArrowRight size={16} />
            </button>
          </div>

          <nav className="px-4 pt-2 space-y-1 text-label text-white/80">
            <GardenNavItem icon={<Edit3 size={16} />} label="New garden" />
            <GardenNavItem icon={<Search size={16} />} label="Search" />
            <GardenNavItem icon={<LayoutGrid size={16} />} label="Plugins" onClick={() => navigate('/skills')} />
            <GardenNavItem icon={<TerminalSquare size={16} />} label="Automations" />
          </nav>

          <div className="px-4 pt-6">
            <GardenSectionTitle>Pinned</GardenSectionTitle>
            <button className="w-full h-9 flex items-center justify-between rounded-md px-1 text-left text-[13px] font-semibold hover:bg-white/5 transition-colors">
              <span className="flex min-w-0 items-center gap-2">
                <Workflow size={15} className="text-white/85 shrink-0" />
                <span className="truncate">Explain and fix</span>
              </span>
              <span className="rounded-md bg-[#3a3a3a] px-1.5 py-0.5 text-[11px] text-white">Ctrl+1</span>
            </button>
          </div>

          <div className="px-4 pt-6">
            <GardenSectionTitle>Projects</GardenSectionTitle>
            <button className="w-full h-9 flex items-center gap-2 rounded-md px-1 text-left text-[13px] font-semibold hover:bg-white/5 transition-colors">
              <FolderTree size={15} className="text-white/85 shrink-0" />
              <span className="truncate">{pinnedLabel}</span>
            </button>
          </div>

          <div className="px-4 pt-6">
            <div className="flex items-center justify-between">
              <GardenSectionTitle>Chats</GardenSectionTitle>
              <div className="flex items-center gap-3 text-white/70">
                <SlidersHorizontal size={14} />
                <Edit3 size={14} />
              </div>
            </div>
            <div className="pt-1 text-[14px] text-white/55">No chats</div>
          </div>

          <div className="mt-auto flex items-center justify-between px-4 pb-4">
            <button onClick={() => navigate('/settings')} className="flex items-center gap-2 text-[13px] font-semibold text-white hover:text-white/80 transition-colors">
              <Settings size={16} />
              Settings
            </button>
            <button className="rounded-lg border border-white/20 bg-[#242424] px-3 py-1.5 text-[12px] font-semibold text-white shadow-inner hover:bg-[#303030] transition-colors">
              Upgrade
            </button>
          </div>
        </aside>

        <main 
          className="relative flex-1 bg-transparent"
          onDoubleClick={(e) => {
            if (e.target === e.currentTarget) onToggleZen?.();
          }}
        >
          <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between md:left-5 md:right-5">
            <button className="inline-flex h-7 items-center gap-1 rounded-full bg-primary/20 px-3 text-label text-primary font-bold hover:bg-primary/30 motion-micro">
              <Sparkles size={13} fill="currentColor" />
              Get Plus
            </button>

            <div className="flex items-center gap-2 text-white/80">
              <button 
                onClick={() => onToggleZen?.()}
                className="h-7 w-7 rounded-lg border border-white/15 bg-[#171717] grid place-items-center hover:bg-[#222] transition-colors" 
                title="Zen Mode (Ctrl+Shift+Z)"
              >
                <EyeOff size={14} />
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowIdeDropdown(!showIdeDropdown)}
                  className="flex h-7 items-center gap-2 rounded-lg border border-white/15 bg-[#171717] px-2 hover:bg-[#222] transition-colors" 
                  title="Open in Local IDE"
                >
                  <Monitor size={14} className="text-white" />
                  <ChevronDown size={13} />
                </button>
                {showIdeDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-white/10 bg-[#171717] shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2 text-[11px] font-semibold text-white/50 uppercase tracking-wider border-b border-white/10">
                      Local IDEs Detected
                    </div>
                    {ides.length === 0 ? (
                      <div className="px-3 py-3 text-[12px] text-white/50">No IDEs found.</div>
                    ) : (
                      <div className="py-1">
                        {ides.map(ide => (
                          <button
                            key={ide.id}
                            onClick={() => openLocalIde(ide.id)}
                            className="w-full text-left px-3 py-2 text-[13px] text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                          >
                            <Monitor size={13} className="text-white/70" />
                            Open in {ide.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button className="h-7 w-7 rounded-lg border border-white/15 bg-[#171717] grid place-items-center hover:bg-[#222] transition-colors" aria-label="Terminal">
                <TerminalSquare size={15} />
              </button>
              <button className="h-7 w-7 rounded-lg border border-white/15 bg-[#171717] grid place-items-center hover:bg-[#222] transition-colors" aria-label="Layout">
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          <div className="flex h-full items-center justify-center px-5 pb-10 pt-16">
            <section className="w-full max-w-[728px] -translate-y-[6px]">
              <h1 className="mb-11 text-center text-[28px] font-bold tracking-[-0.01em] text-white">
                What should we build in My Garden?
              </h1>

              <div className="overflow-hidden rounded-[18px] panel-glass">
                <div className="min-h-[62px] px-3 py-3">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submitPrompt();
                      }
                    }}
                    placeholder="Ask My Garden anything. @ to mention files"
                    className="h-[46px] w-full resize-none bg-transparent px-0 text-[14px] leading-6 text-white outline-none placeholder:text-[#c8c8c8]"
                  />
                </div>

                <div className="flex min-h-[40px] items-center justify-between px-3 pb-2 text-white">
                  <div className="flex items-center gap-4">
                    <button className="grid h-7 w-7 place-items-center rounded-md text-white hover:bg-white/10 transition-colors" aria-label="Add">
                      <Plus size={20} />
                    </button>
                    <button className="flex h-7 items-center gap-1.5 rounded-md text-[13px] font-semibold text-primary-soft hover:bg-white/10 motion-micro">
                      <Bot size={15} />
                      Auto-review
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-[13px] font-semibold text-white hover:text-white/80 transition-colors">
                      5.5 Medium
                      <ChevronDown size={13} />
                    </button>
                    <button className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/10 transition-colors" aria-label="Voice">
                      <Mic size={15} />
                    </button>
                    <button
                      onClick={submitPrompt}
                      disabled={!trimmedPrompt}
                      className="grid h-8 w-8 place-items-center rounded-full bg-primary text-black transition-all enabled:hover:scale-105 disabled:bg-white/10 disabled:text-white/40 motion-hover"
                      aria-label="Submit build prompt"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex min-h-[43px] items-center gap-6 bg-black/40 px-4 text-[13px] font-semibold text-white">
                  <button className="flex items-center gap-1.5 hover:text-white/80 motion-micro">
                    <FolderTree size={15} />
                    mia
                    <ChevronDown size={13} />
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
                    <TerminalSquare size={15} />
                    Work locally
                    <ChevronDown size={13} />
                  </button>
                  <button className="flex min-w-0 items-center gap-1.5 hover:text-white/80 transition-colors">
                    <Workflow size={15} />
                    <span className="truncate">rebuild-from-v1.2</span>
                    <ChevronDown size={13} />
                  </button>
                </div>
              </div>

              <div className="mt-5 divide-y divide-white/[0.08] border-b border-white/[0.08]">
                {suggestions.map((item, index) => (
                  <button
                    key={item}
                    onClick={() => chooseSuggestion(item)}
                    className="flex h-[41px] w-full items-center gap-3 px-4 text-left text-[13px] font-semibold text-white hover:bg-white/[0.035] transition-colors"
                  >
                    {index === 2 ? <LayoutGrid size={15} /> : <Workflow size={15} />}
                    <span className="truncate">{item}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

const GardenNavItem = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) => (
  <button onClick={onClick} className="flex h-8 w-full items-center gap-2 rounded-md px-1 text-left text-white hover:bg-white/5 transition-colors">
    <span className="text-white/90">{icon}</span>
    <span>{label}</span>
  </button>
);

const GardenSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 text-[14px] font-medium text-white/90">{children}</div>
);
