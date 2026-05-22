/**
 * Limb.ts
 * Sovereign Interface for Aegis Cognitive Limbs.
 * Derived from POG2 Distributed Orchestration Cognition (DOC).
 */

import type { ChatLine, Buff } from '../../utils/alt1Bridge';

export enum LimbStatus {
  ACTIVE = 'ACTIVE',   // Nominal operation
  DORMANT = 'DORMANT', // Low-power/Idle (Stage 0/1 only)
  ERROR = 'ERROR',     // Substrate failure
  GHOST = 'GHOST',     // Fail-safe/Deterministic mode (The Ghost Limb)
}

export interface LimbOutput {
  payload: unknown;
  confidence: number; // 0.0 - 1.0
  metabolicCost: number; // Latency in ms / Token cost
  stage: number; // 0 (Deterministic) through 4 (Cloud)
  decision: 'EXECUTE' | 'MODIFY' | 'DEFER';
}

export interface TelemetrySnapshot {
  buffs: Buff[];
  debuffs: Buff[];
  target: { hp: number; name: string } | null;
  bossTimer: { minpart: number; secpart: number; time: number } | null;
  xpDrops: string[];
  chatLines: ChatLine[];
  tooltip: { text: string; area?: { x: number; y: number; width: number; height: number } } | null;
  dialog: { text: string[] | null; title: string } | null;
}

export interface IAegisLimb {
  id: string;
  domain: string;
  status: LimbStatus;

  /**
   * The "Heartbeat" - called every 600ms tick.
   * Processes telemetry and returns a decision.
   */
  pulse(telemetry: TelemetrySnapshot): Promise<LimbOutput | null>;

  /**
   * Sovereign Reset - allows the limb to recalibrate its internal state.
   */
  recalibrate(): Promise<void>;
}
