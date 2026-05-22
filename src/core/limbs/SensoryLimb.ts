/**
 * SensoryLimb.ts
 * Sovereign Sensory Limb: Telemetry fusion and activity classification.
 * POG2 Domain: SENSORY (Sensory Cortex)
 */

import type { IAegisLimb, LimbStatus, LimbOutput, TelemetrySnapshot } from '../limb/Limb';
import { detectGameMode, type GameMode } from '../../core/modeDetector';

export class SensoryLimb implements IAegisLimb {
  public readonly id = 'SENSORY_CORTEX';
  public readonly domain = 'SENSORY';
  public status: LimbStatus = LimbStatus.ACTIVE;

  private currentMode: GameMode = 'unknown';

  public async pulse(telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    const detectedMode = detectGameMode(telemetry);

    if (detectedMode !== this.currentMode) {
      this.currentMode = detectedMode;

      return {
        payload: { event: 'MODE_SHIFT', oldMode: this.currentMode, newMode: detectedMode },
        confidence: 1.0,
        metabolicCost: 5,
        stage: 0,
        decision: 'EXECUTE'
      };
    }

    return null;
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
    this.currentMode = 'unknown';
  }

  public getCurrentMode(): GameMode {
    return this.currentMode;
  }
}
