/**
 * MemoryLimb.ts
 * Sovereign Memory Limb: Handles session persistence and temporal pattern recognition.
 * POG2 Domain: MEMORY (Hippocampus)
 */

import { LimbStatus } from '../limb/Limb';
import type { IAegisLimb, LimbOutput, TelemetrySnapshot } from '../limb/Limb';

interface SessionMemory {
  deaths: { bossName: string; timestamp: number }[];
  overloadsConsumed: { timestamp: number; doseDue: number }[];
  geTrades: { itemName: string; price: number; quantity: number; action: 'buy' | 'sell'; timestamp: number }[];
}

export class MemoryLimb implements IAegisLimb {
  public readonly id = 'HIPPOCAMPUS';
  public readonly domain = 'MEMORY';
  public status: LimbStatus = LimbStatus.ACTIVE;

  private memory: SessionMemory;

  constructor() {
    const raw = localStorage.getItem('aegis_session_memory');
    this.memory = raw ? JSON.parse(raw) : { deaths: [], overloadsConsumed: [], geTrades: [] };
  }

  public async pulse(telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    // Detect death in chat or telemetry diffs
    const deathDetected = telemetry.chatLines.some(line => line.toLowerCase().includes('you died'));

    if (deathDetected) {
      const deathEntry = {
        bossName: telemetry.target?.name || 'Unknown',
        timestamp: Date.now()
      };
      this.memory.deaths.push(deathEntry);
      this.sync();

      return {
        payload: { event: 'DEATH_LOGGED', data: deathEntry },
        confidence: 1.0,
        metabolicCost: 1,
        stage: 0,
        decision: 'EXECUTE'
      };
    }

    return null;
  }

  public logTrade(trade: SessionMemory['geTrades'][number]) {
    this.memory.geTrades.push(trade);
    this.sync();
  }

  public logOverload(doseDue: number) {
    this.memory.overloadsConsumed.push({ timestamp: Date.now(), doseDue });
    this.sync();
  }

  private sync() {
    localStorage.setItem('aegis_session_memory', JSON.stringify(this.memory));
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
  }

  public getState() {
    return this.memory;
  }
}
