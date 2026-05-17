import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EmotionContext, type EmotionState } from './EmotionContextInstance';

export const EmotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emotion, setEmotion] = useState<EmotionState>({
    warmth: 70,
    arousal: 50,
    echo: 40,
    mood: 'Playful',
    last_update: 0,
  });
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const fetchEmotion = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const res = await fetch('/api/emotion');
      if (!res.ok) throw new Error('Failed to fetch emotion');
      const data = await res.json();
      setEmotion(data);
    } catch (err) {
      console.warn('[EmotionContext] Error fetching emotion:', err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchEmotion();
    const interval = setInterval(fetchEmotion, 10000); // Poll exactly once every 10 seconds (10000ms)
    return () => clearInterval(interval);
  }, [fetchEmotion]);

  return (
    <EmotionContext.Provider value={{ emotion, loading, refreshEmotion: fetchEmotion }}>
      {children}
    </EmotionContext.Provider>
  );
};
