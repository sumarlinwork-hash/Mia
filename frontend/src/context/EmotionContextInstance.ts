import { createContext } from 'react';

export interface EmotionState {
  warmth: number;
  arousal: number;
  echo: number;
  mood: string;
  last_update: number;
}

export interface EmotionContextType {
  emotion: EmotionState;
  loading: boolean;
  refreshEmotion: () => Promise<void>;
}

export const EmotionContext = createContext<EmotionContextType | undefined>(undefined);
