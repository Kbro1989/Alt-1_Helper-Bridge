/**
 * src/utils/SovereignSensoryLoop.ts
 * Transient screen monitoring loop - ZERO disk persistence, pure structural feedback.
 */
import { processImageForColoring } from './imageProcessor'; // Reusing your segmentation logic

export type SensoryFeedback = {
    type: 'TACTICAL_ALERT' | 'STATE_CHANGE' | 'METRIC_UPDATE';
    data: any;
    timestamp: number;
};

export class SovereignSensoryLoop {
    private isRunning = false;
    private listeners: Array<(feedback: SensoryFeedback) => void> = [];

    constructor(
        private readonly captureCanvas: () => ImageData | null,
        private readonly onFeedback: (feedback: SensoryFeedback) => void
    ) {}

    public start(fps: number = 5) {
        if (this.isRunning) return;
        this.isRunning = true;
        
        const interval = 1000 / fps;
        const loop = async () => {
            if (!this.isRunning) return;

            // 1. Transient Capture
            const imageData = this.captureCanvas();
            if (imageData) {
                // 2. Structural Analysis (Memory-Resident Only)
                const processed = await processImageForColoring(imageData);
                
                // 3. Inference (Gateway logic)
                const feedback = this.interpret(processed);
                if (feedback) {
                    this.onFeedback(feedback);
                }
            }

            // Explicitly hint garbage collector for raw image data if needed, 
            // though JS engine handles transient scope well.
            
            setTimeout(loop, interval);
        };
        loop();
    }

    public stop() {
        this.isRunning = false;
    }

    private interpret(data: any): SensoryFeedback | null {
        // Here, map your structural data (regions/centroids) to game-relevant feedback
        // This is where the 'Palette Line Segment' logic is applied
        return {
            type: 'METRIC_UPDATE',
            data: { regionCount: data.regions.length },
            timestamp: Date.now()
        };
    }
}
