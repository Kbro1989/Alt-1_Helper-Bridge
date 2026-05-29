import { Thalamus } from '../core/Thalamus';
import { OracleLimb } from '../core/limbs/OracleLimb';

export async function queryTieredAI(prompt: string, snapshot: string, context: string): Promise<string> {
  const workerEndpoint = import.meta.env.VITE_WORKER_ENDPOINT;

  // Tier 1: Cloudflare Worker
  if (workerEndpoint) {
    try {
        const response = await fetch(`${workerEndpoint}/analyze`, {
            method: 'POST',
            body: JSON.stringify({ prompt, snapshot, context })
        });
        if (response.ok) {
            const data = await response.json();
            return data.text || "Worker AI provided no response.";
        }
    } catch (e) {
        console.warn("Worker AI failed, falling back to Ollama.", e);
    }
  }

  // Tier 2: Ollama
  try {
    const thalamus = Thalamus.getInstance();
    const oracle = thalamus.getLimb<OracleLimb>('ORACLE_CORTEX');
    
    const response = await oracle.query(prompt, { timestamp: Date.now() } as any, snapshot, context);
    return (response.payload as { text?: string }).text || "Ollama failed to provide a response.";
  } catch (e) {
    console.warn("Ollama failed, falling back to Simulation.", e);
  }

  // Tier 3: Simulation Fallback
  return simulateResponse(prompt);
}

function simulateResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('clue')) return "### 🛡️ Aegis Clue Solver [FALLBACK]\nDetected Treasure Trail clue. Proceed to the nearest bank to ensure safety, then check RuneScape Wiki for this cryptic riddle.";
  if (p.includes('boss')) return "### 🛡️ Sovereign Boss Oracle [FALLBACK]\nScanning for entities... Boss mechanics identified. Ensure prayer is active and defensive abilities are on your bar.";
  return "### 🛡️ Aegis AI Oracle [FALLBACK]\nI am currently operating in fallback mode. My primary AI nodes are temporarily unreachable. Rely on your local game knowledge or check RuneApps Wiki.";
}
