// =============================================================================
// src/core/voiceNarrator.ts
// Intelligent Text-to-Speech Companion Voice Substrate
// =============================================================================

let lastSpoken = '';
let speaking = false;
let globalVolume = 0.8; // default volume between 0 and 1

export function setNarratorVolume(volumePercent: number) {
  globalVolume = Math.max(0, Math.min(1, volumePercent / 100));
}

export function getNarratorVolume(): number {
  return Math.round(globalVolume * 100);
}

export function narrate(text: string, priority: 'low' | 'medium' | 'high' | 'critical') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Prevent spamming the exact same message repeatedly
  if (text === lastSpoken && priority !== 'critical') return;
  lastSpoken = text;

  // Critical events interrupt immediately
  if (priority === 'critical') {
    window.speechSynthesis.cancel();
    speaking = false;
  } else if (speaking) {
    // Drop low/medium alerts if we are currently saying something
    if (priority === 'low' || priority === 'medium') return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.15; // slightly faster conversational pacing
    utterance.pitch = 1.0;
    utterance.volume = globalVolume;

    // Resolve high-quality local US English or system-native voices
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = 
      voices.find(v => v.name.includes('Google US English')) ||
      voices.find(v => v.name.includes('Natural')) ||
      voices.find(v => v.lang.startsWith('en-US')) ||
      voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speaking = true;
    utterance.onend = () => {
      speaking = false;
    };
    utterance.onerror = () => {
      speaking = false;
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('SpeechSynthesis narration error:', e);
    speaking = false;
  }
}
