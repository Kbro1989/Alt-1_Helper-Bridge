/**
 * Thalamus.ts
 * The Central Relay and Orchestrator of the Aegis Limb Cluster.
 * Implements the 600ms tick heartbeat and the Capability Cascade.
 */

import type { IAegisLimb, TelemetrySnapshot, LimbOutput, Plan } from './limb/Limb';
import { SensoryLimb } from './limbs/SensoryLimb';
import { MotorLimb } from './limbs/MotorLimb';
import { AudioLimb } from './limbs/AudioLimb';
import { MemoryLimb } from './limbs/MemoryLimb';
import { MarketLimb } from './limbs/MarketLimb';
import { OracleLimb } from './limbs/OracleLimb';
import { VisualLimb } from './limbs/VisualLimb';
import { LunaLimb } from './limbs/LunaLimb';
import { AdrenalineStateMachine } from './combat/AdrenalineStateMachine.js';

interface MotorPayload {
  text?: string;
  clickTarget?: { x: number; y: number; label: string };
}

export class Thalamus {
  private static instance: Thalamus;
  private limbs: Map<string, IAegisLimb> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  public activePlan: Plan | null = null;
  private telemetryRef: React.MutableRefObject<any> | null = null;
  public combatManager: AdrenalineStateMachine = new AdrenalineStateMachine();

  constructor() {
    // Initialize Sovereign Limb Cluster
    this.limbs.set('SENSORY', new SensoryLimb());
    this.limbs.set('MEMORY', new MemoryLimb());
    this.limbs.set('ORACLE', new OracleLimb());
    this.limbs.set('MOTOR', new MotorLimb());
    this.limbs.set('AUDIO', new AudioLimb());
    this.limbs.set('MARKET', new MarketLimb());
    this.limbs.set('VISUAL', new VisualLimb());
    this.limbs.set('LUNA', new LunaLimb());
  }

  public setTelemetryRef(ref: React.MutableRefObject<any>) {
    this.telemetryRef = ref;
  }

  public static getInstance(): Thalamus {
    if (!Thalamus.instance) {
      Thalamus.instance = new Thalamus();
    }
    return Thalamus.instance;
  }

  public startHeartbeat(telemetryProvider: () => TelemetrySnapshot, visualProvider?: () => string | null) {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(async () => {
      // --- PHASE 1: UPSTREAM (Data Ingestion & Perception) ---
      const telemetry = telemetryProvider();
      const visualSnapshot = visualProvider ? visualProvider() : null;
      const cycleDecisions: LimbOutput[] = [];

      // Perception: Spatial inference and mode detection
      const sensoryOutput = await this.getLimb('SENSORY').pulse(telemetry);
      if (sensoryOutput) cycleDecisions.push(sensoryOutput);

      // --- PHASE 2: MIDSTREAM (Cognition & Planning) ---
      
      // Retrieval: Contextual Memory
      const memoryOutput = await this.getLimb('MEMORY').pulse(telemetry);
      if (memoryOutput) cycleDecisions.push(memoryOutput);

      // Reasoning: Strategic Planning (Oracle)
      const now = Date.now();
      const lastOracleTick = (this as any).lastOracleTick || 0;
      if (now - lastOracleTick > 3000) {
        (this as any).lastOracleTick = now;
        const oracle = this.getLimb('ORACLE') as OracleLimb;
        
        if (oracle.status === 'ACTIVE') {
          const tabContext = this.telemetryRef?.current ? JSON.stringify(this.telemetryRef.current) : '';
          
          const oracleOutput = await oracle.query(
            this.activePlan 
              ? `Plan Progress Audit. Objective: ${this.activePlan.objective}. Evaluate and refine.`
              : "Tactical Assessment: Analyze state and propose strategic objective.",
            telemetry,
            visualSnapshot || undefined,
            tabContext
          );

          if (oracleOutput) {
            cycleDecisions.push(oracleOutput);
            if (oracleOutput.decision === 'PLAN' && oracleOutput.proposedPlan) {
              this.activePlan = oracleOutput.proposedPlan;
            }
          }
        }
      }

      // Decision: Tactical Command (Motor Decision)
      const motorOutput = await this.getLimb('MOTOR').pulse(telemetry);
      if (motorOutput) cycleDecisions.push(motorOutput);

      // --- PHASE 3: DOWNSTREAM (Execution & Action) ---
      
      if (motorOutput && motorOutput.decision === 'EXECUTE') {
        this.dispatchMotorCommand(motorOutput);
      }

      // --- PHASE 4: OBSERVER (Training Ingestion) ---
      
      // Capture the COMPLETE cycle: Ingest + Cognition + Action
      if (visualSnapshot) {
        (this.getLimb('LUNA') as LunaLimb).record(
          telemetry, 
          visualSnapshot, 
          cycleDecisions 
        );
      }
    }, 600);
  }

  public stopHeartbeat() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private dispatchMotorCommand(output: LimbOutput) {
    const payload = output.payload as MotorPayload;
    const stage = output.stage;

    // Dispatch to AudioLimb
    if (payload.text) {
      const audio = this.getLimb('AUDIO') as AudioLimb;
      // High-stage (LLM) responses might need different narration styles
      audio.speak(payload.text, stage >= 2 ? 'medium' : 'high');
    }

    // Dispatch to VisualLimb
    if (payload.clickTarget) {
      const visual = this.getLimb('VISUAL') as VisualLimb;
      // Color coding based on stage: Stage 0 (Green/Deterministic), Stage 2+ (Cyan/AI)
      const color = stage >= 2 ? 0x00FFFF : 0x00FF00;
      visual.renderPing(
        payload.clickTarget.x,
        payload.clickTarget.y,
        100, 100,
        payload.clickTarget.label,
        color
      );
    }
  }

  public getLimb<T extends IAegisLimb>(id: string): T {
    const limb = this.limbs.get(id);
    if (!limb) throw new Error(`Limb ${id} not found in Thalamus`);
    return limb as T;
  }
}
