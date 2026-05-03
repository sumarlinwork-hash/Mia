import { useQuery, useQueryClient } from '@tanstack/react-query';

export const queryKeys = {
  history: ['history'] as const,
  memory: ['memory'] as const,
  intimacy: ['intimacy'] as const,
  skills: ['skills'] as const,
  config: ['config'] as const,
};

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
