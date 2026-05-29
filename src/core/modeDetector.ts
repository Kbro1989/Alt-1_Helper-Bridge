// =============================================================================
// src/core/modeDetector.ts
// Intelligent Game Mode Inference Engine
// =============================================================================

import { type TelemetrySnapshot } from './limb/Limb';

export type GameMode = 
  | 'combat-boss'      // Boss timer active, high HP target
  | 'combat-slayer'    // Slayer target, no boss timer
  | 'skilling-afk'     // XP dropping steadily, no target
  | 'skilling-active'  // XP dropping, interface open (herblore, etc)
  | 'ge-trading'       // GE interface detected
  | 'banking'          // Bank interface detected
  | 'clue-scroll'      // Clue interface or clue text in chat
  | 'quest-dialog'     // NPC dialog open
  | 'idle-lobby'       // No XP, no target, no interface
  | 'unknown';

export function detectGameMode(telemetry: TelemetrySnapshot): GameMode {
  // 1. Clue Scroll Mode
  const chatHasClue = telemetry.chatLines.some(l => 
    l.text.toLowerCase().includes('clue scroll') || 
    l.text.toLowerCase().includes('treasure scroll')
  );
  const tooltipHasClue = telemetry.tooltip?.text.toLowerCase().includes('clue scroll') || 
                         telemetry.tooltip?.text.toLowerCase().includes('casket');
  if (chatHasClue || tooltipHasClue) return 'clue-scroll';

  // 2. NPC Dialog / Questing
  if (telemetry.dialog && telemetry.dialog.text && telemetry.dialog.text.length > 0) {
    return 'quest-dialog';
  }

  // 3. Grand Exchange / Trading
  if (telemetry.tooltip?.text.toLowerCase().includes('grand exchange') || 
      telemetry.tooltip?.text.toLowerCase().includes('ge slot') ||
      telemetry.chatLines.some(l => l.text.toLowerCase().includes('grand exchange'))) {
    return 'ge-trading';
  }

  // 4. Banking
  if (telemetry.tooltip?.text.toLowerCase().includes('bank') || 
      telemetry.tooltip?.text.toLowerCase().includes('withdraw') ||
      telemetry.tooltip?.text.toLowerCase().includes('deposit')) {
    return 'banking';
  }

  // 5. Boss Combat
  if (telemetry.bossTimer && telemetry.bossTimer.time > 0) {
    return 'combat-boss';
  }

  // 6. General Combat / Slayer
  if (telemetry.target && telemetry.target.hp > 0) {
    return 'combat-slayer';
  }

  // 7. Active Skilling (XP counter moving, tooltip suggests interaction)
  const hasXp = telemetry.xpDrops.length > 0;
  if (hasXp) {
    // If tooltip suggests interface/actions
    const isInteractive = telemetry.tooltip?.text.match(/(use|craft|make|fletch|brew|cook|smelt)/i);
    return isInteractive ? 'skilling-active' : 'skilling-afk';
  }

  // 8. Idle/Lobby (No XP drops, no combat target, no active interface)
  if (!hasXp && (!telemetry.target || telemetry.target.hp <= 0)) {
    return 'idle-lobby';
  }

  return 'unknown';
}
