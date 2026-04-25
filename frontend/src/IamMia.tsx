import { useState, useEffect } from 'react';
import { Save, FileText, CheckCircle } from 'lucide-react';

export default function IamMia() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadFile = (filename: string) => {
    setSelectedFile(filename);
    fetch(`http://localhost:8000/api/memory/file?name=${encodeURIComponent(filename)}`)
      .then(res => res.json())
      .then(data => setContent(data.content || ""));
  };

  useEffect(() => {
    fetch('http://localhost:8000/api/memory/files')
      .then(res => res.json())
      .then(data => {
        setFiles(data.files || []);
        if (data.files && data.files.length > 0) {
          loadFile(data.files[0]);
        }
      });
  }, []);

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await fetch('http://localhost:8000/api/memory/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile, content })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6 font-mono p-4">
      {/* File Explorer Sidebar */}
      <div className="w-64 bg-surface-variant/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col shadow-2xl">
        <h2 className="text-xl text-primary mb-4 font-bold tracking-widest border-b border-white/10 pb-2">I'm_Mia</h2>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {files.map(f => (
            <button
              key={f}
              onClick={() => loadFile(f)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                selectedFile === f ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-white/5 text-white/70'
              }`}
            >
              <FileText size={16} />
              <span className="truncate text-sm">{f}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-surface-variant/50 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <h3 className="text-white/90 font-bold flex items-center gap-2">
            <FileText size={18} className="text-primary" /> {selectedFile || "No File Selected"}
          </h3>
          <button 
            onClick={handleSave}
            disabled={saving || !selectedFile}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary border border-primary/50 hover:text-black rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,204,0.2)] disabled:opacity-50"
          >
            {saveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Memory'}
          </button>
        </div>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full bg-black/40 text-white/90 p-6 outline-none resize-none custom-scrollbar font-mono text-sm leading-relaxed"
          placeholder="Write markdown here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
