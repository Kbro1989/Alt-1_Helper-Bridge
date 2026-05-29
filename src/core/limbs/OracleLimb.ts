/**
 * OracleLimb.ts
 * Sovereign Oracle Limb: LLM swarm orchestration and response parsing.
 * POG2 Domain: LITERARY (Oracle Cortex)
 */

import { LimbStatus } from '../limb/Limb';
import type { IAegisLimb, LimbOutput, TelemetrySnapshot } from '../limb/Limb';
import { askLocalOracle } from '../../utils/ollamaBridge';
import { CombatRotationEngine } from '../combat/CombatRotationEngine';

// Agent Swarm Configuration
const THINK_MODEL = 'moondream'; // Use a fast small model for reasoning
const AGENT_MODELS: Record<string, string> = {
  vision: 'moondream',
  coding: 'qwen2.5-coder:7b-instruct-q4_K_M',
  general: 'llava-phi3',
  combat: 'llava-phi3' // Added combat agent
};

export class OracleLimb implements IAegisLimb {
  public readonly id = 'ORACLE_CORTEX';
  public readonly domain = 'LITERARY';
  public status: LimbStatus = LimbStatus.ACTIVE;

  public async pulse(_telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    return null;
  }

  public async query(prompt: string, _telemetry: TelemetrySnapshot, visualSnapshot?: string, context?: string): Promise<LimbOutput> {
    try {
        const fullPrompt = context ? `Context: ${context}\n\nUser Query: ${prompt}` : prompt;
        const hasVision = visualSnapshot && visualSnapshot.length > 100;
        
        // 1. Ask the "think" model to choose the best agent
        const reasoningPrompt = `Task: Assign the best agent model to handle the user query.
Available agents: ${Object.keys(AGENT_MODELS).join(', ')}.
${hasVision ? 'Vision input is available.' : 'Vision input is unavailable. Rely purely on text context.'}
${context ? `Context: ${context}\n` : ''}
User query: "${fullPrompt}"
Respond with ONLY the agent name.`;
        
        const decision = await askLocalOracle('', reasoningPrompt, THINK_MODEL);
        const selectedAgent = Object.keys(AGENT_MODELS).find(key => decision.toLowerCase().includes(key)) || 'general';
        const modelToUse = AGENT_MODELS[selectedAgent];

        // 3. Tactical Injection: If combat, use Rotation Engine
        let tacticalAdvice = "";
        if (selectedAgent === 'combat' || prompt.toLowerCase().includes('attack') || prompt.toLowerCase().includes('dps')) {
             const rotationEngine = CombatRotationEngine.getInstance();
             const optimal = rotationEngine.evaluateOptimalAbility({
                adrenaline: 500, // Placeholder: should be synced from combatant state
                style: 'MELEE',
                availableAbilityIds: ['SLICE', 'FURY', 'CLEAVE', 'ASSAULT']
             });
             if (optimal) tacticalAdvice = `\n[TACTICAL SUGGESTION]: Consider using ${optimal.name}.`;
        }

        // 2. Delegate to selected model
        const response = await askLocalOracle(
          hasVision ? visualSnapshot! : '',
          fullPrompt,
          modelToUse
        );

        return {
          payload: { text: `[${selectedAgent.toUpperCase()}] ${response} ${tacticalAdvice}` },
          confidence: hasVision ? 0.8 : 0.6,
          metabolicCost: hasVision ? 500 : 200,
          stage: 2,
          decision: 'EXECUTE'
        };
      } catch (e) {
        this.status = LimbStatus.ERROR;
        return {
          payload: { error: 'Swarm Oracle unavailable' },
          confidence: 0,
          metabolicCost: 10,
          stage: 2,
          decision: 'DEFER'
        };
      }
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
  }
}