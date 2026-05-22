// =============================================================================
// src/utils/ollamaBridge.ts
// Local vision model bridge for Ollama integrations (llava / moondream)
// =============================================================================

export async function askLocalOracle(
  imageBase64: string, 
  prompt: string,
  model = 'llava'
): Promise<string> {
  // Strip data:image/png;base64, prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `You are watching a RuneScape 3 player through their screen. ${prompt}\n\nDescribe what you see and recommend the next action. If you see UI elements that need interaction, output click guidance in this exact format:\n[CLICK_GUIDE: x=NUMBER, y=NUMBER, label="TEXT", action=click|right-click|hover|type, urgency=immediate|soon|optional]`,
      images: [base64Data],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 256
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama server returned status ${response.status}`);
  }
  
  const data = await response.json();
  return data.response;
}
