# 🛡️ Aegis AI Copilot (Alt1-AI)

Aegis AI Copilot is an ambient, local-first artificial intelligence assistant designed for RuneScape 3. It leverages the Alt1 Toolkit for zero-latency screen reading and routes visual/telemetry data into a localized Ollama LLM to provide contextual combat guidance, GE analysis, and voice-narrated assistance without compromising user privacy or requiring expensive cloud subscriptions.

## ✨ Features

- **Ambient Voice Guidance:** Speaks mechanics, drops, and prices using the Web Speech API so you never have to take your eyes off the boss.
- **True Local Pedagogy:** Built-in 42,000+ item index with `localStorage` LRU persistence for instant, offline item name-to-ID resolution.
- **Resilient API Bridges:** Fetches Jagex Grand Exchange data and MediaWiki strategy guides via a robust, proxy-rotating failover network. 
- **Wiki Combat Enrichment:** Parses live RS Wiki infoboxes and PvME `{{Ability rotation}}` wikitext to predict mechanics dynamically.
- **Alt1 Native Telemetry:** Plugs directly into the official Alt1 API (`alt1/base`, `alt1/chatbox`, etc.) for deterministic, tick-accurate game state reads.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Local instance of [Ollama](https://ollama.ai/) running on port 11434.
- [Alt1 Toolkit](https://runeapps.org/alt1) installed.

### Installation

1. Clone the repository and navigate into the directory:
   ```bash
   cd alt1-ai
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Load the app into Alt1 by pointing the Alt1 browser to your localhost port (usually `http://localhost:5173`).

## 🛠️ Architecture Overview

The system is separated into three cognitive limbs:

1. **Sense (`utils/alt1Bridge.ts`)**  
   Reads pixels, parses chat, and tracks buffs using native C# bindings exposed by Alt1.
   
2. **Think (`core/guidanceEngine.ts` & `utils/ollamaBridge.ts`)**  
   Processes the state using local LLMs to evaluate optimal strategies, parse Wiki syntax (`wikiApi.ts`), and analyze GE flips (`geEngine.ts`).
   
3. **Act (`core/voiceNarrator.ts` & `App.tsx`)**  
   Delivers the intelligence via Text-to-Speech and an interactive 3D tactical HUD.

## 📦 Build for Production

To compile the application for a static deployment:
```bash
npm run build
```
This will bundle the React application, CSS styles, and the `items_index.json` local cache into the `dist/` directory, which can be hosted statically on GitHub Pages or Cloudflare.

## ⚠️ Current Development Priorities

- **Componentization:** `App.tsx` is currently a monolithic file (3900+ lines) containing excessive inline CSS. Extracting it into smaller components is the primary refactor objective.
- **Combat Tick Syncing:** Calibrating the `guidanceEngine` to the strict 600ms RuneScape tick cycle for frame-perfect PvM callouts.

## 🤝 Acknowledgements

Derived from the overarching POG2/Sovereign forensic inspector architecture. Special thanks to the RS Wiki maintainers and the PvM Encyclopedia.
