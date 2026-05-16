import { useState, useEffect, useTransition } from 'react';
import { Save, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useConfig } from './hooks/useConfig';
import { useMemoryFiles, useMemoryFileContent } from './hooks/useMIAQueries';

export default function IamMia() {
  const { config } = useConfig();
  const { data: files = [] } = useMemoryFiles();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  // Use TanStack Query for content
  const { data: fileData, isLoading: contentLoading } = useMemoryFileContent(selectedFile);
  
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync internal content state with fetched data
  useEffect(() => {
    if (fileData?.content !== undefined) {
      setContent(fileData.content);
    }
  }, [fileData]);

  const handleFileSelect = (filename: string) => {
    startTransition(() => {
      setSelectedFile(filename);
    });
  };

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      handleFileSelect(files[0]);
    }
  }, [files, selectedFile]);

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await fetch('/api/memory/file', {
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
      <div 
        className="w-64 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col shadow-2xl transition-all duration-500"
        style={{ backgroundColor: `rgba(26, 26, 26, ${1 - (config?.appearance?.ui_opacity ?? 0.5)})` }}
      >
        <h2 className="text-xl text-primary mb-4 font-bold tracking-widest border-b border-white/10 pb-2">I'm_Mia</h2>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {files.map(f => (
            <button
              key={f}
              onClick={() => handleFileSelect(f)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                selectedFile === f ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,255,204,0.1)]' : 'hover:bg-white/5 text-white/70'
              } ${isPending && selectedFile === f ? 'opacity-50' : ''}`}
            >
              <FileText size={16} className={isPending && selectedFile === f ? 'animate-spin' : ''} />
              <span className="truncate text-sm">{f}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div 
        className="flex-1 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-500"
        style={{ backgroundColor: `rgba(26, 26, 26, ${1 - (config?.appearance?.ui_opacity ?? 0.5)})` }}
      >
        <div 
          className="flex items-center justify-between p-4 border-b border-white/10"
          style={{ backgroundColor: `rgba(0, 0, 0, ${(1 - (config?.appearance?.ui_opacity ?? 0.5)) * 0.4})` }}
        >
          <h3 className="text-white/90 font-bold flex items-center gap-2">
            <FileText size={18} className="text-primary" /> 
            {selectedFile || "No File Selected"}
            {contentLoading && <Loader2 size={14} className="animate-spin text-primary/50" />}
          </h3>
          <button 
            onClick={handleSave}
            disabled={saving || !selectedFile || contentLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary border border-primary/50 hover:text-black rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,204,0.2)] disabled:opacity-50"
          >
            {saveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Memory'}
          </button>
        </div>
        
        <div className="flex-1 relative">
          {contentLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <div className="text-primary/60 text-xs tracking-widest font-mono animate-pulse">RECALLING MEMORY...</div>
               </div>
            </div>
          )}
          <textarea
            id="memory-editor"
            name="memory-editor"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={contentLoading}
            className={`w-full h-full text-white/90 p-6 outline-none resize-none custom-scrollbar font-mono text-sm leading-relaxed transition-opacity duration-300 ${contentLoading ? 'opacity-20' : 'opacity-100'}`}
          />
        </div>
      </div>
    </div>
  );
}
