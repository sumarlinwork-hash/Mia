import { useState, useEffect } from 'react';
import { Activity, Clock, Server, Terminal, RefreshCw } from 'lucide-react';

interface CroneJob {
  id: string;
  name: string;
  status: string;
  next_run: string;
  trigger: string;
  description: string;
  cost: string;
  color: string;
}

interface CroneStatus {
  scheduler_running: boolean;
  jobs: CroneJob[];
  server_time: string;
}

export default function Crone() {
  const [status, setStatus] = useState<CroneStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/crone/status');
      const data = await res.json();
      setStatus(data);
      setLastRefresh(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error('[Crone] Failed to fetch status:', e);
    } finally {
      setLoading(false);
    }
  };

  const controlJob = async (id: string, action: 'pause' | 'resume' | 'trigger') => {
    try {
      await fetch(`http://localhost:8000/api/crone/${action}/${id}`, { method: 'POST' });
      fetchStatus();
    } catch (e) {
      console.error(`[Crone] Failed to ${action} job:`, e);
    }
  };

  useEffect(() => {
    // Avoid synchronous setState by deferring the first fetch
    const timeout = setTimeout(fetchStatus, 0);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const getStatusDot = (s: string) => {
    if (s === 'Active') return 'bg-primary shadow-[0_0_8px_#00ffcc]';
    if (s === 'Paused') return 'bg-warning shadow-[0_0_8px_#ffaa00]';
    return 'bg-disabled';
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-mono space-y-8 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <Activity className="animate-pulse" size={32} style={{ color: '#ff007f' }} />
          <h1 className="text-3xl font-bold text-white tracking-widest">CRONE MONITOR</h1>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-variant/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl flex items-center gap-4">
          <Server size={40} style={{ color: status?.scheduler_running ? '#00ffcc' : '#ff3333' }} />
          <div>
            <div className="text-white/60 text-sm">System Status</div>
            <div className="text-xl font-bold" style={{ color: status?.scheduler_running ? '#00ffcc' : '#ff3333' }}>
              {loading ? '...' : status?.scheduler_running ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </div>

        <div className="bg-surface-variant/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl flex items-center gap-4">
          <Clock size={40} style={{ color: '#00ffcc' }} />
          <div>
            <div className="text-white/60 text-sm">Next Scheduled Job</div>
            <div className="text-white text-xl font-bold">
              {loading ? '...' : status?.jobs?.[0]?.next_run ?? 'N/A'}
            </div>
          </div>
        </div>

        <div className="bg-surface-variant/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl flex items-center gap-4">
          <Terminal size={40} style={{ color: '#00ffcc' }} />
          <div>
            <div className="text-white/60 text-sm">Active Jobs</div>
            <div className="text-white text-xl font-bold">
              {loading ? '...' : `${status?.jobs?.filter(j => j.status === 'Active').length ?? 0} / ${status?.jobs?.length ?? 0}`}
            </div>
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="bg-surface-variant/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-black/40 p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-white/80 font-bold">BACKGROUND THREADS</span>
          {lastRefresh && (
            <span className="text-white/30 text-xs">Last refresh: {lastRefresh}</span>
          )}
        </div>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-white/40 text-center py-8 animate-pulse">Loading real-time data...</div>
          ) : status?.jobs && status.jobs.length > 0 ? (
            status.jobs.map(job => (
              <div
                key={job.id}
                className={`flex flex-col md:flex-row items-center justify-between p-6 bg-white/5 border rounded-2xl hover:bg-white/10 transition-all ${
                  job.status === 'Paused' ? 'border-white/5 opacity-60 grayscale' : 'border-white/10'
                }`}
              >
                <div className="flex-1 space-y-2 mb-4 md:mb-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusDot(job.status)} animate-pulse`}></div>
                    <div className="text-white text-lg font-bold">
                      {job.name}
                      <span className="text-white/20 text-[10px] ml-2 tracking-widest uppercase">[{job.id}]</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      job.color === 'success' ? 'bg-success/20 text-success border border-success/30' : 'bg-error/20 text-error border border-error/30'
                    }`}>
                      TOKEN COST: {job.cost}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm italic max-w-2xl leading-relaxed">
                    {job.description}
                  </p>
                  <div className="text-white/40 text-[10px] font-mono uppercase tracking-tighter">
                    Next Run: <span className="text-white/80">{job.next_run}</span> &nbsp;|&nbsp; Trigger: <span className="text-white/80">{job.trigger}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => controlJob(job.id, 'trigger')}
                    disabled={job.status === 'Paused'}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-20 transition-all group"
                    title="Jalankan Sekarang"
                  >
                    <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-[8px] font-bold uppercase">RUN</span>
                  </button>
                  
                  {job.status === 'Active' ? (
                    <button 
                      onClick={() => controlJob(job.id, 'pause')}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all"
                      title="Jeda (Pause)"
                    >
                      <Clock size={18} />
                      <span className="text-[8px] font-bold uppercase">PAUSE</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => controlJob(job.id, 'resume')}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-all"
                      title="Lanjutkan (Resume)"
                    >
                      <Activity size={18} />
                      <span className="text-[8px] font-bold uppercase">RESUME</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-white/40 text-center py-8">Tidak ada job yang terdaftar.</div>
          )}
        </div>
      </div>

      {/* Server Time */}
      {status?.server_time && (
        <div className="text-white/30 text-xs text-right">
          Server Time: {status.server_time}
        </div>
      )}
    </div>
  );
}
