/**
 * Thalamus.ts
 * The Central Relay and Orchestrator of the Aegis Limb Cluster.
 * Implements the 600ms tick heartbeat and the Capability Cascade.
 */

import { LimbStatus } from './limb/Limb';
import type { IAegisLimb, TelemetrySnapshot, LimbOutput } from './limb/Limb';
import { SensoryLimb } from './limbs/SensoryLimb';
import { MotorLimb } from './limbs/MotorLimb';
import { AudioLimb } from './limbs/AudioLimb';
import { MemoryLimb } from './limbs/MemoryLimb';
import { MarketLimb } from './limbs/MarketLimb';
import { OracleLimb } from './limbs/OracleLimb';
import { VisualLimb } from './limbs/VisualLimb';

export class Thalamus {
  private static instance: Thalamus;
  private limbs: Map<string, IAegisLimb> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize Sovereign Limb Cluster
    this.limbs.set('SENSORY', new SensoryLimb());
    this.limbs.set('MEMORY', new MemoryLimb());
    this.limbs.set('ORACLE', new OracleLimb());
    this.limbs.set('MOTOR', new MotorLimb());
    this.limbs.set('AUDIO', new AudioLimb());
    this.limbs.set('MARKET', new MarketLimb());
    this.limbs.set('VISUAL', new VisualLimb());
  }

  public static getInstance(): Thalamus {
    if (!Thalamus.instance) {
      Thalamus.instance = new Thalamus();
    }
    return Thalamus.instance;
  }

  public startHeartbeat(telemetryProvider: () => TelemetrySnapshot) {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(async () => {
      const telemetry = telemetryProvider();

      // 1. Sensory Pulse (The first limb to fire)
      const sensoryOutput = await this.getLimb('SENSORY').pulse(telemetry);

      // 2. Memory Sync
      await this.getLimb('MEMORY').pulse(telemetry);

      // 3. Motor Decision
      const motorOutput = await this.getLimb('MOTOR').pulse(telemetry);

      // 4. Orchestrate Actions based on Motor Output
      if (motorOutput) {
        this.dispatchMotorCommand(motorOutput);
      }

      // 5. Ambient Oracle check (Low-priority pulse)
      // This is where we'd implement the "Siri" mode logic
    }, 600);
  }

  public stopHeartbeat() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private dispatchMotorCommand(output: LimbOutput) {
    const payload = output.payload;

    // Dispatch to AudioLimb
    if (payload.text) {
      const audio = this.getLimb('AUDIO') as AudioLimb;
      audio.speak(payload.text);
    }

    // Dispatch to VisualLimb
    if (payload.clickTarget) {
      const visual = this.getLimb('VISUAL') as VisualLimb;
      visual.renderPing(
        payload.clickTarget.x,
        payload.clickTarget.y,
        100, 100,
        payload.clickTarget.label
      );
    }
  }

  public getLimb<T extends IAegisLimb>(id: string): T {
    const limb = this.limbs.get(id);
    if (!limb) throw new Error(`Limb ${id} not found in Thalamus`);
    return limb as T;
  }
}
