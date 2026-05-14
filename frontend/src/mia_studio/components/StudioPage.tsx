import React, { useEffect } from 'react';
import { ArrowLeft, Play, Square, Save, EyeOff } from 'lucide-react';
import { useExecution } from '../hooks/useExecution';
import { useStudioStream } from '../hooks/useStudioStream';
import { useProject, useProjectEvents } from '../hooks/useProject';
import { useTabs } from '../hooks/useTabs';
import { useFileStore } from '../context/FileStoreContext';
import { useDraft } from '../hooks/useDraft';
import { MonacoEditor } from './MonacoEditor';
import { StudioTerminal } from './StudioTerminal';
import { GraphViewer } from './GraphViewer';
import { StudioFileTree } from './StudioFileTree';
import { StudioTabs } from './StudioTabs';
import { ImpactModal } from './ImpactModal';
import { StudioTopbar } from './StudioTopbar';
import { StudioSidebar } from './StudioSidebar';
import { StudioBottomBar } from './StudioBottomBar';
import { ResilienceMonitor } from './ResilienceMonitor';
import { GardenLauncher } from './GardenLauncher';
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

export interface StudioPageProps {
  onToggleZen?: () => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({ onToggleZen }) => {
  const { currentProjectId, currentSessionId } = useFileStore();
  const [studioMode, setStudioMode] = React.useState<'launcher' | 'workspace'>('launcher');
  const [launchPrompt, setLaunchPrompt] = React.useState('');

  const [impactModal, setImpactModal] = React.useState<{
    isOpen: boolean;
    severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
    reason: string;
    impactedFiles: string[];
    operation: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    severity: 'LOW',
    reason: '',
    impactedFiles: [],
    operation: '',
    onConfirm: () => {}
  });

  const project = useProject(currentProjectId);
  const tabs = useTabs();
  const fileStore = useFileStore();
  const draftController = useDraft();
  
  const execution = useExecution();
  const stream = useStudioStream();
  const resilienceStream = useStudioStream();

  // Patch FE-1 & FE-3: WS Lifecycle Binding
  useEffect(() => {
    if (execution.state === 'STARTING' && execution.executionId && currentSessionId) {
      stream.clear();
      stream.connect(execution.executionId, false); // Graph stream
      execution.setRunning();
    }
  }, [execution, stream, currentSessionId]);

  // Handle Stream Events for State Machine
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

  const handleFileOpen = async (path: string) => {
    tabs.openTab(path);
    if (!fileStore.files[path] && currentSessionId) {
      await draftController.loadFile(path);
    }
  };

  const handleFileDelete = async (path: string, confirmed: boolean = false) => {
    try {
      const res = await fetch('/api/studio/file/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSessionId, path, confirmed, check_only: !confirmed })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        if (!confirmed) {
          // Check severity from impact data
          const impact = data.impact;
          if (impact.severity === 'CRITICAL' || impact.severity === 'MEDIUM') {
            setImpactModal({
              isOpen: true,
              severity: impact.severity,
              reason: impact.reason,
              impactedFiles: impact.impacted_files,
              operation: 'Delete',
              onConfirm: () => handleFileDelete(path, true)
            });
            return;
          }
          // LOW severity -> Proceed to delete immediately
          await handleFileDelete(path, true);
        } else {
          setImpactModal(p => ({ ...p, isOpen: false }));
          tabs.closeTab(path);
          project.refresh();
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleFileRename = async (path: string, confirmed: boolean = false) => {
    const newName = window.prompt("New name:", path.split('/').pop());
    if (!newName) return;
    const newPath = path.replace(/[^/]+$/, newName);

    try {
      const res = await fetch('/api/studio/file/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSessionId, old_path: path, new_path: newPath, confirmed, check_only: !confirmed })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        if (!confirmed) {
          const impact = data.impact;
          if (impact.severity === 'CRITICAL' || impact.severity === 'MEDIUM') {
            setImpactModal({
              isOpen: true,
              severity: impact.severity,
              reason: impact.reason,
              impactedFiles: impact.impacted_files,
              operation: 'Rename',
              onConfirm: () => handleFileRename(path, true)
            });
            return;
          }
          // Proceed rename
          await handleFileRename(path, true);
        } else {
          setImpactModal(p => ({ ...p, isOpen: false }));
          tabs.closeTab(path);
          handleFileOpen(newPath);
          project.refresh();
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Rename failed", err);
    }
  };

  const handleSaveActive = async () => {
    if (tabs.activeTab && currentSessionId) {
      const file = fileStore.files[tabs.activeTab];
      if (file && file.isDirty) {
        await draftController.saveFile(tabs.activeTab, file.content);
      }
    }
  };

  const { connect: resConnect, disconnect: resDisconnect } = resilienceStream;

  useEffect(() => {
    // Connect to system resilience feed on mount (P4-X: isSystem = true)
    if (currentProjectId && currentSessionId) {
       resConnect(currentProjectId, true);
    }
    return () => resDisconnect();
  }, [resConnect, resDisconnect, currentProjectId, currentSessionId]);
  
  // Patch C: Integrate unified project events
  useProjectEvents(resilienceStream, project.refresh);

  const handleRun = async () => {
    if (execution.state === 'RUNNING' || execution.state === 'STARTING') return;
    
    // Save all dirty files before run (P2 requirement hardened)
    const dirtyFiles = Object.entries(fileStore.files).filter(([, f]) => f.isDirty);
    for (const [path, file] of dirtyFiles) {
      await draftController.saveFile(path, file.content);
    }

    // Run entry point
    const entryPath = project.metadata?.entry_point || "main.py";
    const entryFile = fileStore.files[entryPath];
    if (currentSessionId) {
       await execution.runCode(currentSessionId, entryFile?.content || "");
    }
  };

  // Extract SHAD-CSA Data from resilience stream
  const lastShadEvent = [...resilienceStream.graphEvents].reverse().find(e => e.type === 'SHAD_CSA_TELEMETRY');
  const rawPayload = lastShadEvent?.payload;
  const shadData = (rawPayload && typeof rawPayload === 'object')
    ? (rawPayload as ShadTelemetryPayload)
    : undefined;

  const activeFile = tabs.activeTab ? fileStore.files[tabs.activeTab] : null;

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
        // Trigger Zen Mode on empty areas
        if (
          target === e.currentTarget || 
          target.classList.contains('panel-toolbar') || 
          target.classList.contains('panel-workspace') ||
          (target.closest('.panel-workspace') && !tabs.activeTab)
        ) {
          onToggleZen?.();
        }
      }}
    >
      <div className="adaptive-guardrail" />
      {/* Top Bar */}
      <StudioTopbar 
        projectName={project.metadata?.name || "Untitled Project"} 
        systemStatus="HEALTHY" 
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Integrated Sidebar & Explorer */}
        <StudioSidebar title="Explorer">
          <StudioFileTree 
            files={project.files} 
            onFileClick={handleFileOpen} 
            onFileRename={handleFileRename}
            onFileDelete={handleFileDelete}
            activePath={tabs.activeTab || undefined} 
          />
        </StudioSidebar>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Tab System */}
          <StudioTabs 
            tabs={tabs.openTabs} 
            activeTab={tabs.activeTab} 
            onTabClick={tabs.setActiveTab} 
            onTabClose={tabs.closeTab} 
          />

          {/* Action Bar (Refactored from old sidebar) */}
          <div className="h-10 flex items-center px-4 gap-4 panel-toolbar relative z-10">
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
              disabled={execution.state !== 'IDLE' && execution.state !== 'COMPLETED' && execution.state !== 'ERROR'}
              className={clsx(
                "flex items-center gap-2 px-3 py-1 rounded-md transition-all duration-300 text-xs font-bold uppercase tracking-tight",
                execution.state === 'RUNNING' ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
              )}
            >
              <Play size={14} fill={execution.state === 'RUNNING' ? "none" : "currentColor"} />
              Run
            </button>

            <button 
              onClick={() => currentSessionId && execution.stopCode(currentSessionId)}
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

            <button 
              onClick={handleSaveActive}
              className={clsx(
                "flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-tight relative motion-hover",
                activeFile?.isDirty ? "bg-primary/10 text-primary hover:bg-primary hover:text-black" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
              )}
            >
              <Save size={14} />
              Save
              {activeFile?.isDirty && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full motion-ambient" />}
            </button>

            <div className="w-px h-4 bg-white/10" />

            <button 
              onClick={() => onToggleZen?.()}
              className="flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-tight bg-white/5 text-white/40 hover:bg-white/10 hover:text-primary motion-hover"
              title="Zen Mode (Ctrl+Shift+Z)"
            >
              <EyeOff size={14} />
              Zen Mode
            </button>


            {launchPrompt && (
              <div className="ml-auto min-w-0 max-w-[42%] truncate rounded-md bg-white/5 px-3 py-1 text-[11px] font-medium text-white/45">
                Build prompt: {launchPrompt}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            {/* Left: Editor & Terminal */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 relative z-10">
              <div className="flex-1 relative rounded-lg overflow-hidden panel-workspace">
                {tabs.activeTab ? (
                  <MonacoEditor 
                    code={activeFile?.content || ""} 
                    onChange={val => fileStore.updateFile(tabs.activeTab!, val || '')} 
                    isLoading={project.isLoading} 
                  />
                ) : (
                  <div className="flex-1 h-full flex items-center justify-center text-white/5 uppercase tracking-tighter text-4xl font-black select-none italic">
                    MIA ARCHITECT
                  </div>
                )}
              </div>
              
              <div className="h-[30%] min-h-[150px]">
                <StudioTerminal logs={stream.logs} />
              </div>
            </div>

            {/* Right Panel: Graph & Info */}
            <div className="w-80 flex flex-col gap-4 flex-shrink-0 relative z-10">
              <div className="flex-1 rounded-lg overflow-hidden panel-workspace">
                <GraphViewer events={stream.graphEvents} />
              </div>

              {/* Resilience Monitor Section */}
              <ResilienceMonitor 
                health={shadData?.snapshot?.health_score ?? 1.0}
                mode={shadData?.snapshot?.mode ?? 'NORMAL'}
                nodes={shadData?.nodes ?? []}
                suggestions={shadData?.suggestions ?? []}
                projectId={fileStore.currentProjectId ?? "default"}
              />
               
               {/* Hardened Project Metadata Card */}
               <div className="p-4 surface-floating rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-primary motion-ambient" />
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Live Synchronization</h4>
                  </div>
                  
                  <div className="space-y-3">
                     <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-white/30 uppercase font-bold">Project Authority</span>
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
        </div>
      </div>

      {/* Bottom Bar */}
      <StudioBottomBar 
        branch="architecture-v2" 
        errors={execution.state === 'ERROR' ? 1 : 0} 
        isSecure={true}
      />

      <ImpactModal 
        isOpen={impactModal.isOpen}
        onClose={() => setImpactModal(p => ({ ...p, isOpen: false }))}
        onConfirm={impactModal.onConfirm}
        severity={impactModal.severity}
        reason={impactModal.reason}
        impactedFiles={impactModal.impactedFiles}
        operation={impactModal.operation}
      />
    </div>
  );

};
