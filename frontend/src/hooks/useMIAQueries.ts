import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const queryKeys = {
  bootstrap: ['bootstrap'] as const,
  history: ['history'] as const,
  memory: ['memory'] as const,
  intimacy: ['intimacy'] as const,
  skills: ['skills'] as const,
  marketplace: ['marketplace'] as const,
  recommendations: ['recommendations'] as const,
  config: ['config'] as const,
  emotion: ['emotion'] as const,
  crone: ['crone'] as const,
  memoryContent: (name: string) => ['memory', 'content', name] as const,
};

export function useMemoryFileContent(name: string | null) {
  return useQuery({
    queryKey: queryKeys.memoryContent(name || ''),
    queryFn: async () => {
      if (!name) return { content: '' };
      const res = await fetch(`/api/memory/file?name=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('Failed to fetch file content');
      return res.json();
    },
    enabled: !!name,
    staleTime: 600000, // 10 minutes cache
  });
}

export function usePrefetchMemoryContent() {
  const queryClient = useQueryClient();
  
  return useCallback(async (files: string[]) => {
    const promises = files.map(file => 
      queryClient.prefetchQuery({
        queryKey: queryKeys.memoryContent(file),
        queryFn: async () => {
          const res = await fetch(`/api/memory/file?name=${encodeURIComponent(file)}`);
          return res.json();
        },
        staleTime: 600000
      })
    );
    await Promise.all(promises);
  }, [queryClient]);
}

export function useMIABootstrap() {
  const queryClient = useQueryClient();
  const prefetchMemory = usePrefetchMemoryContent();

  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: async () => {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Bootstrap failed');
      const data = await res.json();
      
      // Aggressive cache seeding
      queryClient.setQueryData(queryKeys.config, data.config);
      queryClient.setQueryData(queryKeys.history, data.history);
      queryClient.setQueryData(queryKeys.memory, data.memory_files);
      queryClient.setQueryData(queryKeys.skills, data.skills);
      queryClient.setQueryData(queryKeys.intimacy, data.intimacy.intimacy_active);
      queryClient.setQueryData(queryKeys.emotion, data.emotion);
      queryClient.setQueryData(queryKeys.crone, data.crone);
      
      // Seed marketplace if provided
      if (data.marketplace) queryClient.setQueryData(queryKeys.marketplace, data.marketplace);
      if (data.recommendations) queryClient.setQueryData(queryKeys.recommendations, data.recommendations);
      
      // Eager Prefetching for Memory Files (Instant Switch)
      if (data.memory_files) {
        prefetchMemory(data.memory_files);
      }

      return data;
    },
    staleTime: Infinity, // One-time bootstrap
  });
}

export function useChatHistory() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: async () => {
      const res = await fetch('/api/chat/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      return data.history || [];
    },
    staleTime: 10000,
  });
}

export function useMemoryFiles() {
  return useQuery({
    queryKey: queryKeys.memory,
    queryFn: async () => {
      const res = await fetch('/api/memory/files');
      if (!res.ok) throw new Error('Failed to fetch memory files');
      const data = await res.json();
      return data.files || [];
    },
    staleTime: 30000,
  });
}

export function useIntimacyStatus() {
  return useQuery({
    queryKey: queryKeys.intimacy,
    queryFn: async () => {
      const res = await fetch('/api/intimacy/status');
      if (!res.ok) throw new Error('Failed to fetch intimacy status');
      const data = await res.json();
      return data.intimacy_active as boolean;
    },
    refetchInterval: 5000,
    staleTime: 5000,
  });
}

export function useInstalledSkills() {
  return useQuery({
    queryKey: queryKeys.skills,
    queryFn: async () => {
      const res = await fetch('/api/skills/installed');
      if (!res.ok) throw new Error('Failed to fetch skills');
      return await res.json();
    },
    staleTime: 60000,
  });
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return {
    invalidateHistory: () => queryClient.invalidateQueries({ queryKey: queryKeys.history }),
    invalidateMemory: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory }),
    invalidateIntimacy: () => queryClient.invalidateQueries({ queryKey: queryKeys.intimacy }),
    invalidateSkills: () => queryClient.invalidateQueries({ queryKey: queryKeys.skills }),
    invalidateConfig: () => queryClient.invalidateQueries({ queryKey: queryKeys.config }),
  };
}
