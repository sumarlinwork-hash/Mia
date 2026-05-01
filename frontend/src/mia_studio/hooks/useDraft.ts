import { useState, useCallback, useRef } from 'react';
import { useFileStore } from '../context/FileStoreContext';

export const useDraft = () => {
  const { currentProjectId, currentSessionId, setFileBase, getFile, isInitialised } = useFileStore();
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadFile = useCallback(async (path: string) => {
    if (!isInitialised || !currentSessionId) return;
    
    try {
      const res = await fetch(`/api/studio/file/read?project_id=${currentProjectId}&session_id=${currentSessionId}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setFileBase(path, data.content, data.hash, data.snapshot_id);
      }
    } catch (err) {
      console.error("[useDraft] Load failed", err);
    }
  }, [currentProjectId, currentSessionId, isInitialised, setFileBase]);

  const saveFile = useCallback(async (path: string, content: string, retryCount: number = 0) => {
    if (!isInitialised || !currentSessionId) return;
    
    const file = getFile(path);
    setIsSaving(true);
    
    try {
      const res = await fetch('/api/studio/file/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_id: currentProjectId, 
          session_id: currentSessionId, 
          path, 
          content, 
          expected_hash: file?.backendHash,
          expected_snapshot_id: file?.snapshotId
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setFileBase(path, content, file?.backendHash || null, file?.snapshotId || null); 
        setIsSaving(false);
      } else if (data.status === 'error' && data.message && data.message.includes("CONFLICT")) {
        // P4-X5: Ownership or Conflict Guard Triggered
        console.error("[useDraft] Conflict/Ownership Violation!", data.message);
        alert(`ACCESS DENIED: ${data.message}. Another session might be editing this file.`);
        setIsSaving(false);
      } else if (data.status === 'error' && data.message && data.message.includes("SYSTEM_BUSY") && retryCount < 50) {
        const delay = Math.min(200 * Math.pow(1.5, retryCount), 2000); 
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          saveFile(path, content, retryCount + 1);
        }, delay);
      } else {
        console.error("[useDraft] Save Error", data.message);
        setIsSaving(false);
      }
    } catch (err) {
      console.error("[useDraft] Network error during save", err);
      setIsSaving(false);
    }
  }, [currentProjectId, currentSessionId, isInitialised, setFileBase, getFile]);

  return { loadFile, saveFile, isSaving };
};
