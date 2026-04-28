import { useEffect, useRef } from 'react';
import { L2DManager } from './L2DManager';

/**
 * AvatarRenderer (DEPRECATED/INACTIVE)
 * This component is kept for future reference and is currently NOT used in App.tsx
 * due to hardware resource constraints (Intel HD 2500 compatibility issues).
 */
const AvatarRenderer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const managerRef = useRef<L2DManager | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const init = async () => {
            const manager = new L2DManager();
            managerRef.current = manager;
            
            try {
                // Using Rice model as default
                await manager.manifest(canvasRef.current!, '/avatar/Rice/Rice.model3.json');
            } catch (e) {
                console.error('[MIA] Fallback: Avatar rendering disabled.', e);
            }
        };

        init();

        return () => {
            managerRef.current?.destroy();
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,204,0.2))' }}
        />
    );
};

export default AvatarRenderer;
