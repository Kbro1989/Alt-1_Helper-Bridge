// =============================================================================
// src/utils/clickGuide.ts
// Direct AR click guidance using native Alt1 Overlay vectors
// =============================================================================

import { setNativeOverlayGroup, clearNativeOverlayGroup, drawNativeRect, drawNativeText, mixColor } from './alt1Bridge';

export interface ClickTarget {
  x: number;
  y: number;
  label: string;
  action: 'click' | 'right-click' | 'hover' | 'type';
  urgency: 'immediate' | 'soon' | 'optional';
}

export function renderClickGuide(targets: ClickTarget[], durationMs = 5000) {
  if (!window.alt1) return;
  
  const group = 'aegis-click-guide';
  setNativeOverlayGroup(group);
  clearNativeOverlayGroup(group);
  
  targets.forEach((target, i) => {
    const color = target.urgency === 'immediate' ? mixColor(255, 50, 50) :
                  target.urgency === 'soon' ? mixColor(255, 200, 0) :
                  mixColor(0, 200, 255);
    
    // Pulsing circle/box around target
    drawNativeRect(target.x - 25, target.y - 25, 50, 50, color, durationMs, 3);
    
    // Label above
    drawNativeText(`[${i+1}] ${target.action.toUpperCase()}: ${target.label}`, 
                   target.x, target.y - 35, color, 13, durationMs);
  });
}

export function clearClickGuide() {
  clearNativeOverlayGroup('aegis-click-guide');
}
