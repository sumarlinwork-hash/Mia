import React, { createContext, useState, useEffect, useCallback } from 'react';

interface EmotionState {
  happiness: number;
  arousal: number;
  dominance: number;
  respect: number;
  reassurance: number;
  warmth: number;
  eRecall: number[] | null;
  isSpeaking: boolean;
}

interface EmotionContextType {
  emotion: EmotionState;
  refreshEmotion: () => Promise<void>;
  setRecall: (val: number[]) => void;
  setListening: (val: boolean) => void;
  setSpeaking: (val: boolean) => void;
}

export const EmotionContext = createContext<EmotionContextType | undefined>(undefined);

export const EmotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emotion, setEmotion] = useState<EmotionState>({
    happiness: 50,
    arousal: 50,
    dominance: 50,
    respect: 50,
    reassurance: 50,
    warmth: 50,
    eRecall: null,
    isSpeaking: false
  });

  const refreshEmotion = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/emotion');
      const data = await res.json();
      setEmotion(prev => ({
        ...prev,
        ...data
      }));
    } catch (err) {
      console.error('[EmotionContext] Failed to fetch emotions:', err);
    }
  }, []);

  useEffect(() => {
    refreshEmotion();
    const interval = setInterval(refreshEmotion, 5000);
    return () => clearInterval(interval);
  }, [refreshEmotion]);

  const setRecall = (val: number[]) => setEmotion(prev => ({ ...prev, eRecall: val }));
  const setListening = (val: boolean) => console.log('[Emotion] Listening:', val);
  const setSpeaking = (val: boolean) => setEmotion(prev => ({ ...prev, isSpeaking: val }));

  return (
    <EmotionContext.Provider value={{ emotion, refreshEmotion, setRecall, setListening, setSpeaking }}>
      {children}
    </EmotionContext.Provider>
  );
};
