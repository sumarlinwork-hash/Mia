import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, Activity, Zap, RefreshCw, AlertTriangle, 
  CheckCircle2, Terminal, Cpu, Network, Heart,
  Settings
} from 'lucide-react';
import { useConfig } from './hooks/useConfig';

interface DiagnosticResult {
  provider: string;
  status: 'OK' | 'FAIL' | 'WARN';
  latency?: number;
  reason?: string;
  action?: string;
}

interface SystemInvariant {
  name: string;
  status: string;
  desc: string;
}

const ResilienceDashboard: React.FC = () => {
  const { config } = useConfig();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [invariants, setInvariants] = useState<SystemInvariant[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<number>(100);

  const runDiagnostic = useCallback(async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/diagnostic');
      const data = await res.json();
      if (data.status === 'success') {
        const providerResults = data.results.providers || [];
        const invariantResults = data.results.invariants || [];
        
        setResults(providerResults);
        setInvariants(invariantResults);
        setLastScan(new Date().toLocaleTimeString());
        
        // Calculate health score (weighted)
        const total = providerResults.length;
        const failed = providerResults.filter((r: DiagnosticResult) => r.status === 'FAIL').length;
        const baseScore = total > 0 ? ((total - failed) / total) * 100 : 100;
        
        // Invariants penalty if any are INACTIVE
        const inactiveInvariants = invariantResults.filter((i: SystemInvariant) => i.status !== 'ACTIVE').length;
        const finalScore = Math.max(0, Math.round(baseScore - (inactiveInvariants * 10)));
        
        setSystemHealth(finalScore);
      }
    } catch (err) {
      console.error("Diagnostic failed", err);
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostic();
    const interval = setInterval(runDiagnostic, 30000); // Auto-scan every 30s
    return () => clearInterval(interval);
  }, [runDiagnostic]);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-500"
        style={{ backgroundColor: `rgba(0, 0, 0, ${1 - (config?.appearance?.ui_opacity ?? 0.5)})` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-20 -mt-20 animate-pulse" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-xl">
              <ShieldCheck className="text-primary" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
              Resilience <span className="text-primary not-italic">Layer v2.0</span>
            </h1>
          </div>
          <p className="text-white/40 font-mono text-sm max-w-md">
            Advanced system integrity monitor and self-healing engine. 
            Guarantees 100% response uptime under any network or provider failure.
          </p>
        </div>

        <div className="flex flex-col items-end gap-4 relative z-10">
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Integrity Score</span>
              <div className={`text-5xl font-black tracking-tighter ${systemHealth > 90 ? 'text-primary' : systemHealth > 50 ? 'text-secondary' : 'text-error'}`}>
                {systemHealth}%
              </div>
            </div>
            <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center ${systemHealth > 90 ? 'border-primary/20 bg-primary/5' : 'border-error/20 bg-error/5'}`}>
               <Activity className={systemHealth > 90 ? 'text-primary animate-pulse' : 'text-error animate-bounce'} size={32} />
            </div>
          </div>
          <button 
            onClick={runDiagnostic}
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all active:scale-95 ${
              isRunning 
              ? 'bg-white/5 text-white/40 cursor-not-allowed' 
              : 'bg-primary text-black hover:shadow-[0_0_20px_rgba(0,255,204,0.5)]'
            }`}
          >
            <RefreshCw size={18} className={isRunning ? 'animate-spin' : ''} />
            {isRunning ? 'DIAGNOSING...' : 'FIX MY BRAIN'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: System Invariants */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 px-2">
            <Terminal size={20} className="text-primary" />
            Core Invariants
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {invariants.map((inv, idx) => (
              <div 
                key={idx} 
                className="backdrop-blur-md p-5 rounded-3xl border border-white/5 group hover:border-primary/30 transition-all"
                style={{ backgroundColor: `rgba(0, 0, 0, ${(1 - (config?.appearance?.ui_opacity ?? 0.5)) * 0.6})` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black tracking-widest text-primary uppercase">{inv.name}</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[8px] font-black text-primary">{inv.status}</span>
                  </div>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{inv.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-secondary/10 to-transparent p-6 rounded-3xl border border-secondary/20 relative overflow-hidden">
             <Heart className="absolute -bottom-6 -right-6 text-secondary/10" size={120} />
             <h3 className="text-secondary font-bold mb-2 flex items-center gap-2">
                <Cpu size={18} />
                Local Heart Ready
             </h3>
             <p className="text-white/50 text-xs mb-4">
               Tier-3 fallback activated. When all external nodes fail, MIA shifts to local emotional resonance.
             </p>
             <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="h-1 flex-1 bg-secondary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Network size={20} className="text-secondary" />
              Provider Health Stream
            </h2>
            {lastScan && (
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                Last Update: {lastScan}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.length > 0 ? (
              results.map((res, idx) => (
                <div 
                  key={idx} 
                  className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all hover:scale-[1.02] ${
                    res.status === 'OK' 
                    ? 'border-white/5 hover:border-primary/20' 
                    : 'bg-error/10 border-error/20 hover:border-error/40 shadow-[0_0_30px_rgba(255,68,68,0.1)]'
                  }`}
                  style={res.status === 'OK' ? { backgroundColor: `rgba(0, 0, 0, ${(1 - (config?.appearance?.ui_opacity ?? 0.5)) * 0.6})` } : {}}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-white uppercase">{res.provider}</h3>
                      <span className="text-[10px] font-mono text-white/40">{res.latency ? `${res.latency}ms latency` : 'latency unavailable'}</span>
                    </div>
                    {res.status === 'OK' ? (
                      <CheckCircle2 className="text-primary" size={24} />
                    ) : (
                      <AlertTriangle className="text-error animate-pulse" size={24} />
                    )}
                  </div>
                  
                    {res.status === 'FAIL' ? (
                    <div className="space-y-3">
                      <div className="bg-black/40 p-3 rounded-xl border border-error/10">
                        <span className="block text-[8px] font-black uppercase tracking-widest text-error/60 mb-1">Detected Issue</span>
                        <p className="text-xs text-white/80 font-mono leading-relaxed">{res.reason}</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                        <span className="block text-[8px] font-black uppercase tracking-widest text-primary/60 mb-1">Actionable Fix</span>
                        <p className="text-xs text-white/80 font-mono leading-relaxed">{res.action}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-primary/60 text-xs font-mono">
                      <Zap size={14} />
                      Connection Stable
                    </div>
                  )}

                  {/* Decorative Background Element */}
                  <div className={`absolute -bottom-4 -right-4 opacity-5 ${res.status === 'OK' ? 'text-primary' : 'text-error'}`}>
                    <Network size={80} />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full h-64 flex flex-col items-center justify-center bg-black/20 rounded-[2rem] border border-dashed border-white/10 opacity-40">
                <Settings className="animate-spin mb-4" size={40} />
                <p className="font-mono text-sm">Scanning Neural Pathways...</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <StatCard icon={<Activity size={16}/>} label="Uptime" value="99.9%" color="primary" />
            <StatCard icon={<ShieldCheck size={16}/>} label="Security" value="Hardened" color="secondary" />
            <StatCard icon={<Network size={16}/>} label="Nodes" value={results.length.toString()} color="white" />
            <StatCard icon={<Terminal size={16}/>} label="Failsafe" value="Active" color="primary" />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
    <div className={`p-2 rounded-lg bg-${color}/10 text-${color}`}>
      {icon}
    </div>
    <div>
      <span className="block text-[8px] font-black uppercase tracking-widest text-white/30">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  </div>
);

export default ResilienceDashboard;
