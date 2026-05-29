/**
 * MarketLimb.ts
 * Sovereign Market Limb: GE Flip analysis and arbitrage scoring.
 * POG2 Domain: FORGE (Market Intelligence)
 */

import { LimbStatus } from '../limb/Limb';
import type { IAegisLimb, LimbOutput, TelemetrySnapshot } from '../limb/Limb';
import { analyzeFlip, type FlipAnalysis } from '../../utils/geEngine';
import { fetchGeItemDetail, fetchGePriceGraph } from '../../utils/geApi';

export interface TrackedItem {
  itemId: number;
  itemName: string;
  analysis: FlipAnalysis;
  alarmEnabled: boolean;
  alarmThreshold: number;
  alarmMode: 'below' | 'above';
  alarmSound: 'siren' | 'chime' | 'bell';
  lastTriggered: number;
}

export class MarketLimb implements IAegisLimb {
  public readonly id = 'MARKET_FORGE';
  public readonly domain = 'FORGE';
  public status: LimbStatus = LimbStatus.ACTIVE;

  private trackedItems: TrackedItem[] = [];

  constructor(initialItems: TrackedItem[] = []) {
    this.trackedItems = initialItems;
  }

  public async pulse(_telemetry: TelemetrySnapshot): Promise<LimbOutput | null> {
    // In a real implementation, this would poll live prices for tracked items
    // and return a pulse if a price threshold is crossed.
    return null;
  }

  public async analyzeItem(itemId: number, _itemName: string): Promise<LimbOutput> {
    const detail = await fetchGeItemDetail(itemId);
    const graph = await fetchGePriceGraph(itemId);

    if (detail && graph) {
      const analysis = analyzeFlip(detail, graph);
      return {
        payload: { analysis },
        confidence: 0.9,
        metabolicCost: 100,
        stage: 1, // Contextual retrieval
        decision: 'EXECUTE'
      };
    }

    return {
      payload: { error: 'Could not fetch item data' },
      confidence: 0,
      metabolicCost: 10,
      stage: 1,
      decision: 'DEFER'
    };
  }

  public addTrackedItem(item: TrackedItem) {
    this.trackedItems.push(item);
  }

  public getTrackedItems() {
    return this.trackedItems;
  }

  public async recalibrate(): Promise<void> {
    this.status = LimbStatus.ACTIVE;
  }
}
