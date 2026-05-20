import { useState, useEffect, useTransition } from 'react';
import { Save, FileText, CheckCircle, Loader2, Sparkles, Brain, Clock, Shield, PlusCircle, Activity } from 'lucide-react';
import { useConfig } from './hooks/useConfig';
import { useMemoryFiles, useMemoryFileContent } from './hooks/useMIAQueries';

export default function IamMia() {
  const { config } = useConfig();
  const { data: files = [], refetch: refetchFiles } = useMemoryFiles();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  
  // Use TanStack Query for content
  const { data: fileData, isLoading: contentLoading } = useMemoryFileContent(selectedFile);
  
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync internal content state with fetched data
  useEffect(() => {
    if (fileData?.content !== undefined) {
      setContent(fileData.content);
    } else if (!selectedFile) {
        setContent("");
    }
  }, [fileData, selectedFile]);

  const handleFileSelect = (filename: string) => {
    setIsCreating(false);
    startTransition(() => {
      setSelectedFile(filename);
    });
  };

  useEffect(() => {
    if (files.length > 0 && !selectedFile && !isCreating) {
      handleFileSelect(files[0]);
    }
  }, [files, selectedFile, isCreating]);

  const handleCreateNew = () => {
      setIsCreating(true);
      setSelectedFile(null);
      setContent("");
      setNewFileName("");
  };

  const handleSave = async () => {
    const targetFile = isCreating ? newFileName : selectedFile;
    if (!targetFile) return;
    
    // Ensure filename ends with .md
    const finalFilename = targetFile.endsWith('.md') ? targetFile : `${targetFile}.md`;
    
    setSaving(true);
    try {
      await fetch('/api/memory/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: finalFilename, content })
      });
      setSaveSuccess(true);
      
      if (isCreating) {
          setIsCreating(false);
          await refetchFiles();
          setSelectedFile(finalFilename);
      }
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to extract some "metadata" feeling from content
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const isCoreIdentity = selectedFile === "SOUL.md";
  const isIntimacyRules = selectedFile === "INTIMACY.md";

  return (
    <div className="h-full flex flex-col sm:flex-row gap-6 p-6 sm:p-8 max-w-7xl mx-auto overflow-hidden animate-fade-in relative z-10">
      
      {/* File Explorer Sidebar */}
      <div 
        className="w-full sm:w-80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 flex flex-col shadow-2xl relative overflow-hidden group"
        style={{ backgroundColor: `rgba(0, 0, 0, ${config?.appearance?.ui_opacity ?? 0.6})` }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl text-white font-black tracking-tight flex items-center gap-3">
                    <Brain className="text-primary" size={24} />
                    Soul & Memory
                </h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono mt-1">Core Identity Sandbox</p>
            </div>
            <button 
                onClick={handleCreateNew}
                className="p-2 bg-white/5 hover:bg-primary/20 text-white/60 hover:text-primary rounded-xl transition-all border border-transparent hover:border-primary/30"
                title="Create New Memory"
            >
                <PlusCircle size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {files.map(f => {
            const isSoul = f === "SOUL.md";
            const isLove = f === "INTIMACY.md";
            return (
                <button
                key={f}
                onClick={() => handleFileSelect(f)}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all group/item ${
                    selectedFile === f && !isCreating
                    ? isLove ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]' : 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,204,0.15)]' 
                    : 'hover:bg-white/5 text-white/70 border border-transparent'
                } ${isPending && selectedFile === f ? 'opacity-50' : ''}`}
                >
                <div className="flex items-center gap-3 overflow-hidden">
                    {isSoul ? <Shield size={16} className={selectedFile === f && !isCreating ? "text-primary" : "text-white/40"} /> : 
                     isLove ? <Activity size={16} className={selectedFile === f && !isCreating ? "text-pink-500" : "text-white/40"} /> :
                     <FileText size={16} className={selectedFile === f && !isCreating ? "text-primary" : "text-white/40"} />}
                    <span className="truncate text-sm font-bold font-mono">{f.replace('.md', '')}</span>
                </div>
                {selectedFile === f && !isCreating && <Sparkles size={12} className={`animate-pulse ${isLove ? 'text-pink-500' : 'text-primary'}`} />}
                </button>
            )
          })}
        </div>
      </div>

      {/* Editor Space */}
      <div 
        className="flex-1 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden relative"
        style={{ backgroundColor: `rgba(0, 0, 0, ${config?.appearance?.ui_opacity ?? 0.6})` }}
      >
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:px-8 sm:py-6 border-b border-white/5 bg-black/40"
        >
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className={`p-3 rounded-2xl ${isIntimacyRules ? 'bg-pink-500/10 text-pink-500' : 'bg-primary/10 text-primary'}`}>
                {isCoreIdentity ? <Shield size={24} /> : isIntimacyRules ? <Activity size={24} /> : <Brain size={24} />}
            </div>
            <div>
                {isCreating ? (
                    <input 
                        type="text" 
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="Memory_Name.md"
                        className="bg-transparent border-b border-white/20 text-white font-bold text-xl outline-none focus:border-primary px-1 pb-1 font-mono w-48"
                    />
                ) : (
                    <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
                        {selectedFile || "No Memory Selected"}
                        {contentLoading && <Loader2 size={16} className="animate-spin text-white/40" />}
                    </h3>
                )}
                
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1">
                        <FileText size={10} /> {wordCount} Words
                    </span>
                    {!isCreating && fileData?.modified && (
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} /> {new Date(fileData.modified * 1000).toLocaleString()}
                        </span>
                    )}
                </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving || (!selectedFile && !isCreating) || (isCreating && !newFileName) || contentLoading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                saveSuccess 
                ? 'bg-success/20 text-success border border-success/50' 
                : 'bg-primary text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,255,204,0.3)] disabled:opacity-50 disabled:hover:scale-100'
            }`}
          >
            {saveSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
            {saving ? 'ENCODING...' : saveSuccess ? 'MEMORY SECURED' : 'SAVE TO NEURAL NET'}
          </button>
        </div>
        
        <div className="flex-1 relative flex flex-col">
          {contentLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-md">
               <div className="flex flex-col items-center gap-6">
                  <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <Brain size={24} className="absolute inset-0 m-auto text-primary/50 animate-pulse" />
                  </div>
                  <div className="text-primary text-sm tracking-[0.3em] font-mono animate-pulse font-bold">ACCESSING DEEP MEMORY...</div>
               </div>
            </div>
          )}
          
          <div className="flex-1 p-6 sm:p-8">
            <textarea
                id="memory-editor"
                name="memory-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={contentLoading}
                placeholder={isCreating ? "Write new core memories or instructions here..." : ""}
                className={`w-full h-full bg-transparent text-white/90 outline-none resize-none custom-scrollbar font-mono text-sm leading-relaxed transition-opacity duration-300 ${contentLoading ? 'opacity-0' : 'opacity-100'}`}
                style={{ lineHeight: '1.8' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
