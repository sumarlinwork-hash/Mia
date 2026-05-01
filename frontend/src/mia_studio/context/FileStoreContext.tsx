import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface FileState {
  path: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  backendHash: string | null;
  snapshotId: string | null;
}

interface FileStoreContextType {
  currentProjectId: string;
  currentSessionId: string | null;
  setProjectId: (id: string) => Promise<void>;
  files: Record<string, FileState>;
  updateFile: (path: string, content: string) => void;
  setFileBase: (path: string, content: string, hash: string | null, snapshotId: string | null) => void;
  getFile: (path: string) => FileState | undefined;
  isInitialised: boolean;
}

const FileStoreContext = createContext<FileStoreContextType | undefined>(undefined);

export function FileStoreProvider({ children }: { children: React.ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string>("default_project");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, FileState>>({});
  const [isInitialised, setIsInitialised] = useState(false);
  
  // AbortController to cancel pending requests on project switch (P4-A.3)
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const setProjectId = useCallback(async (id: string) => {
    // 1. Hard Reset (P4-A.3)
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log("[FileStore] Aborted pending requests due to project switch");
    }
    abortControllerRef.current = new AbortController();
    
    setIsInitialised(false);
    setFiles({}); // Clear memory
    setCurrentProjectId(id);
    
    // 2. Server Handshake (P4-X1)
    try {
        const res = await fetch('/api/studio/auth/handshake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: id }),
            signal: abortControllerRef.current.signal
        });
        const data = await res.json();
        if (data.status === 'success') {
            setCurrentSessionId(data.session_id);
            setIsInitialised(true);
            console.log(`[FileStore] Session Issued: ${data.session_id} for ${id}`);
        } else {
            console.error("[FileStore] Handshake Failed:", data.message);
        }
    } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
            console.error("[FileStore] Handshake Network Error", err);
        }
    }
  }, []);

  // Auto-init for default project
  useEffect(() => {
    if (!currentSessionId) {
        setProjectId("default_project");
    }
  }, [currentSessionId, setProjectId]);

  const getFile = useCallback((path: string) => files[path], [files]);

  const updateFile = useCallback((path: string, content: string) => {
    setFiles(prev => ({
      ...prev,
      [path]: {
        ...prev[path],
        path,
        content,
        isDirty: content !== (prev[path]?.originalContent ?? content)
      }
    }));
  }, []);

  const setFileBase = useCallback((path: string, content: string, hash: string | null, snapshotId: string | null) => {
    setFiles(prev => ({
      ...prev,
      [path]: {
        path,
        content,
        originalContent: content,
        isDirty: false,
        backendHash: hash,
        snapshotId: snapshotId
      }
    }));
  }, []);

  return (
    <FileStoreContext.Provider value={{ 
        currentProjectId, 
        currentSessionId, 
        setProjectId, 
        files, 
        updateFile, 
        setFileBase, 
        getFile,
        isInitialised
    }}>
      {children}
    </FileStoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFileStore() {
  const context = useContext(FileStoreContext);
  if (!context) throw new Error("useFileStore must be used within FileStoreProvider");
  return context;
}
