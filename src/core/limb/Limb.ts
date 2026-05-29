/**
 * Limb.ts
 * Sovereign Interface for Aegis Cognitive Limbs.
 * Derived from POG2 Distributed Orchestration Cognition (DOC).
 */

import type { ChatLine, Buff } from '../../utils/alt1Bridge';

export const LimbStatus = {
  ACTIVE: 'ACTIVE',   // Nominal operation
  DORMANT: 'DORMANT', // Low-power/Idle (Stage 0/1 only)
  ERROR: 'ERROR',     // Substrate failure
  GHOST: 'GHOST',     // Fail-safe/Deterministic mode (The Ghost Limb)
} as const;

export type LimbStatus = (typeof LimbStatus)[keyof typeof LimbStatus];

export interface SpatialPoint {
  x: number;
  y: number;
  z?: number; // World-space depth if inferred
  frame: 'screen' | 'world' | 'minimap';
  confidence: number;
}

export interface Plan {
  id: string;
  objective: string;
  steps: string[];
  priority: number;
  expiresAt: number;
}

export interface LimbOutput {
  payload: unknown;
  confidence: number;
  metabolicCost: number;
  stage: number;
  decision: 'EXECUTE' | 'MODIFY' | 'DEFER' | 'PLAN';
  spatialTargets?: SpatialPoint[];
  proposedPlan?: Plan;
}

export interface TelemetrySnapshot {
  timestamp: number;
  hp: number;
  maxHp: number;
  buffs: Buff[];
  debuffs: Buff[];
  target: { 
    hp: number; 
    name: string;
    position?: SpatialPoint; // Screen-space inference
  } | null;
  bossTimer: { minpart: number; secpart: number; time: number } | null;
  xpDrops: string[];
  chatLines: ChatLine[];
  tooltip: { text: string; area?: { x: number; y: number; width: number; height: number } } | null;
  dialog: { text: string[] | null; title: string } | null;
  spatialContext: {
    viewport: { width: number; height: number };
    cameraAngle?: number; // Inferred from horizon/minimap
  };
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
