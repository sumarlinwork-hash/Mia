import { useState, useEffect, useCallback } from 'react';
import type { StudioEvent, UseStudioStreamReturn } from './useStudioStream';

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  children?: FileNode[];
}

interface ProjectMetadata {
  project_id: string;
  name: string;
  schema_version: string;
  entry_point: string;
}

export const useProject = (projectId: string = "default_project") => {
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      const res = await fetch(`/api/studio/project/metadata?project_id=${projectId}`);
      const data = await res.json();
      if (data.status === 'success') setMetadata(data.metadata);
    } catch (err) {
      console.error("Failed to fetch metadata", err);
    }
  }, [projectId]);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/studio/file/list?project_id=${projectId}`);
      const data = await res.json();
      if (data.status === 'success') setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMetadata();
    fetchFiles();
  }, [fetchMetadata, fetchFiles]);

  return { metadata, files, isLoading, error, refresh: fetchFiles };
};

// Patch B: Centralized Event Subscription
export function useProjectEvents(resilienceStream: UseStudioStreamReturn, projectRefresh: () => void) {
  useEffect(() => {
    if (!resilienceStream?.onEvent) return;

    const handler = (event: StudioEvent) => {
      if (!event?.type) return;

      const shouldRefresh = [
        "STRUCTURE_UPDATED", 
        "FILE_RENAMED", 
        "FILE_DELETED", 
        "FILE_CREATED"
      ].includes(event.type);

      if (shouldRefresh) {
        console.log(`[useProjectEvents] Triggering refresh due to: ${event.type}`);
        projectRefresh();
      }
    };

    resilienceStream.onEvent(handler);
    return () => resilienceStream.offEvent(handler);
  }, [resilienceStream, projectRefresh]);
}
