import { useEffect, useMemo, useState } from 'react';
import { FileText, GitCompareArrows, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';

interface ReviewChangesProps {
  branch: string;
  dirtyCount: number;
  onFollowUp: () => void;
}

interface ChangedFile {
  status: string;
  path: string;
}

export function ReviewChanges({ branch, dirtyCount, onFollowUp }: ReviewChangesProps) {
  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('');

  const displayFiles = useMemo(() => files.slice(0, 6), [files]);

  const loadChanges = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studio/tools/changed-files');
      const data = await res.json();
      const nextFiles = data.status === 'success' ? data.files || [] : [];
      setFiles(nextFiles);
      const nextPath = nextFiles[0]?.path || '';
      setSelectedPath((current) => current || nextPath);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, [dirtyCount]);

  useEffect(() => {
    const loadDiff = async () => {
      try {
        const query = selectedPath ? `?path=${encodeURIComponent(selectedPath)}` : '';
        const res = await fetch(`/api/studio/tools/diff${query}`);
        const data = await res.json();
        setDiff(data.status === 'success' ? data.diff || '' : data.message || '');
      } catch {
        setDiff('Diff tidak bisa dimuat.');
      }
    };
    loadDiff();
  }, [selectedPath, dirtyCount]);

  const runVerification = async () => {
    setVerifyStatus('Running frontend build...');
    try {
      const res = await fetch('/api/studio/tools/run-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'frontend' }),
      });
      const data = await res.json();
      setVerifyStatus(data.status === 'success' ? 'Frontend build passed.' : data.message || data.stderr || 'Verification failed.');
    } catch {
      setVerifyStatus('Verification failed to start.');
    }
  };

  const handleUndo = async () => {
    if (!confirm('Are you sure you want to revert uncommitted changes? This action cannot be undone.')) {
      return;
    }
    setVerifyStatus('Reverting changes...');
    try {
      const res = await fetch('/api/studio/tools/revert-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedPath || null }), // if we want to revert a specific file or all files. But let's revert all files for now if no specific path, wait, let's just pass nothing to revert all. Actually, let's send path if selected.
      });
      const data = await res.json();
      if (data.status === 'success') {
        setVerifyStatus('Changes reverted successfully.');
        loadChanges();
      } else {
        setVerifyStatus(`Revert failed: ${data.message}`);
      }
    } catch {
      setVerifyStatus('Revert request failed.');
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitCompareArrows size={15} className="text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Review Changes</h3>
        </div>
        <button
          onClick={loadChanges}
          className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[9px] font-mono text-white/50 hover:text-white"
          title="Refresh changed files"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {branch}
        </button>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70">Working tree</span>
          <span className={dirtyCount > 0 ? 'text-amber-300' : 'text-green-300'}>
            {dirtyCount > 0 ? `${dirtyCount} file(s) changed` : 'No changes'}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {displayFiles.length === 0 ? (
            <div className="rounded-md border border-white/5 bg-black/20 p-3 text-[10px] text-white/35">
              Working tree clean or no git diff available.
            </div>
          ) : (
            displayFiles.map((file) => (
              <button
                key={`${file.status}-${file.path}`}
                onClick={() => setSelectedPath(file.path)}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[10px] transition-colors ${
                  selectedPath === file.path
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-white/5 bg-black/20 text-white/55 hover:bg-white/5'
                }`}
                title={file.path}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <FileText size={11} />
                  <span className="truncate">{file.path}</span>
                </span>
                <span className="font-mono text-white/35">{file.status || 'M'}</span>
              </button>
            ))
          )}
        </div>

        <div className="mt-3 h-28 overflow-auto rounded-md border border-white/5 bg-black/25 p-3 font-mono text-[10px] leading-relaxed text-white/45 custom-scrollbar">
          {diff ? diff.slice(0, 5000) : 'No diff selected.'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={handleUndo}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title="Revert selected or all uncommitted changes"
        >
          <RotateCcw size={12} />
          Undo
        </button>
        <button
          onClick={runVerification}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-green-400/20 bg-green-400/10 px-2 py-2 text-[10px] font-bold text-green-300"
        >
          <ShieldCheck size={12} />
          Verify
        </button>
        <button
          onClick={onFollowUp}
          className="rounded-md border border-primary/20 bg-primary/10 px-2 py-2 text-[10px] font-bold text-primary"
        >
          Follow-up
        </button>
      </div>
      {verifyStatus && (
        <div className="mt-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/55">
          {verifyStatus}
        </div>
      )}
    </div>
  );
}
