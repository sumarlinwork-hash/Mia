import React, { useState } from 'react';
import { Play, X, AlertCircle } from 'lucide-react';

interface SkillExecutorProps {
  skill: {
    id: string;
    name: string;
    input_schema?: Record<string, string>;
  };
  onClose: () => void;
  onExecute: (inputs: Record<string, any>) => void;
}

const SkillExecutor: React.FC<SkillExecutorProps> = ({ skill, onClose, onExecute }) => {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    const schema = skill.input_schema || {};
    for (const field in schema) {
      if (!inputs[field]) {
        setError(`Field ${field} is required.`);
        return;
      }
    }
    onExecute(inputs);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Play size={20} fill="currentColor" />
            </div>
            <div>
              <h3 className="font-bold text-white">{skill.name}</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Skill Execution</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {Object.entries(skill.input_schema || {}).map(([field, type]) => (
            <div key={field}>
              <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">{field}</label>
              <input 
                type={type === 'number' ? 'number' : 'text'}
                onChange={e => setInputs({...inputs, [field]: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                placeholder={`Enter ${field}...`}
              />
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,255,204,0.3)]"
          >
            RUN SKILL
          </button>
        </form>
      </div>
    </div>
  );
};

export default SkillExecutor;
