// =============================================================================
// src/core/guidanceEngine.ts
// Contextual & State-Aware Guidance Generator
// =============================================================================

import { type GameMode } from './modeDetector';
import { type TelemetrySnapshot } from './limb/Limb';
import { mixColor } from '../utils/alt1Bridge';

export interface GuidanceAction {
  speak: string;
  overlay?: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    color: number;
  };
  alarm?: 'siren' | 'chime' | 'bell';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

function generateRawGuidance(
  mode: GameMode,
  telemetry: TelemetrySnapshot,
  previous: TelemetrySnapshot | null
): GuidanceAction | null {
  if (!previous) return null;

  // ---------------------------------------------------------------------------
  // 1. Critical Boss Combat Guidance
  // ---------------------------------------------------------------------------
  if (mode === 'combat-boss') {
    // Detect boss ultimate activation in chat logs (e.g. Zamorak ultimate)
    const newChatLines = telemetry.chatLines.filter(
      line => !previous.chatLines.some(old => old.text === line.text)
    );
    
    const hasZamorakUlt = newChatLines.some(l => 
      l.text.toLowerCase().includes('zamorak') && 
      (l.text.toLowerCase().includes('channeling') || l.text.toLowerCase().includes('infernal tomb'))
    );
    if (hasZamorakUlt) {
      return {
        speak: "Zamorak is channeling infernal tomb! Quick, deflect magic and prep resonance.",
        priority: 'critical',
        alarm: 'siren',
        overlay: {
          x: 960,
          y: 540,
          w: 120,
          h: 120,
          label: "Zamorak Ultimate Warning",
          color: mixColor(255, 50, 50)
        }
      };
    }

    const hasTelosUlt = newChatLines.some(l =>
      l.text.toLowerCase().includes('telos') && l.text.toLowerCase().includes('prepare')
    );
    if (hasTelosUlt) {
      return {
        speak: "Telos is preparing a heavy magic attack. Reflect now.",
        priority: 'critical',
        alarm: 'siren',
        overlay: {
          x: 960,
          y: 540,
          w: 100,
          h: 100,
          label: "Reflect Shield",
          color: mixColor(255, 50, 50)
        }
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Telemetry Buff Expiration Alerts
  // ---------------------------------------------------------------------------
  // Check if overload expired
  // Look at buff list difference (if previously had overload and now don't)
  // Let's assume Buff name is inside telemetry buffs. We can check by text or image markers.
  // In RS3/Alt1, BuffReader compares buff icons. Let's do simple search in tooltip or chat logs,
  // or a placeholder check.
  const prevHasOverload = previous.buffs.some(b => b.readTime() !== null);
  const curHasOverload = telemetry.buffs.some(b => b.readTime() !== null);
  
  if (prevHasOverload && !curHasOverload) {
    return {
      speak: "Your overload potion has expired. Drink another dose immediately.",
      priority: 'high',
      alarm: 'bell',
      overlay: {
        x: 850,
        y: 80,
        w: 45,
        h: 45,
        label: "Re-dose Overload",
        color: mixColor(255, 120, 0)
      }
    };
  }

  // Check if prayer renewal expired
  const chatExpiredRenewal = telemetry.chatLines.some(l => 
    l.text.toLowerCase().includes('renewal') && l.text.toLowerCase().includes('expired')
  );
  if (chatExpiredRenewal) {
    return {
      speak: "Prayer renewal has expired. Drink a dose to prevent prayer points drain.",
      priority: 'high',
      alarm: 'bell'
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Grand Exchange Slot Trading Signals
  // ---------------------------------------------------------------------------
  if (mode === 'ge-trading') {
    // If hovering a new item in GE slot, check cache or offer advice
    const hoveredItemName = telemetry.tooltip?.text.split('\n')[0] || '';
    const prevHoveredItemName = previous.tooltip?.text.split('\n')[0] || '';
    
    if (hoveredItemName && hoveredItemName !== prevHoveredItemName) {
      // Clean up common prefixes like "Value:" or "Examine:"
      const cleanName = hoveredItemName.replace(/^(Tradeable|Untradeable|Members|Value|Examine)\s*/i, '').trim();
      if (cleanName && cleanName.length > 2) {
        return {
          speak: `Aegis has detected hover on ${cleanName}. Scan item or check margin signals.`,
          priority: 'medium',
          alarm: 'chime',
          overlay: {
            x: telemetry.tooltip?.area ? telemetry.tooltip.area.x + 20 : 500,
            y: telemetry.tooltip?.area ? telemetry.tooltip.area.y - 40 : 300,
            w: telemetry.tooltip?.area ? telemetry.tooltip.area.width : 100,
            h: telemetry.tooltip?.area ? telemetry.tooltip.area.height : 50,
            label: `GE Slot: ${cleanName}`,
            color: mixColor(0, 240, 255)
          }
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Clue Scroll Interface Telemetry
  // ---------------------------------------------------------------------------
  if (mode === 'clue-scroll') {
    const isNewClue = telemetry.tooltip && (!previous.tooltip || previous.tooltip.text !== telemetry.tooltip.text);
    if (isNewClue) {
      return {
        speak: "Active clue scroll identified. Click decipher or ask Aegis to solve coordinate map.",
        priority: 'medium',
        alarm: 'chime'
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 5. AFK Idle Warning
  // ---------------------------------------------------------------------------
  if (mode === 'idle-lobby') {
    const wasBusy = previous.target || previous.xpDrops.length > 0;
    if (wasBusy) {
      return {
        speak: "Aegis signals combat and skilling operations have ceased. You are idle.",
        priority: 'medium',
        alarm: 'bell'
      };
    }
  }

  return null;
}

const cooldowns = new Map<string, number>();

export function generateGuidance(
  mode: GameMode,
  telemetry: TelemetrySnapshot,
  previous: TelemetrySnapshot | null
): GuidanceAction | null {
  const guidance = generateRawGuidance(mode, telemetry, previous);
  if (guidance) {
    const key = guidance.speak;
    const lastTime = cooldowns.get(key) || 0;
    const now = Date.now();
    
    // Critical messages get 10s cooldown, other messages get 30s cooldown
    const cooldownMs = guidance.priority === 'critical' ? 10000 : 30000;
    
    if (now - lastTime < cooldownMs) {
      return null;
    }
    
    cooldowns.set(key, now);
  }
  return guidance;
}
