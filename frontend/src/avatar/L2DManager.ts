import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

// Shim for PixiJS v7 compatibility with pixi-live2d-display
const pixiWithUtils = PIXI as unknown as { utils: { skipHello: () => void; url: { resolve: (base: string, url: string) => string } } };
if (!pixiWithUtils.utils) {
    pixiWithUtils.utils = {
        skipHello: () => {},
        url: {
            resolve: (base: string, url: string) => new URL(url, base).href
        }
    };
}

export class L2DManager {
    private app: PIXI.Application | null = null;
    private model: Live2DModel | null = null;

    constructor() {
        // Register ticker for Live2D
        try {
            // @ts-expect-error - PixiJS v7 Ticker type mismatch with pixi-live2d-display
            Live2DModel.registerTicker(PIXI.Ticker.shared);
        } catch (e) {
            console.warn('[MIA] Ticker already registered or failed:', e);
        }
    }

    async manifest(canvas: HTMLCanvasElement, modelUrl: string) {
        try {
            this.app = new PIXI.Application({
                view: canvas,
                backgroundAlpha: 0,
                resizeTo: canvas.parentElement || undefined,
                antialias: true,
                autoStart: true,
                // Force WebGL 1 for better compatibility with old Intel HD 2500
                forceCanvas: false,
            });

            console.log('[MIA] Initializing Live2D Model:', modelUrl);
            
            this.model = await Live2DModel.from(modelUrl);
            this.app.stage.addChild(this.model as unknown as PIXI.DisplayObject);
            
            // Auto-scale to fit
            const scale = Math.min(
                this.app.screen.width / this.model.width,
                this.app.screen.height / this.model.height
            ) * 0.8;
            
            this.model.scale.set(scale);
            this.model.anchor.set(0.5, 0.5);
            this.model.position.set(this.app.screen.width / 2, this.app.screen.height / 2);

        } catch (err) {
            console.error('[MIA] Avatar Initialization failure:', err);
        }
    }

    destroy() {
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
            this.app = null;
        }
        this.model = null;
    }
}
