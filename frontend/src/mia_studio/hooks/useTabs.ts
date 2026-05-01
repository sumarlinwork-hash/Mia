import { useState, useCallback } from 'react';

export const useTabs = () => {
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const openTab = useCallback((path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
    setActiveTab(path);
  }, [openTabs]);

  const closeTab = useCallback((path: string) => {
    const newTabs = openTabs.filter(t => t !== path);
    setOpenTabs(newTabs);
    if (activeTab === path) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  }, [openTabs, activeTab]);

  return { openTabs, activeTab, openTab, closeTab, setActiveTab };
};
