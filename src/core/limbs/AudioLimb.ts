/**
 * AudioLimb.ts
 * Sovereign Auditory Limb: TTS synthesis and alarm orchestration.
 * POG2 Domain: AUDIO (Auditory Cortex)
 */

import { LimbStatus } from '../limb/Limb';
import type { IAegisLimb, LimbOutput, TelemetrySnapshot } from '../limb/Limb';
import { narrate, setNarratorVolume } from '../../core/voiceNarrator';

export class AudioLimb implements IAegisLimb {
  public readonly id = 'AUDITORY_CORTEX';
  public readonly domain = 'AUDIO';
  public status: LimbStatus = LimbStatus.ACTIVE;

  constructor(initialVolume?: number) {
    if (initialVolume) this.setVolume(initialVolume);
  }

  public async pulse(telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    // Auditory limb usually reacts to MotorLimb output, but can also trigger alarms
    // based on raw telemetry (e.g. "HP CRITICAL").
    if (telemetry.hp / telemetry.maxHp < 0.2) {
      return {
        payload: { event: 'Siren', text: 'HP CRITICAL' },
        confidence: 1.0,
        metabolicCost: 5,
        stage: 0,
        decision: 'EXECUTE'
      };
    }
    return null;
  }

  public async speak(text: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    await narrate(text, priority);
  }

  public setVolume(vol: number) {
    setNarratorVolume(vol);
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
  }
}
