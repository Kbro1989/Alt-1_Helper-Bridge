/**
 * MotorLimb.ts
 * Sovereign Motor Limb: Priority arbitration and AR command generation.
 * POG2 Domain: MOTOR (Motor Cortex)
 */

import { LimbStatus } from '../limb/Limb';
import type { IAegisLimb, LimbOutput, TelemetrySnapshot } from '../limb/Limb';
import { Thalamus } from '../Thalamus';
import { SensoryLimb } from './SensoryLimb';
import { generateGuidance } from '../../core/guidanceEngine';
import { renderClickGuide } from '../../utils/clickGuide';

export class MotorLimb implements IAegisLimb {
  public readonly id = 'MOTOR_CORTEX';
  public readonly domain = 'MOTOR';
  public status: LimbStatus = LimbStatus.ACTIVE;

  public async pulse(telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    // Query the central Thalamus for the sensory limb's current mode (strongly typed)
    const sensory = Thalamus.getInstance().getLimb<SensoryLimb>('SENSORY');
    const mode = sensory?.getCurrentMode?.() ?? 'unknown';
    const guidance = generateGuidance(mode, telemetry, null);

    if (guidance) {
      // Check for critical threats first (POG2 Priority Matrix)
      const isCritical = telemetry.target?.hp ? (telemetry.target.hp / 100 < 0.4) : false;

      return {
        payload: {
          text: guidance.speak,
          urgency: guidance.priority === 'critical' ? 'CRITICAL' : 'NORMAL',
          clickTarget: this.calculateClickTarget(guidance.speak)
        },
        confidence: 0.9,
        metabolicCost: 10,
        stage: 0,
        decision: 'EXECUTE'
      };
    }

    return null;
  }

  private calculateClickTarget(guidance: string): { x: number; y: number; label: string } | null {
    // Simple keyword-to-coord mapping for the prototype
    if (guidance.includes('Eat')) return { x: 1200, y: 900, label: 'Food' };
    if (guidance.includes('Restore')) return { x: 1200, y: 850, label: 'Prayer Pot' };
    return null;
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
  }
}
