/**
 * CombatRotationEngine.ts
 * Lightweight Alt1-AI adaptation of POG2 combat rotation logic.
 */
import { ABILITY_LIBRARY, type AbilityDefinition } from './AdrenalineStateMachine.js';

export interface CombatEvaluationContext {
    adrenaline: number;
    style: 'MELEE' | 'RANGED' | 'MAGIC' | 'NECROMANCY';
    availableAbilityIds: string[];
}

export class CombatRotationEngine {
    private static instance: CombatRotationEngine;

    public static getInstance(): CombatRotationEngine {
        if (!this.instance) this.instance = new CombatRotationEngine();
        return this.instance;
    }

    public evaluateOptimalAbility(ctx: CombatEvaluationContext): AbilityDefinition | null {
        // Simple priority: Ultimate > Threshold > Basic
        // Based on adrenaline requirement and availability
        const candidates = ctx.availableAbilityIds
            .map(id => ABILITY_LIBRARY[id])
            .filter(a => a && a.adrenalineRequired <= ctx.adrenaline)
            .sort((a, b) => b.adrenalineRequired - a.adrenalineRequired);

        return candidates[0] || null;
    }
}
