import { Paperclip, Send, Square } from 'lucide-react';
import clsx from 'clsx';

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
}: StudioComposerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/50">
        <span className="font-mono uppercase tracking-[0.18em]">{changedFilesCount} changed files</span>
        <span className="font-mono uppercase tracking-[0.18em]">approval queue clear</span>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/35 p-2">
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
          placeholder="Tulis follow-up task untuk Studio..."
          className="min-h-16 w-full resize-none bg-transparent px-2 py-2 text-xs text-white outline-none placeholder:text-white/25"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Attach file"
            >
              <Paperclip size={14} />
            </button>
            <button
              onClick={onModelClick}
              className="h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-white/10"
            >
              {modelName}
            </button>
            <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
              <input
                type="checkbox"
                checked={autoReview}
                onChange={(event) => onAutoReviewChange(event.target.checked)}
                className="accent-primary"
              />
              Auto-review
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onStop}
              disabled={!running}
              className={clsx(
                "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                running ? "bg-red-500/15 text-red-300 hover:bg-red-500/25" : "bg-white/5 text-white/20"
              )}
            >
              <Square size={12} />
              Stop
            </button>
            <button
              onClick={onSubmit}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-[10px] font-black uppercase tracking-[0.14em] text-black transition-transform hover:scale-[1.02]"
            >
              <Send size={12} fill="currentColor" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
