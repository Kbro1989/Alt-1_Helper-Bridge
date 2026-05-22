# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands
- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Build for production: `npm run build`
- Lint codebase: `npm run lint`
- Preview production build: `npm run preview`

## Architecture Overview
Aegis AI Copilot (Alt1-AI) is a local-first assistant for RuneScape 3, integrating Alt1 Toolkit telemetry with a local Ollama LLM.

### Cognitive Architecture
- **Sense (`src/utils/alt1Bridge.ts`)**: Interfaces with Alt1 Toolkit for deterministic game state, pixel reading, chat parsing, and buff tracking.
- **Think**:
  - `src/core/guidanceEngine.ts`: Main logic for combat and gameplay strategy.
  - `src/utils/ollamaBridge.ts`: Communication with local Ollama instance (port 11434).
  - `src/utils/wikiApi.ts`: Parses RS Wiki data and PvME ability rotations.
  - `src/utils/geEngine.ts`: Analyzes Grand Exchange flips and pricing.
- **Act**:
  - `src/core/voiceNarrator.ts`: Handles Text-to-Speech output.
  - `src/App.tsx`: Main tactical HUD and user interface.

### Key Project Constraints & Priorities
- **Monolith Refactoring**: `src/App.tsx` is currently a monolithic file (3900+ lines) and is the primary target for componentization.
- **Tick Synchronization**: The `guidanceEngine` must be calibrated to the 600ms RuneScape game tick.
- **Sovereign Laws**:
  - No mocks or placeholders.
  - Strict TypeScript enforcement.
  - Clinical logging.
