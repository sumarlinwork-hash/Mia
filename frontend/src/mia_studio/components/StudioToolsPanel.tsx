import React, { useState } from 'react';
import { Sparkles, Camera, Monitor, Search, Terminal, ShieldCheck } from 'lucide-react';

interface StudioToolsPanelProps {
  projectId?: string;
}

export const StudioToolsPanel: React.FC<StudioToolsPanelProps> = ({ projectId }) => {
  const [url, setUrl] = useState('http://localhost:3000');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [screenshotPath, setScreenshotPath] = useState<string>('');
  const [consoleOutput, setConsoleOutput] = useState<string>('');

  const serverProject = projectId || 'default';

  const clearStatus = () => {
    setError('');
    setResult('');
  };

  const handleApi = async (path: string, options: RequestInit = {}) => {
    setLoading(true);
    clearStatus();
    setConsoleOutput('');
    setScreenshotPath('');

    try {
      const res = await fetch(path, options);
      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        setError(data.message || JSON.stringify(data));
        return;
      }

      if (data.result) {
        const payload = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
        setResult(payload);
      } else if (data.message) {
        setResult(data.message);
      } else if (data.file) {
        setScreenshotPath(data.file);
        setResult('Screenshot captured successfully.');
      } else {
        setResult(JSON.stringify(data, null, 2));
      }

      if (data.file) {
        setScreenshotPath(data.file);
      }

      if (path.includes('read-console')) {
        setConsoleOutput(JSON.stringify(data.result || {}, null, 2));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const openLocalUrl = async () => {
    await handleApi('/api/studio/tools/open-local-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, project_id: serverProject }),
    });
  };

  const inspectPage = async () => {
    await handleApi(`/api/studio/tools/inspect-page?url=${encodeURIComponent(url)}&project_id=${encodeURIComponent(serverProject)}`);
  };

  const captureScreenshot = async () => {
    await handleApi('/api/studio/tools/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: serverProject }),
    });
  };

  const readConsole = async () => {
    await handleApi(`/api/studio/tools/read-console?url=${encodeURIComponent(url)}&project_id=${encodeURIComponent(serverProject)}`);
  };

  return (
    <div className="p-4 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-primary" />
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.23em] text-white/70 font-bold">Studio Browser Tools</h3>
          <p className="text-[10px] text-white/40">Fast verification and local app checks for your running workspace.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-[0.22em] text-white/40">Local URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button"
            onClick={openLocalUrl}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Monitor size={14} />
            Open URL
          </button>

          <button type="button"
            onClick={inspectPage}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search size={14} />
            Inspect Page
          </button>

          <button type="button"
            onClick={captureScreenshot}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera size={14} />
            Screenshot
          </button>

          <button type="button"
            onClick={readConsole}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Terminal size={14} />
            Read Console
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[10px] text-white/70 min-h-[120px] overflow-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center gap-2 text-white/70">
              <span className="animate-pulse">Processing action...</span>
            </div>
          ) : error ? (
            <div className="text-rose-300 flex items-start gap-2">
              <ShieldCheck size={14} />
              <div>
                <div className="font-semibold text-white">Action failed</div>
                <div>{error}</div>
              </div>
            </div>
          ) : (
            <>
              {result && (
                <div className="space-y-2">
                  <div className="font-semibold text-white text-[10px] uppercase tracking-[0.22em]">Result</div>
                  <div className="whitespace-pre-wrap break-words text-[11px] text-white/80">{result}</div>
                </div>
              )}
              {screenshotPath && (
                <div className="mt-3 text-[10px] text-white/40">
                  Screenshot path: <span className="text-white/80 break-all">{screenshotPath}</span>
                </div>
              )}
              {consoleOutput && (
                <div className="mt-3 space-y-1">
                  <div className="font-semibold text-white text-[10px] uppercase tracking-[0.22em]">Console output</div>
                  <pre className="rounded-xl bg-black/40 p-2 text-[10px] text-white/70 overflow-auto custom-scrollbar">{consoleOutput}</pre>
                </div>
              )}
              {!result && !screenshotPath && !consoleOutput && (
                <div className="text-[10px] text-white/30">Choose an action to inspect your local app or capture a screenshot.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
