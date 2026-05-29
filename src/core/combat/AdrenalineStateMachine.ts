/**
 * AdrenalineStateMachine
 * Sovereign reconstruction of RS3 combat mechanics.
 */

import { CanonicalClock } from '../../utils/CanonicalClock.js';

export const RS3_TICK_MS = 600;

export type AbilityTier = 'BASIC' | 'THRESHOLD' | 'ULTIMATE' | 'SPECIAL';

export interface AbilityDefinition {
    id: string;
    name: string;
    tier: AbilityTier;
    cooldownTicks: number;
    adrenalineGain: number;
    adrenalineRequired: number;
    damage?: { min: number; max: number };
    style: 'MELEE' | 'RANGED' | 'MAGIC' | 'NECROMANCY';
}

export interface SlotState {
    slotIndex: number;
    ability: AbilityDefinition | null;
    cooldownTicksRemaining: number;
    isActive: boolean;
}

export interface CombatState {
    adrenaline: number;
    inCombat: boolean;
    style: 'MELEE' | 'RANGED' | 'MAGIC' | 'NECROMANCY';
    tickCount: number;
    hp: number;
    maxHp: number;
    prayerPoints: number;
}

export type CombatEvent =
    | { type: 'ABILITY_USED'; ability: AbilityDefinition; damage: number }
    | { type: 'ADRENALINE_CHANGED'; from: number; to: number }
    | { type: 'ABILITY_OFF_COOLDOWN'; slotIndex: number; ability: AbilityDefinition }
    | { type: 'HP_CHANGED'; from: number; to: number; source: string }
    | { type: 'TICK'; tickCount: number };

export type CombatEventHandler = (event: CombatEvent) => void;

export const ABILITY_LIBRARY: Record<string, AbilityDefinition> = {
    SLICE: {
        id: 'SLICE', name: 'Slice', tier: 'BASIC', cooldownTicks: 3,
        adrenalineGain: 80, adrenalineRequired: 0,
        damage: { min: 12, max: 30 }, style: 'MELEE'
    },
    FURY: {
        id: 'FURY', name: 'Fury', tier: 'BASIC', cooldownTicks: 3,
        adrenalineGain: 80, adrenalineRequired: 0,
        damage: { min: 16, max: 38 }, style: 'MELEE'
    },
    CLEAVE: {
        id: 'CLEAVE', name: 'Cleave', tier: 'BASIC', cooldownTicks: 3,
        adrenalineGain: 80, adrenalineRequired: 0,
        damage: { min: 14, max: 34 }, style: 'MELEE'
    },
    ASSAULT: {
        id: 'ASSAULT', name: 'Assault', tier: 'THRESHOLD', cooldownTicks: 30,
        adrenalineGain: -500, adrenalineRequired: 500,
        damage: { min: 94, max: 217 }, style: 'MELEE'
    },
    DESTROY: {
        id: 'DESTROY', name: 'Destroy', tier: 'THRESHOLD', cooldownTicks: 25,
        adrenalineGain: -500, adrenalineRequired: 500,
        damage: { min: 50, max: 120 }, style: 'MELEE'
    },
    METEOR_STRIKE: {
        id: 'METEOR_STRIKE', name: 'Meteor Strike', tier: 'ULTIMATE', cooldownTicks: 100,
        adrenalineGain: -1000, adrenalineRequired: 1000,
        damage: { min: 200, max: 400 }, style: 'MELEE'
    },
    BERSERK: {
        id: 'BERSERK', name: 'Berserk', tier: 'ULTIMATE', cooldownTicks: 100,
        adrenalineGain: -1000, adrenalineRequired: 1000,
        damage: { min: 0, max: 0 }, style: 'MELEE'
    },
};

export const DEFAULT_ACTION_BAR: (string | null)[] = [
    'SLICE', 'FURY', 'CLEAVE', null,
    'ASSAULT', 'DESTROY', null, null,
    'METEOR_STRIKE', 'BERSERK', null, null,
    null, null
];

export class AdrenalineStateMachine {
    private state: CombatState;
    private slots: SlotState[];
    private listeners: CombatEventHandler[] = [];
    private isTicking: boolean = false;

    constructor(style: CombatState['style'] = 'MELEE') {
        this.state = {
            adrenaline: 0,
            inCombat: false,
            style,
            tickCount: 0,
            hp: 9900,
            maxHp: 9900,
            prayerPoints: 990
        };

        this.slots = DEFAULT_ACTION_BAR.map((abilityId, index) => ({
            slotIndex: index,
            ability: abilityId ? ABILITY_LIBRARY[abilityId] ?? null : null,
            cooldownTicksRemaining: 0,
            isActive: false
        }));
    }

    on(handler: CombatEventHandler): void {
        this.listeners.push(handler);
    }

    private emit(event: CombatEvent): void {
        for (const h of this.listeners) h(event);
    }

    get currentState(): Readonly<CombatState> {
        return this.state;
    }

    get slotStates(): Readonly<SlotState[]> {
        return this.slots;
    }

    get adrenalinePct(): number {
        return this.state.adrenaline / 10;
    }

    startCombat(): void {
        if (this.isTicking) return;
        this.state.inCombat = true;
        this.isTicking = true;
        CanonicalClock.getInstance().registerPulse({
            callback: (_tick: number) => this.tick()
        });
    }

    stopCombat(): void {
        this.isTicking = false;
        this.state.inCombat = false;
    }

    useAbility(slotIndex: number): number | null {
        const slot = this.slots[slotIndex];
        if (!slot?.ability) return null;

        const ability = slot.ability;

        if (slot.cooldownTicksRemaining > 0) return null;
        if (this.state.adrenaline < ability.adrenalineRequired) return null;

        const prevAdrenaline = this.state.adrenaline;
        this.state.adrenaline = Math.max(0, Math.min(1000,
            this.state.adrenaline + ability.adrenalineGain
        ));
        slot.cooldownTicksRemaining = ability.cooldownTicks;
        slot.isActive = true;

        const damage = ability.damage
            ? Math.floor(Math.random() * (ability.damage.max - ability.damage.min + 1)) + ability.damage.min
            : 0;

        this.emit({ type: 'ABILITY_USED', ability, damage });
        this.emit({ type: 'ADRENALINE_CHANGED', from: prevAdrenaline, to: this.state.adrenaline });

        return damage;
    }

    public tick(): void {
        this.state.tickCount++;

        for (const slot of this.slots) {
            if (slot.cooldownTicksRemaining > 0) {
                slot.cooldownTicksRemaining--;
                slot.isActive = false;
                if (slot.cooldownTicksRemaining === 0 && slot.ability) {
                    this.emit({ type: 'ABILITY_OFF_COOLDOWN', slotIndex: slot.slotIndex, ability: slot.ability });
                }
            }
        }

        const regen = this.state.style === 'MAGIC' ? 30 : 80;
        const prevAdrenaline = this.state.adrenaline;
        this.state.adrenaline = Math.min(1000, this.state.adrenaline + regen);
        if (this.state.adrenaline !== prevAdrenaline) {
            this.emit({ type: 'ADRENALINE_CHANGED', from: prevAdrenaline, to: this.state.adrenaline });
        }

        this.emit({ type: 'TICK', tickCount: this.state.tickCount });
    }

    dispose(): void {
        this.stopCombat();
        this.listeners = [];
    }
}
