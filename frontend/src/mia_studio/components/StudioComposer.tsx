import { Paperclip, Send, Square, Mic, GitBranch, Folder, Play, CheckCircle2, XCircle, Box, Puzzle } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

interface StudioComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  running: boolean;
  autoReview: boolean;
  onAutoReviewChange: (value: boolean) => void;
  modelName: string;
  onModelClick: () => void;
  changedFilesCount: number;
  pendingApprovalsCount: number;
  gitBranch?: string;
  environmentStatus?: 'ok' | 'error';
  currentProject?: string;
  onStarterAction?: (action: string) => void;
}

export function StudioComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  running,
  autoReview,
  onAutoReviewChange,
  modelName,
  onModelClick,
  changedFilesCount,
  pendingApprovalsCount,
  gitBranch = 'main',
  environmentStatus = 'ok',
  currentProject = 'mia',
  onStarterAction
}: StudioComposerProps) {
  const [isRecording, setIsRecording] = useState(false);

  const starterActions = [
    { id: 'think', label: 'Think of a suitable starter task...', icon: Puzzle },
    { id: 'explain', label: 'Explain this project to me', icon: Box },
    { id: 'connect', label: 'Connect your favorite apps...', icon: Play },
  ];

  const showStarterActions = !value && !running && changedFilesCount === 0;

  return (
    <div className="space-y-2">
      {/* Change Summary Indicator */}
      {(changedFilesCount > 0 || pendingApprovalsCount > 0) && (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/50">
          <span className="font-mono uppercase tracking-[0.18em]">
            {changedFilesCount > 0 ? `${changedFilesCount} changed files` : 'Working tree clean'}
          </span>
          <span className={`font-mono uppercase tracking-[0.18em] ${pendingApprovalsCount > 0 ? 'text-yellow-400' : 'text-white/50'}`}>
            {pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approval${pendingApprovalsCount > 1 ? 's' : ''}` : 'approval queue clear'}
          </span>
        </div>
      )}

      {/* Starter Actions */}
      {showStarterActions && (
        <div className="flex flex-wrap gap-2 mb-2">
          {starterActions.map((action) => (
            <button type="button"
              key={action.id}
              onClick={() => onStarterAction?.(action.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-[11px] text-white/50 hover:bg-white/[0.06] hover:text-white/90 hover:border-white/20 transition-all group"
            >
              <action.icon size={12} className="text-white/30 group-hover:text-primary transition-colors" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-2 shadow-2xl relative">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          placeholder="Tulis instruksi task atau follow-up untuk Studio..."
          className="min-h-16 w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/25"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
          <div className="flex items-center gap-2">
            <button type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Attach context or file"
            >
              <Paperclip size={14} />
            </button>
            <button type="button"
              onClick={() => setIsRecording(!isRecording)}
              className={clsx(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                isRecording 
                  ? "border-red-500/50 bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              )}
              title="Voice Input"
            >
              <Mic size={14} />
            </button>
            <button type="button"
              onClick={onModelClick}
              className="h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-white/10"
              title="Select Execution Model"
            >
              {modelName}
            </button>
            <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={autoReview}
                onChange={(event) => onAutoReviewChange(event.target.checked)}
                className="accent-primary w-3 h-3"
              />
              Auto-review
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button type="button"
              onClick={onStop}
              disabled={!running}
              className={clsx(
                "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                running ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25" : "bg-white/5 border border-white/5 text-white/20"
              )}
            >
              <Square size={12} className={running ? "animate-pulse" : ""} />
              Stop
            </button>
            <button type="button"
              onClick={onSubmit}
              disabled={!value.trim() && !running}
              className={clsx(
                "inline-flex h-8 items-center gap-2 rounded-lg px-4 text-[10px] font-black uppercase tracking-[0.14em] transition-all",
                value.trim() || running
                  ? "bg-primary text-black hover:scale-[1.02] shadow-[0_0_15px_rgba(208,255,0,0.3)]"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              )}
            >
              <Send size={12} fill="currentColor" />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Context Row below Composer */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/30 border border-white/5 text-[10px] font-medium text-white/50 cursor-pointer hover:bg-white/5 hover:text-white/80 transition-colors">
          <Folder size={12} className="text-white/30" />
          {currentProject}
          <span className="opacity-50 mx-1">/</span>
        </div>
        
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/30 border border-white/5 text-[10px] font-mono text-cyan-400/80 cursor-pointer hover:bg-white/5 hover:text-cyan-300 transition-colors">
          <Play size={10} fill="currentColor" />
          LOCAL
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/30 border border-white/5 text-[10px] font-mono text-white/50 cursor-pointer hover:bg-white/5 hover:text-white/80 transition-colors">
          <GitBranch size={12} className="text-white/30" />
          {gitBranch}
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/30 border border-white/5 text-[10px] font-medium text-white/50" title="Environment Health">
          {environmentStatus === 'ok' ? (
            <CheckCircle2 size={12} className="text-green-500/80" />
          ) : (
            <XCircle size={12} className="text-red-500/80" />
          )}
          <span>Node v20.x</span>
        </div>
      </div>
    </div>
  );
}

