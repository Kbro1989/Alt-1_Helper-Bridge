/**
 * OracleLimb.ts
 * Sovereign Oracle Limb: LLM prompt engineering and response parsing.
 * POG2 Domain: LITERARY (Oracle Cortex)
 */

import { LimbStatus } from '../limb/Limb';
import type { IAegisLimb, LimbOutput, TelemetrySnapshot } from '../limb/Limb';
import { askLocalOracle } from '../../utils/ollamaBridge';

export class OracleLimb implements IAegisLimb {
  public readonly id = 'ORACLE_CORTEX';
  public readonly domain = 'LITERARY';
  public status: LimbStatus = LimbStatus.ACTIVE;

  private aiMode: 'gemini' | 'ollama' = 'gemini';
  private ollamaModel: string = 'moondream';

  constructor(mode?: 'gemini' | 'ollama', model?: string) {
    this.aiMode = mode || 'gemini';
    this.ollamaModel = model || 'moondream';
  }

  public async pulse(telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    // The Oracle usually doesn't pulse autonomously unless prompted by a la "ambient loop"
    // This is where the "Siri-like" proactive guidance would be triggered.
    return null;
  }

  public async query(prompt: string, telemetry: TelemetrySnapshot): Promise<LimbOutput> {
    if (this.aiMode === 'ollama') {
      try {
        const response = await askLocalOracle(
          '', // base64Snapshot would go here
          prompt,
          this.ollamaModel
        );

        return {
          payload: { text: response },
          confidence: 0.8,
          metabolicCost: 500,
          stage: 2, // Local AI
          decision: 'EXECUTE'
        };
      } catch (e) {
        this.status = LimbStatus.ERROR;
        return {
          payload: { error: 'Local Oracle unavailable' },
          confidence: 0,
          metabolicCost: 10,
          stage: 2,
          decision: 'DEFER'
        };
      }
    }

    // Gemini implementation would follow a similar pattern (Stage 4)
    return {
      payload: { text: 'Gemini integration pending' },
      confidence: 0.5,
      metabolicCost: 2000,
      stage: 4,
      decision: 'DEFER'
    };
  }

  public setMode(mode: 'gemini' | 'ollama') {
    this.aiMode = mode;
  }

  public setModel(model: string) {
    this.ollamaModel = model;
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
  }
}
