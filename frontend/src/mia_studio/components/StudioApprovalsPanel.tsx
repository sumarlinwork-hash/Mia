import React from 'react';
import { X, Check, ShieldAlert, MessageSquare } from 'lucide-react';

interface Approval {
  id: string;
  action_type: string;
  title: string;
  description: string;
  payload: { command?: string; patch?: string; [key: string]: unknown };
  status: string;
  result?: string;
  created_at: number;
  updated_at: number;
}

interface StudioApprovalsPanelProps {
  approvals: Approval[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}

export const StudioApprovalsPanel: React.FC<StudioApprovalsPanelProps> = ({
  approvals,
  onApprove,
  onReject,
  onClose,
}) => {
  return (
    <div className="rounded-lg border border-white/10 bg-black/80 p-4 backdrop-blur-xl mb-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-primary" size={16} />
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Approval Queue</h3>
            <p className="text-[10px] text-white/40">Approve or deny pending workspace actions.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          Close
        </button>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-[10px] text-white/50">
          No pending approvals at the moment.
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div key={approval.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/60">
                    <MessageSquare size={12} />
                    <span>{approval.action_type.replace(/_/g, ' ')}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{approval.title}</h4>
                </div>
                <span className="rounded-full bg-yellow-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">
                  {approval.status}
                </span>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-white/60">{approval.description}</p>
              <div className="mt-3 text-[9px] text-white/30 font-mono break-all bg-black/40 rounded-lg p-2 border border-white/10">
                {approval.payload?.command ? `Command: ${approval.payload.command}` : approval.payload?.patch ? approval.payload.patch.slice(0, 320) + (approval.payload.patch.length > 320 ? '...' : '') : 'No payload preview available.'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => onApprove(approval.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-green-300 hover:bg-green-500/20"
                >
                  <Check size={12} />
                  Approve
                </button>
                <button
                  onClick={() => onReject(approval.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300 hover:bg-red-500/20"
                >
                  <X size={12} />
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
