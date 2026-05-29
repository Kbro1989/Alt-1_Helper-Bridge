/**
 * LunaLimb.ts
 * Sovereign Luna Training Collector: High-fidelity telemetry and visual ingestion.
 * POG2 Domain: INGESTION (Luna Training)
 */

import { LimbStatus } from '../limb/Limb';
import type { IAegisLimb, LimbOutput, TelemetrySnapshot } from '../limb/Limb';

export interface LunaSnapshot {
  timestamp: number;
  telemetry: TelemetrySnapshot;
  visual: string; // base64
  decisions: LimbOutput[];
}

export class LunaLimb implements IAegisLimb {
  public readonly id = 'LUNA_COLLECTOR';
  public readonly domain = 'INGESTION';
  public status: LimbStatus = LimbStatus.ACTIVE;

  private buffer: LunaSnapshot[] = [];
  private readonly MAX_BUFFER = 50; // Smaller buffer for high-fidelity cycles
  private isCollecting: boolean = false;

  public async pulse(_telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    return null;
  }

  /**
   * Capture a full downstream cycle.
   */
  public record(telemetry: TelemetrySnapshot, visual: string, decisions: LimbOutput[]) {
    if (!this.isCollecting) return;

    const sample: LunaSnapshot = {
      timestamp: Date.now(),
      telemetry,
      visual,
      decisions
    };

    this.buffer.push(sample);

    if (this.buffer.length >= this.MAX_BUFFER) {
      this.flush();
    }
  }

  public setCollecting(active: boolean) {
    this.isCollecting = active;
  }

  private flush() {
    if (this.buffer.length === 0) return;

    const payload = JSON.stringify(this.buffer);
    // In a browser environment, we might push to an API or download as blob.
    // For now, we'll use a specific localStorage key that an external script can scrape.
    const key = `luna_ingestion_${Date.now()}`;
    try {
      localStorage.setItem(key, payload);
      console.log(`[LunaLimb] Flushed ${this.buffer.length} samples to local storage.`);
    } catch (e) {
      console.error('[LunaLimb] Failed to flush buffer (Storage Full?):', e);
    }
    
    this.buffer = [];
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
    this.buffer = [];
  }

  public getBufferSize() {
    return this.buffer.length;
  }
}
