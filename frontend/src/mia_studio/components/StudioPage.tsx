import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  EyeOff, 
  Bot, 
  Monitor, 
  ChevronDown, 
  GitBranch,
  Settings,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import { useInstalledSkills } from '../../hooks/useMIAQueries';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { App as Skill } from '../../utils/viewModel';
import type { ProviderConfig } from '../../types/config';
import { useExecution } from '../hooks/useExecution';
import { useStudioStream } from '../hooks/useStudioStream';
import { useProject, useProjectEvents } from '../hooks/useProject';
import { useFileStore } from '../context/FileStoreContext';
import { StudioTerminal } from './StudioTerminal';
import { GraphViewer } from './GraphViewer';
import { StudioActivityStream } from './StudioActivityStream';
import { StudioComposer } from './StudioComposer';
import { ReviewChanges } from './ReviewChanges';

import { ResilienceMonitor } from './ResilienceMonitor';
import { GardenLauncher } from './GardenLauncher';
import { StudioBottomBar } from './StudioBottomBar';
import clsx from 'clsx';

interface ShadTelemetryPayload {
  snapshot?: {
    health_score?: number;
    mode?: string;
  };
  nodes?: {
    name: string;
    success: boolean;
    latency: number;
  }[];
  suggestions?: {
    id: string;
    label: string;
    description: string;
    severity: string;
  }[];
}

interface Message {
  role: 'user' | 'mia';
  content: string;
}

export interface StudioPageProps {
  onToggleZen?: () => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({ onToggleZen }) => {
  const { currentProjectId, currentSessionId } = useFileStore();
  const { config, updateConfig, refreshConfig } = useConfig();
  const { data: skills = [] } = useInstalledSkills();
  const { send, status: wsStatus } = useWebSocket();
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    if (wsStatus === 'connected') {
      send(JSON.stringify({ type: 'SWITCH_TO_STUDIO' }));
    }
  }, [wsStatus, send]);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showTaskPlanner, setShowTaskPlanner] = useState(true);

  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: '1', text: 'Splitting Router backend to separate modules', done: true },
    { id: '2', text: 'Integrate active LLM dynamic selection', done: true },
    { id: '3', text: 'Lazy loading routes & splitting settings drawer', done: true },
    { id: '4', text: 'Test coverage and runtime latency audits', done: false },
    { id: '5', text: 'Deploy to production ecosystem', done: false }
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const activeOverride = config?.active_provider_override ?? 'auto';
  const activeModelName = useMemo(() => {
    if (activeOverride === 'auto') return 'DYNAMIC AUTO';
    return activeOverride;
  }, [activeOverride]);

  const handleSelectOverrideModel = async (name: string) => {
    if (!config) return;
    const newConf = { ...config, active_provider_override: name };
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConf)
      });
      if (res.ok) {
        updateConfig(newConf);
        await refreshConfig();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShowModelDropdown(false);
    }
  };
  const [studioMode, setStudioMode] = useState<'launcher' | 'workspace'>('launcher');
  const [launchPrompt, setLaunchPrompt] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [autoSave, setAutoSave] = useState(true);
  const [autoReview, setAutoReview] = useState(true);
  
  // Local IDE Discovery states
  const [ides, setIdes] = useState<{id: string, name: string}[]>([]);
  const [showIdeDropdown, setShowIdeDropdown] = useState(false);
  const [selectedIde, setSelectedIde] = useState<string>(() => {
    return localStorage.getItem('mia_selected_ide') || 'vscode';
  });
  const ideDropdownRef = useRef<HTMLDivElement>(null);

  // Git state
  const [gitBranch, setGitBranch] = useState('main');
  const [gitDirtyCount, setGitDirtyCount] = useState(0);

  // Poll Git status dynamically every 5 seconds
  useEffect(() => {
    const fetchGitStatus = () => {
      fetch('/api/studio/git/status')
        .then(r => r.json())
        .then(d => {
          if (d.status === 'success') {
            setGitBranch(d.branch);
            setGitDirtyCount(d.dirty_count);
          }
        })
        .catch(e => console.error("Failed to fetch Git status:", e));
    };

    fetchGitStatus(); // Initial fetch
    const interval = setInterval(fetchGitStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const project = useProject(currentProjectId);
  const execution = useExecution();
  const stream = useStudioStream();
  const resilienceStream = useStudioStream();

  // Fetch IDE list on mount
  useEffect(() => {
    fetch('/api/studio/ide/list')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.ides) {
          setIdes(d.ides);
          if (!localStorage.getItem('mia_selected_ide') && d.ides.length > 0) {
            setSelectedIde(d.ides[0].id);
            localStorage.setItem('mia_selected_ide', d.ides[0].id);
          }
        }
      })
      .catch(e => console.error("Failed to fetch IDEs:", e));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ideDropdownRef.current && !ideDropdownRef.current.contains(e.target as Node)) {
        setShowIdeDropdown(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const refreshIdeScan = async () => {
    try {
      const response = await fetch('/api/studio/ide/list?refresh=true');
      const d = await response.json();
      if (d.status === 'success' && d.ides) {
        setIdes(d.ides);
        if (d.ides.length > 0) {
          const currentSelectionExists = d.ides.some((i: { id: string }) => i.id === selectedIde);
          if (!currentSelectionExists) {
            setSelectedIde(d.ides[0].id);
            localStorage.setItem('mia_selected_ide', d.ides[0].id);
          }
        }
      }
    } catch (e) {
      console.error("Failed to refresh IDEs:", e);
    }
  };

  const openLocalIde = async (ide_command: string) => {
    setSelectedIde(ide_command);
    localStorage.setItem('mia_selected_ide', ide_command);
    setShowIdeDropdown(false);
    try {
      await fetch('/api/studio/ide/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: currentProjectId || 'mia', ide_command })
      });
    } catch (e) {
      console.error("Failed to launch IDE:", e);
    }
  };

  // Populate prompt chat when launcher transitions to workspace
  useEffect(() => {
    if (launchPrompt) {
      setMessages([
        { role: 'user', content: launchPrompt },
        { role: 'mia', content: "Halo Bos! Saya telah memuat instruksi tersebut. Silakan buka IDE lokal Anda untuk melihat dan menyunting berkas kode, sementara saya siap mengawal proses kompilasi dan ketahanan sistem (SHAD-CSA) di panel kanan!" }
      ]);
    }
  }, [launchPrompt]);

  // WS Lifecycle Binding
  useEffect(() => {
    if (execution.state === 'STARTING' && execution.executionId && currentSessionId) {
      stream.clear();
      stream.connect(execution.executionId, false); // Graph stream
      execution.setRunning();
    }
  }, [execution, stream, currentSessionId]);

  // Handle Stream Events
  useEffect(() => {
    const lastEvent = stream.graphEvents[stream.graphEvents.length - 1];
    const lastLog = stream.logs[stream.logs.length - 1];

    if (lastEvent?.type === 'EXECUTION_END' || (lastLog && lastLog.includes('EXECUTION_END'))) {
      execution.setCompleted();
    }
  }, [stream.graphEvents, stream.logs, execution]);

  // Navigation Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (execution.state === 'RUNNING' || execution.state === 'STARTING' || execution.state === 'TERMINATING') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [execution.state]);

  // Keyboard Shortcut for Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onToggleZen?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleZen]);

  const { connect: resConnect, disconnect: resDisconnect } = resilienceStream;

  useEffect(() => {
    if (currentProjectId && currentSessionId) {
       resConnect(currentProjectId, true);
    }
    return () => resDisconnect();
  }, [resConnect, resDisconnect, currentProjectId, currentSessionId]);
  
  useProjectEvents(resilienceStream, project.refresh);

  const handleRun = async () => {
    if (execution.state === 'RUNNING' || execution.state === 'STARTING') return;
    
    const entryPath = project.metadata?.entry_point || "main.py";
    if (currentProjectId && currentSessionId) {
       await execution.runCode(currentProjectId, currentSessionId, `print('Executing sandbox for entry point: ${entryPath}')`);
    }
  };

  const handleSendPrompt = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmedInput }]);
    setInput('');

    // Simulate MIA response about writing changes to disk with Auto-Save
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { 
          role: 'mia', 
          content: `Baik Bos, instruksi "${trimmedInput}" sedang saya proses. Kode baru telah ditulis ke disk secara asinkron (Auto-Save aktif) dan disinkronkan ke editor lokal Anda. Silakan periksa IDE Anda!` 
        }
      ]);
    }, 1000);
  };

  const lastShadEvent = [...resilienceStream.graphEvents].reverse().find(e => e.type === 'SHAD_CSA_TELEMETRY');
  const rawPayload = lastShadEvent?.payload;
  const shadData = (rawPayload && typeof rawPayload === 'object')
    ? (rawPayload as ShadTelemetryPayload)
    : undefined;

  const handleBuildPromptSubmit = (prompt: string) => {
    setLaunchPrompt(prompt);
    setStudioMode('workspace');
  };

  if (studioMode === 'launcher') {
    return (
      <GardenLauncher
        projectName={project.metadata?.name || currentProjectId || 'mia'}
        onSubmit={handleBuildPromptSubmit}
        onToggleZen={onToggleZen}
      />
    );
  }

  return (
    <div 
      className="flex flex-col h-screen text-white overflow-hidden font-sans selection:bg-primary/30 surface-root relative"
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (
          target === e.currentTarget || 
          target.classList.contains('panel-toolbar') || 
          target.classList.contains('panel-workspace')
        ) {
          onToggleZen?.();
        }
      }}
    >
      <div className="adaptive-guardrail" />
      
      {/* Top Bar */}
      <div className="h-12 flex items-center justify-between px-4 z-30 select-none panel-toolbar">
        {/* Left Section: Logo & Project */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot size={14} className="text-black" />
            </div>
            <span className="text-xs font-bold tracking-widest text-white/90">MIA<span className="text-primary">AS</span></span>
          </div>
          
          <div className="h-4 w-px bg-white/10 mx-2" />
          
          <span className="text-xs font-semibold text-white/60">{project.metadata?.name || "Untitled Project"}</span>
        </div>

        {/* Center Section: Local IDE Selector */}
        <div className="flex items-center gap-3" ref={ideDropdownRef}>
          <div className="relative">
            <button 
              onClick={() => setShowIdeDropdown(!showIdeDropdown)}
              className="flex h-8 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors" 
              title="Select Local IDE"
            >
              <Monitor size={13} className="text-primary" />
              <span>IDE: {ides.find(i => i.id === selectedIde)?.name || "Select IDE"}</span>
              <ChevronDown size={12} className="opacity-50" />
            </button>
            {showIdeDropdown && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-lg border border-white/10 bg-[#171717] shadow-xl overflow-hidden z-50">
                <div className="px-3 py-2 text-[10px] font-semibold text-white/50 uppercase tracking-wider border-b border-white/10">
                  Detected Local IDEs
                </div>
                {ides.length === 0 ? (
                  <div className="px-3 py-3 text-[11px] text-white/50">No IDEs found.</div>
                ) : (
                  <div className="py-1 border-b border-white/10">
                    {ides.map(ide => (
                      <button
                        key={ide.id}
                        onClick={() => {
                          setSelectedIde(ide.id);
                          openLocalIde(ide.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <Monitor size={12} className="text-white/70" />
                        <span>{ide.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="py-1 bg-black/20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshIdeScan();
                    }}
                    className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-primary hover:text-primary-soft hover:bg-white/5 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles size={11} className="animate-pulse text-primary" />
                    Refresh Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: System Metrics & Zen */}
        <div className="flex items-center gap-4">
          {/* Git Branch & Status Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold transition-all duration-300 ${
            gitDirtyCount > 0 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-white/5 border-white/5 text-white/60'
          }`}>
            <GitBranch size={11} className={`animate-pulse ${gitDirtyCount > 0 ? 'text-amber-400' : 'text-primary'}`} />
            <span>git: <span className={gitDirtyCount > 0 ? 'text-amber-300' : 'text-white'}>{gitBranch}</span></span>
            {gitDirtyCount > 0 && (
              <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold">
                +{gitDirtyCount}
              </span>
            )}
          </div>

          <button 
            onClick={() => onToggleZen?.()}
            className="p-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/60 hover:text-primary transition-all duration-300"
            title="Zen Mode (Ctrl+Shift+Z)"
          >
            <EyeOff size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Workspace: Left Chat Cockpit + Bottom Terminal */}
        <div className="flex-1 flex flex-col relative min-w-0 p-4 gap-4">
          
          {/* Top Panel Actions */}
          <div className="h-10 flex items-center px-3 gap-4 panel-toolbar rounded-lg relative z-10 shrink-0">
            <button
              onClick={() => setStudioMode('launcher')}
              className="flex items-center gap-2 px-3 py-1 rounded-md transition-all duration-300 text-xs font-bold uppercase tracking-tight bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={14} />
              My Garden
            </button>

            <div className="w-px h-4 bg-white/10" />

            <button 
              onClick={handleRun}
              disabled={execution.state === 'RUNNING' || execution.state === 'STARTING'}
              className={clsx(
                "flex items-center gap-2 px-3 py-1 rounded-md transition-all duration-300 text-xs font-bold uppercase tracking-tight",
                execution.state === 'RUNNING' ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
              )}
            >
              <Play size={14} fill={execution.state === 'RUNNING' ? "none" : "currentColor"} />
              Run
            </button>

            <button 
              onClick={() => currentProjectId && currentSessionId && execution.stopCode(currentProjectId, currentSessionId)}
              disabled={execution.state !== 'RUNNING'}
              className={clsx(
                "flex items-center gap-2 px-3 py-1 rounded-md transition-all duration-300 text-xs font-bold uppercase tracking-tight",
                execution.state !== 'RUNNING' ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
              )}
            >
              <Square size={14} fill={execution.state !== 'RUNNING' ? "none" : "currentColor"} />
              Stop
            </button>

            <div className="w-px h-4 bg-white/10" />

            {/* Auto-Save Status Toggle Indicator */}
            <div className="flex items-center gap-2 ml-auto text-xs text-white/50">
              <span className="uppercase tracking-tight font-bold text-[10px]">Auto-Save:</span>
              <button 
                onClick={() => setAutoSave(!autoSave)} 
                className={clsx(
                  "px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all duration-300",
                  autoSave ? "bg-primary/20 text-primary border border-primary/20" : "bg-white/5 text-white/30 border border-white/10"
                )}
              >
                {autoSave ? "Active" : "Off"}
              </button>
            </div>
          </div>

          {/* Chat and Terminal Container */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 relative z-10">
            {/* Interactive Prompt & Chat Panel */}
            <div className="flex-1 flex flex-col rounded-lg overflow-hidden panel-workspace p-4 gap-3 bg-black/30 backdrop-blur-md border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-primary animate-pulse" />
                  <span className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest">MIA ARCHITECT COCKPIT</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/40 font-mono">Workspace: {currentProjectId}</span>
                  <button 
                    onClick={() => setShowWorkspaceSettings(true)}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-primary pointer-events-auto"
                    title="Workspace Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            <StudioActivityStream events={stream.graphEvents} logs={stream.logs} />
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center opacity-30">
                    <div className="text-center font-mono text-xs">
                      Mulai dengan menulis perintah di kolom prompt di bawah...
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={clsx(
                        "flex gap-3 max-w-[85%] rounded-2xl p-3 text-xs font-sans border",
                        msg.role === 'user' 
                          ? "ml-auto bg-primary/10 text-primary border-primary/10 rounded-br-none" 
                          : "bg-white/[0.03] text-white/90 border-white/5 rounded-bl-none"
                      )}
                    >
                      {msg.role === 'mia' && <Bot size={16} className="text-primary shrink-0 mt-0.5" />}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 block">
                          {msg.role === 'user' ? "Anda" : "MIA"}
                        </span>
                        <p className="leading-relaxed font-sans select-text whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Model Dropdown Anchor */}
              <div className="relative">
                {/* Active Model Selector */}
                {showModelDropdown && (
                  <div className="absolute bottom-full left-2 mb-2 w-52 rounded-xl bg-black/95 border border-white/10 shadow-2xl p-2 z-[200] space-y-1 pointer-events-auto">
                    <div className="text-[8px] uppercase font-bold text-white/30 px-2 py-1 font-mono tracking-widest border-b border-white/5 mb-1">SELECT INTEL</div>
                    <button
                      onClick={() => handleSelectOverrideModel('auto')}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-mono transition-all flex items-center justify-between ${
                        activeOverride === 'auto'
                          ? 'bg-primary/20 text-primary border border-primary/20 font-bold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>🤖 DYNAMIC ROUTING</span>
                    </button>
                    {Object.entries(config?.providers ?? {}).map(([name, p]: [string, ProviderConfig]) => (
                      <button
                        key={name}
                        onClick={() => handleSelectOverrideModel(name)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-mono transition-all flex items-center justify-between ${
                          activeOverride === name
                            ? 'bg-primary/20 text-primary border border-primary/20 font-bold'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">{name}</span>
                          <span className="text-[7px] text-white/30 truncate max-w-[120px]">{p.model_id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <StudioComposer
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSendPrompt}
                  onStop={() => currentProjectId && currentSessionId && execution.stopCode(currentProjectId, currentSessionId)}
                  running={execution.state === 'RUNNING'}
                  autoReview={autoReview}
                  onAutoReviewChange={setAutoReview}
                  modelName={activeModelName}
                  onModelClick={() => setShowModelDropdown(!showModelDropdown)}
                  changedFilesCount={gitDirtyCount}
                />
              </div>
            </div>
            
            {/* Studio Terminal */}
            <div className="h-[30%] min-h-[140px]">
              <StudioTerminal logs={stream.logs} />
            </div>
          </div>
        </div>

        {/* Right Panel: Graph & Info */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0 relative z-10 p-4 pl-0">
          <div className="flex-1 rounded-lg overflow-hidden panel-workspace">
            <GraphViewer events={stream.graphEvents} />
          </div>

          {/* Resilience Monitor Section */}
          <ReviewChanges
            branch={gitBranch}
            dirtyCount={gitDirtyCount}
            onFollowUp={() => setInput('Review perubahan terakhir dan usulkan langkah berikutnya.')}
          />

          {/* Resilience Monitor Section */}
          <ResilienceMonitor 
            health={shadData?.snapshot?.health_score ?? 1.0}
            mode={shadData?.snapshot?.mode ?? 'NORMAL'}
            nodes={shadData?.nodes ?? []}
            suggestions={shadData?.suggestions ?? []}
            projectId={currentProjectId ?? "default"}
          />
           
            {/* Active Transformation Task Planner */}
            <div className="p-4 surface-floating rounded-lg">
               <div className="flex items-center justify-between mb-4 cursor-pointer select-none" onClick={() => setShowTaskPlanner(!showTaskPlanner)}>
                 <div className="flex items-center gap-2">
                   <CheckSquare size={14} className="text-primary" />
                   <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] font-mono">TASK PLANNER</h4>
                 </div>
                 <span className="text-[10px] text-white/40 font-mono">{tasks.filter(t => t.done).length}/{tasks.length}</span>
               </div>
               
               {showTaskPlanner && (
                 <div className="space-y-2.5 animate-slide-up">
                   {tasks.map(t => (
                     <div key={t.id} className="flex items-start gap-2 select-none cursor-pointer" onClick={() => toggleTask(t.id)}>
                       <input 
                         type="checkbox" 
                         checked={t.done} 
                         onChange={() => {}} 
                         className="accent-primary w-3.5 h-3.5 cursor-pointer rounded mt-0.5" 
                       />
                       <span className={clsx(
                         "text-[9px] font-mono leading-relaxed",
                         t.done ? "line-through text-white/20" : "text-white/80"
                       )}>
                         {t.text}
                       </span>
                     </div>
                   ))}
                 </div>
               )}
            </div>

           {/* Live Synchronization Info Card */}
           <div className="p-4 surface-floating rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary motion-ambient" />
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">IDE Cockpit Link</h4>
              </div>
              
              <div className="space-y-3">
                 <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/30 uppercase font-bold">Connected Project</span>
                    <span className="text-xs text-white/80 font-mono truncate bg-white/5 px-2 py-1 rounded">{project.metadata?.name}</span>
                 </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/30 uppercase font-bold">Active Kernel State</span>
                    <span className={clsx(
                      "text-[10px] font-black px-2 py-0.5 rounded-full w-fit",
                      execution.state === 'RUNNING' ? "bg-green-500/20 text-green-400" : 
                      execution.state === 'ERROR' ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/60"
                    )}>
                      {execution.state}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <StudioBottomBar 
        branch={gitBranch} 
        errors={execution.state === 'ERROR' ? 1 : 0} 
        isSecure={true}
      />

      {/* Floating Slide-over Workspace Settings Drawer */}
      {showWorkspaceSettings && (
        <div className="fixed inset-y-0 right-0 w-96 bg-black/95 border-l border-white/10 backdrop-blur-3xl p-8 z-[1000] shadow-2xl animate-fade-in custom-scrollbar overflow-y-auto space-y-6 pointer-events-auto">
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2 uppercase tracking-widest">
              <Settings className="text-primary" size={18} />
              Setelan Workspace
            </h2>
            <button 
              onClick={() => setShowWorkspaceSettings(false)}
              className="px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-mono font-bold text-white transition-colors"
            >
              TUTUP
            </button>
          </div>

          {/* Abilities and Skills section */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-primary font-mono border-b border-primary/20 pb-1">1. Abilities & Skills</h3>
            <div className="space-y-3">
              {skills.map((skill: Skill) => (
                <div key={skill.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 font-sans space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-black text-white font-mono">{skill.name}</span>
                    <span className="text-[8px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">ACTIVE</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">{skill.description}</p>
                </div>
              ))}
              {skills.length === 0 && (
                <div className="text-[10px] font-mono text-white/30 italic text-center py-4">
                  Belum ada skill otonom yang terpasang.
                </div>
              )}
            </div>
          </div>

          {/* Resilience Audit Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-primary font-mono border-b border-primary/20 pb-1">2. Resilience Audit</h3>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 font-sans space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/60">System Resilience Score</span>
                <span className="text-xs font-black text-green-400 font-mono">100% HEALTHY</span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">Seluruh stasiun router intelijen beroperasi normal. Tidak ada anomali memori atau kebocoran state terdeteksi.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
