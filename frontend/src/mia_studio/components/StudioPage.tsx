import React, { useEffect } from 'react';
import { Play, Square, Save, ShieldCheck } from 'lucide-react';
import { useExecution } from '../hooks/useExecution';
import { useStudioStream } from '../hooks/useStudioStream';
import { useProject } from '../hooks/useProject';
import { useTabs } from '../hooks/useTabs';
import { useFileStore } from '../context/FileStoreContext';
import { useDraft } from '../hooks/useDraft';
import { MonacoEditor } from './MonacoEditor';
import { StudioTerminal } from './StudioTerminal';
import { GraphViewer } from './GraphViewer';
import { StudioFileTree } from './StudioFileTree';
import { StudioTabs } from './StudioTabs';
import { ImpactModal } from './ImpactModal';
import clsx from 'clsx';

export const StudioPage: React.FC = () => {
  const sessionId = "session_dev_001";
  const projectId = "default_project";

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

  const project = useProject(projectId);
  const tabs = useTabs();
  const fileStore = useFileStore();
  const draftController = useDraft();
  
  const execution = useExecution();
  const stream = useStudioStream();

  // Patch FE-1 & FE-3: WS Lifecycle Binding
  useEffect(() => {
    if (execution.state === 'STARTING' && execution.executionId) {
      stream.clear();
      stream.connect(execution.executionId, sessionId);
      execution.setRunning();
    }
  }, [execution, stream, sessionId]);

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

  const handleFileOpen = async (path: string) => {
    tabs.openTab(path);
    if (!fileStore.files[path]) {
      await draftController.loadFile(path, sessionId);
    }
  };

  const handleFileDelete = async (path: string, confirmed: boolean = false) => {
    try {
      const res = await fetch('/api/studio/file/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, path, confirmed, check_only: !confirmed })
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
        body: JSON.stringify({ session_id: sessionId, old_path: path, new_path: newPath, confirmed, check_only: !confirmed })
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
    if (tabs.activeTab) {
      const file = fileStore.files[tabs.activeTab];
      if (file && file.isDirty) {
        await draftController.saveFile(tabs.activeTab, file.content, sessionId);
      }
    }
  };

  const handleRun = async () => {
    if (execution.state === 'RUNNING' || execution.state === 'STARTING') return;
    
    // Save all dirty files before run (P2 requirement hardened)
    const dirtyFiles = Object.entries(fileStore.files).filter(([, f]) => f.isDirty);
    for (const [path, file] of dirtyFiles) {
      await draftController.saveFile(path, file.content, sessionId);
    }

    // Run entry point
    const entryPath = project.metadata?.entry_point || "main.py";
    const entryFile = fileStore.files[entryPath];
    await execution.runCode(sessionId, entryFile?.content || "");
  };

  const activeFile = tabs.activeTab ? fileStore.files[tabs.activeTab] : null;

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar Control */}
      <div className="w-16 flex flex-col items-center py-6 border-r border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl z-20">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
          <ShieldCheck size={24} className="text-white" />
        </div>

        <div className="flex flex-col gap-6">
          <button 
            onClick={handleRun}
            disabled={execution.state !== 'IDLE' && execution.state !== 'COMPLETED' && execution.state !== 'ERROR'}
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              execution.state === 'RUNNING' ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
            )}
            title="Run Project"
          >
            <Play size={20} fill={execution.state === 'RUNNING' ? "none" : "currentColor"} />
          </button>

          <button 
            onClick={() => execution.stopCode(sessionId)}
            disabled={execution.state !== 'RUNNING'}
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              execution.state !== 'RUNNING' ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
            )}
            title="Force Stop"
          >
            <Square size={20} fill={execution.state !== 'RUNNING' ? "none" : "currentColor"} />
          </button>

          <div className="w-8 h-px bg-white/5 my-2" />

          <button 
            onClick={handleSaveActive}
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative",
              activeFile?.isDirty ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white" : "bg-white/5 text-white/40"
            )}
            title="Save Active Tab"
          >
            <Save size={20} />
            {activeFile?.isDirty && <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0a0a0a] animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Phase 3: File Explorer (View Layer) */}
      <StudioFileTree 
        files={project.files} 
        onFileClick={handleFileOpen} 
        onFileRename={handleFileRename}
        onFileDelete={handleFileDelete}
        activePath={tabs.activeTab || undefined} 
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col relative">
        {/* Tab System */}
        <StudioTabs 
          tabs={tabs.openTabs} 
          activeTab={tabs.activeTab} 
          onTabClick={tabs.setActiveTab} 
          onTabClose={tabs.closeTab} 
        />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Left: Editor */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 relative">
              {tabs.activeTab ? (
                <MonacoEditor 
                  code={activeFile?.content || ""} 
                  onChange={val => fileStore.updateFile(tabs.activeTab!, val || '')} 
                  isLoading={project.isLoading} 
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]/30 rounded-xl border border-white/5 text-white/10 uppercase tracking-tighter text-4xl font-bold select-none">
                  MIA Architect
                </div>
              )}
            </div>
            
            <div className="h-1/3 min-h-[200px]">
              <StudioTerminal logs={stream.logs} />
            </div>
          </div>

          {/* Right: Graph */}
          <div className="w-1/3 min-w-[350px] flex flex-col gap-4">
             <GraphViewer events={stream.graphEvents} />
             
             {/* Project Info Card */}
             <div className="p-4 bg-white/5 border border-white/5 rounded-lg">
                <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Project: {project.metadata?.name}</h4>
                <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                      <span className="text-white/40">Entry Point</span>
                      <span className="text-blue-400 font-mono">{project.metadata?.entry_point}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-white/40">Status</span>
                      <span className={clsx("font-bold", execution.state === 'RUNNING' ? "text-green-500" : "text-white/60")}>
                        {execution.state}
                      </span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
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
