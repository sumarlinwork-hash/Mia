import React from 'react';
import { AlertTriangle, X, ShieldAlert, Info } from 'lucide-react';
import clsx from 'clsx';

interface ImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  impactedFiles: string[];
  operation: string;
}

export const ImpactModal: React.FC<ImpactModalProps> = ({ 
  isOpen, onClose, onConfirm, severity, reason, impactedFiles, operation 
}) => {
  if (!isOpen) return null;

  const isCritical = severity === 'CRITICAL' || severity === 'HIGH';
  const isMedium = severity === 'MEDIUM';

  const getColorClass = () => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH': return 'text-red-500 border-red-500/20 bg-red-500/10';
      case 'MEDIUM': return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
      default: return 'text-white/40 border-white/5 bg-white/5';
    }
  };

  const getIcon = () => {
    if (isCritical) return <ShieldAlert size={24} />;
    if (isMedium) return <AlertTriangle size={24} />;
    return <Info size={24} />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={clsx(
        "w-[450px] bg-[#0a0a0a] border rounded-2xl overflow-hidden shadow-2xl transition-all scale-100",
        isCritical ? "border-red-500/30" : isMedium ? "border-yellow-500/20" : "border-white/10"
      )}>
        {/* Header */}
        <div className={clsx(
          "p-6 flex items-center gap-4 border-b",
          isCritical ? "bg-red-500/10 border-red-500/20" : isMedium ? "bg-yellow-500/5 border-yellow-500/10" : "bg-white/5 border-white/5"
        )}>
          <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
            isCritical ? "bg-red-500 text-white shadow-red-500/20" : isMedium ? "bg-yellow-500 text-black shadow-yellow-500/20" : "bg-white/10 text-white/40"
          )}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">{operation} Restricted</h3>
            <p className={clsx("text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1", getColorClass())}>
              {severity} SEVERITY
            </p>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm text-white/80 leading-relaxed font-medium">{reason}</p>
          </div>

          {impactedFiles.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2">
                Impacted Files <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">{impactedFiles.length}</span>
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                {impactedFiles.map(f => (
                  <div key={f} className="text-[11px] text-white/60 font-mono bg-white/5 px-2 py-1.5 rounded border border-white/5 hover:border-white/20 transition-colors">
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {severity === 'CRITICAL' ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium animate-pulse">
              SYSTEM BLOCK: Structural changes to the Entry Point are prohibited to ensure project integrity.
            </div>
          ) : isCritical ? (
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400/80 font-medium">
              High risk of project breakage. Proceeding will trigger a mandatory safety snapshot.
            </div>
          ) : (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 font-medium">
              Procedural warning: Dependencies detected. System will perform a safety backup.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#050505] border-t border-white/5 flex gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white transition-all"
          >
            Cancel
          </button>
          {severity !== 'CRITICAL' && (
            <button 
              onClick={onConfirm}
              className={clsx(
                "px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-lg",
                isCritical ? "bg-red-600 hover:bg-red-500 shadow-red-500/10" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
              )}
            >
              Proceed Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
