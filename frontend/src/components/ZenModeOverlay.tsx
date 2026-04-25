import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface ZenModeOverlayProps {
  isActive: boolean;
  onExit: () => void;
}

const ZenModeOverlay: React.FC<ZenModeOverlayProps> = ({ isActive, onExit }) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isActive && !isMuted) {
      audioRef.current?.play().catch(() => console.log('Audio autoplay blocked'));
    } else {
      audioRef.current?.pause();
    }
  }, [isActive, isMuted]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/10 backdrop-blur-[0.1px]"
          onClick={onExit}
        >
          <audio
            ref={audioRef}
            src="/audio/ambient.mp3"
            loop
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.5 }}
            className="text-center pointer-events-none"
          >
            <div className="w-32 h-32 rounded-full border-2 border-primary/20 animate-[ping_4s_infinite] mx-auto mb-8" />
            <h2 className="text-4xl font-light text-white/20 tracking-[1em] uppercase">Zen Mode</h2>
          </motion.div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 px-8 py-4 rounded-full bg-black/40 border border-white/5 backdrop-blur-xl pointer-events-auto">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              className="p-2 text-white/40 hover:text-primary transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="h-4 w-px bg-white/10" />
            <button
              onClick={(e) => { e.stopPropagation(); onExit(); }}
              className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest hover:text-white transition-colors"
            >
              <Maximize2 size={14} /> Exit Zen
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ZenModeOverlay;
