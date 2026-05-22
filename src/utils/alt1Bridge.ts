// =============================================================================
// src/utils/alt1Bridge.ts
// Complete bridge into the official Alt1 Toolkit (npm: alt1)
// Exposes ALL Alt1 sub-modules: base, chatbox, buffs, xpcounter, ocr,
// ability, bosstimer, dialog, dropsmenu, targetmob, tooltip
// =============================================================================

import * as a1lib from 'alt1/base';
import ChatBoxReader, { type ChatLine, type Chatbox } from 'alt1/chatbox';
import BuffReader, { type Buff, type BuffTextTypes } from 'alt1/buffs';
import XpcounterReader from 'alt1/xpcounter';
import BossTimerReader from 'alt1/bosstimer';
import DialogReader, { type DialogButton } from 'alt1/dialog';
import DropsMenuReader from 'alt1/dropsmenu';
import TargetMobReader from 'alt1/targetmob';
import TooltipReader from 'alt1/tooltip';
import { installedApps } from './installedApps';

// Re-export everything so consumers can import from one place
export {
  a1lib,
  ChatBoxReader, type ChatLine, type Chatbox,
  BuffReader, type Buff, type BuffTextTypes,
  XpcounterReader,
  BossTimerReader,
  DialogReader, type DialogButton,
  DropsMenuReader,
  TargetMobReader,
  TooltipReader,
};

// ---------------------------------------------------------------------------
// 1. Environment Detection
// ---------------------------------------------------------------------------

export interface Alt1Status {
  available: boolean;
  version: string | null;
  skinName: string;
  rsLinked: boolean;
  permissionPixel: boolean;
  permissionOverlay: boolean;
  permissionGameState: boolean;
}

export function getAlt1Status(): Alt1Status {
  if (!a1lib.hasAlt1) {
    return {
      available: false, version: null, skinName: 'browser',
      rsLinked: false, permissionPixel: false,
      permissionOverlay: false, permissionGameState: false,
    };
  }
  const w = window.alt1;
  return {
    available: true,
    version: w.version ?? null,
    skinName: a1lib.skinName,
    rsLinked: w.rsLinked ?? false,
    permissionPixel: w.permissionPixel ?? false,
    permissionOverlay: w.permissionOverlay ?? false,
    permissionGameState: w.permissionGameState ?? false,
  };
}

// ---------------------------------------------------------------------------
// 2. Screen Capture
// ---------------------------------------------------------------------------

export function captureRegion(x: number, y: number, w: number, h: number): ImageData | null {
  if (!a1lib.hasAlt1) return null;
  try { return a1lib.capture(x, y, w, h); }
  catch { return null; }
}

export async function captureRegionAsync(x: number, y: number, w: number, h: number): Promise<ImageData | null> {
  if (!a1lib.hasAlt1) return null;
  try { return await a1lib.captureAsync(x, y, w, h); }
  catch { return null; }
}

export function captureFullClient() {
  if (!a1lib.hasAlt1) return null;
  try { return a1lib.captureHoldFullRs(); }
  catch { return null; }
}

// ---------------------------------------------------------------------------
// 3. ChatBox Reader
// ---------------------------------------------------------------------------

let _chatbox: ChatBoxReader | null = null;

export function getChatboxReader(): ChatBoxReader {
  if (!_chatbox) _chatbox = new ChatBoxReader();
  return _chatbox;
}

export function findChatbox(): boolean {
  if (!a1lib.hasAlt1) return false;
  return getChatboxReader().find() !== null;
}

export function readChatLines(): ChatLine[] | null {
  if (!a1lib.hasAlt1) return null;
  const r = getChatboxReader();
  if (!r.pos) { if (!r.find()) return null; }
  return r.read();
}

// ---------------------------------------------------------------------------
// 4. Buff / Debuff Reader
// ---------------------------------------------------------------------------

let _buffs: BuffReader | null = null;
let _debuffs: BuffReader | null = null;

export function readBuffs(): Buff[] | null {
  if (!a1lib.hasAlt1) return null;
  if (!_buffs) _buffs = new BuffReader();
  if (!_buffs.pos) { if (!_buffs.find()) return null; }
  return _buffs.read() ?? null;
}

export function readDebuffs(): Buff[] | null {
  if (!a1lib.hasAlt1) return null;
  if (!_debuffs) { _debuffs = new BuffReader(); _debuffs.debuffs = true; }
  if (!_debuffs.pos) { if (!_debuffs.find()) return null; }
  return _debuffs.read() ?? null;
}

// ---------------------------------------------------------------------------
// 5. XP Counter Reader
// ---------------------------------------------------------------------------

let _xp: XpcounterReader | null = null;

export function readXpCounter(): string[] | null {
  if (!a1lib.hasAlt1) return null;
  if (!_xp) _xp = new XpcounterReader();
  return _xp.readSkills() ?? null;
}

// ---------------------------------------------------------------------------
// 6. Boss Timer Reader
// ---------------------------------------------------------------------------

let _boss: BossTimerReader | null = null;

export function readBossTimer(): { minpart: number; secpart: number; time: number } | null {
  if (!a1lib.hasAlt1) return null;
  if (!_boss) _boss = new BossTimerReader();
  if (!_boss.pos) { if (!_boss.find()) return null; }
  return _boss.read() ?? null;
}

// ---------------------------------------------------------------------------
// 7. Target Mob Reader (enemy HP / name)
// ---------------------------------------------------------------------------

let _target: TargetMobReader | null = null;

export function readTargetMob(): { hp: number; name: string } | null {
  if (!a1lib.hasAlt1) return null;
  if (!_target) _target = new TargetMobReader();
  return _target.read() ?? null;
}

// ---------------------------------------------------------------------------
// 8. Dialog Reader (NPC dialog & options)
// ---------------------------------------------------------------------------

let _dialog: DialogReader | null = null;

export function readDialog(): { text: string[] | null; opts: DialogButton[] | null; title: string } | null {
  if (!a1lib.hasAlt1) return null;
  if (!_dialog) _dialog = new DialogReader();
  if (!_dialog.pos) { if (!_dialog.find()) return null; }
  const result = _dialog.read();
  if (!result) return null;
  return result as { text: string[] | null; opts: DialogButton[] | null; title: string };
}

// ---------------------------------------------------------------------------
// 9. Drops Menu Reader (loot beam / drop tracker)
// ---------------------------------------------------------------------------

let _drops: DropsMenuReader | null = null;

export function findDropsMenu(): boolean {
  if (!a1lib.hasAlt1) return false;
  if (!_drops) _drops = new DropsMenuReader();
  return _drops.find() !== null;
}

// ---------------------------------------------------------------------------
// 10. Tooltip Reader (hover tooltips & bank item names)
// ---------------------------------------------------------------------------

export function readTooltip(): { text: string; area: { x: number; y: number; width: number; height: number } } | null {
  if (!a1lib.hasAlt1) return null;
  const result = TooltipReader.read();
  if (!result) return null;
  const interaction = result.readInteraction();
  return { text: interaction.text, area: result.area };
}

// ---------------------------------------------------------------------------
// 11. Color & Mouse Utilities
// ---------------------------------------------------------------------------

export const mixColor = a1lib.mixColor;
export const unmixColor = a1lib.unmixColor;

export function getMousePosition() {
  if (!a1lib.hasAlt1) return null;
  return a1lib.getMousePosition();
}

// ---------------------------------------------------------------------------
// 12. Native Alt1 Screen Overlay (Augmented Reality)
// ---------------------------------------------------------------------------

export function setNativeOverlayGroup(group: string) {
  if (window.alt1 && window.alt1.overLaySetGroup) window.alt1.overLaySetGroup(group);
}

export function clearNativeOverlayGroup(group: string) {
  if (window.alt1 && window.alt1.overLayClearGroup) window.alt1.overLayClearGroup(group);
}

export function drawNativeRect(x: number, y: number, w: number, h: number, colorInt: number, timeMs: number, lineWidth = 2) {
  if (window.alt1 && window.alt1.overLayRect) window.alt1.overLayRect(colorInt, x, y, w, h, timeMs, lineWidth);
}

export function drawNativeText(text: string, x: number, y: number, colorInt: number, size = 14, timeMs: number) {
  if (window.alt1 && window.alt1.overLayText) window.alt1.overLayText(text, colorInt, size, x, y, timeMs);
}

// ---------------------------------------------------------------------------
// 13. Event System
// ---------------------------------------------------------------------------

export type Alt1EventType = a1lib.Alt1EventType;

export function onAlt1Event<K extends keyof Alt1EventType>(
  type: K, listener: (ev: Alt1EventType[K]) => void
): void {
  if (!a1lib.hasAlt1) return;
  a1lib.on(type, listener);
}

export function offAlt1Event<K extends keyof Alt1EventType>(
  type: K, listener: (ev: Alt1EventType[K]) => void
): void {
  if (!a1lib.hasAlt1) return;
  a1lib.removeListener(type, listener);
}

export function onceAlt1Event<K extends keyof Alt1EventType>(
  type: K, listener: (ev: Alt1EventType[K]) => void
): void {
  if (!a1lib.hasAlt1) return;
  a1lib.once(type, listener);
}

// ---------------------------------------------------------------------------
// 13. Manifest of all available tools (for AI system prompt injection)
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable manifest of all Alt1 toolkit capabilities.
 * Intended to be injected into the Oracle AI system prompt so the model
 * knows exactly which tools are available at runtime.
 */
export function getToolManifest(): string {
  const status = getAlt1Status();
  const env = status.available ? 'LIVE (Alt1 detected)' : 'OFFLINE (browser-only)';

  return `## Alt1 Toolkit — Available Tools [${env}]

### Screen Capture
- captureRegion(x, y, w, h) → ImageData | null
- captureRegionAsync(x, y, w, h) → Promise<ImageData | null>
- captureFullClient() → ImgRefBind | null

### ChatBox Reader
- findChatbox() → boolean
- readChatLines() → ChatLine[] | null
  Fields: { text, fragments[], basey }

### Buff / Debuff Reader
- readBuffs() → Buff[] | null
- readDebuffs() → Buff[] | null
  Fields: { isdebuff, readArg(type), readTime(), compareBuffer(img) }

### XP Counter Reader
- readXpCounter() → string[] | null (skill names with XP drops)

### Boss Timer Reader
- readBossTimer() → { minpart, secpart, time } | null

### Target Mob Reader
- readTargetMob() → { hp, name } | null

### Dialog Reader (NPC conversations)
- readDialog() → { text, opts: DialogButton[], title } | null

### Drops Menu Reader
- findDropsMenu() → boolean

### Tooltip Reader (hover text / bank items)
- readTooltip() → { text, area } | null

### Utilities & Overlay Control
- mixColor(r, g, b, a?) → number
- unmixColor(col) → [r, g, b]
- getMousePosition() → { x, y } | null
- OVERLAY SYSTEM: You have access to direct Augmented Reality game drawing via string commands. (See main prompt rules for invocation syntax).

### Third-Party Alt1 Plugins (Installed by User)
The user has the following Alt1 plugins installed. You can guide the user to use them by suggesting they open them from their Alt1 toolbar, or by referring to their capabilities:
${installedApps.map(app => `- ${app.name}: ${app.description}`).join('\n')}

### Events
- onAlt1Event(type, listener) — types: alt1pressed, menudetected, rslinked, rsunlinked, rsfocus, rsblur, daemonrun, userevent, permissionchanged`;
}
