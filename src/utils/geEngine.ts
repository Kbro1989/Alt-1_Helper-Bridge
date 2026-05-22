// =============================================================================
// src/utils/geEngine.ts
// Margin Calculator, Statistical Volatility, and Flip Scoring Algorithms
// =============================================================================

import type { JagexItemDetail, JagexPriceGraph } from './geApi';

export interface FlipAnalysis {
  itemId: number;
  itemName: string;
  itemIcon: string;
  description: string;
  itemType: string;
  currentPrice: number;
  avg30d: number;
  avg90d: number;
  avg180d: number;
  marginPercent: number;
  volatilityPercent: number;
  trend180d: 'rising' | 'falling' | 'volatile' | 'stable';
  flipScore: number; // 0-100 score of quality
  riskRating: 'low' | 'medium' | 'high';
  recommendation: 'buy' | 'sell' | 'hold' | 'avoid';
  buyLimitEstimate: number;
}

/**
 * Parses Jagex price strings (e.g. "5.2m", "1,250", "1.1b") to exact raw numbers.
 */
export function parsePriceString(priceStr: string | number): number {
  if (typeof priceStr === 'number') return priceStr;
  
  const clean = priceStr.toLowerCase().replace(/,/g, '').trim();
  if (clean.endsWith('k')) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1000);
  }
  if (clean.endsWith('m')) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1000000);
  }
  if (clean.endsWith('b')) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1000000000);
  }
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Calculates standard deviation for volatility indexing.
 */
function getStandardDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squareDiffs = values.map(value => {
    const diff = value - mean;
    return diff * diff;
  });
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Classifies the 180-day price graph trend.
 */
function classifyTrend(dailyPrices: number[]): 'rising' | 'falling' | 'volatile' | 'stable' {
  if (dailyPrices.length < 10) return 'stable';
  
  const len = dailyPrices.length;
  const initialAvg = dailyPrices.slice(0, Math.floor(len * 0.15)).reduce((a, b) => a + b, 0) / Math.floor(len * 0.15);
  const recentAvg = dailyPrices.slice(-Math.floor(len * 0.15)).reduce((a, b) => a + b, 0) / Math.floor(len * 0.15);
  
  const totalChangePercent = ((recentAvg - initialAvg) / initialAvg) * 100;
  
  const overallMean = dailyPrices.reduce((a, b) => a + b, 0) / len;
  const stdDev = getStandardDeviation(dailyPrices, overallMean);
  const coefficientOfVariation = stdDev / overallMean; // Normalized volatility measure

  if (coefficientOfVariation > 0.12) {
    return 'volatile';
  }
  if (totalChangePercent > 5) {
    return 'rising';
  }
  if (totalChangePercent < -5) {
    return 'falling';
  }
  return 'stable';
}

/**
 * Estimates item buy limit dynamically based on item types.
 */
export function getBuyLimitEstimate(type: string, name: string): number {
  const n = name.toLowerCase();
  const t = type.toLowerCase();

  if (n.includes('ore') || n.includes('bar') || n.includes('logs') || n.includes('uncut') || n.includes('raw')) {
    return 25000;
  }
  if (n.includes('rune') || n.includes('arrow') || n.includes('bolt') || n.includes('dart') || n.includes('feather')) {
    return 10000;
  }
  if (n.includes('potion') || n.includes('flask') || n.includes('brew') || n.includes('restore') || n.includes('herb')) {
    return 1000;
  }
  if (n.includes('grimy') || n.includes('clean') || n.includes('seed')) {
    return 1000;
  }
  if (n.includes('chinchompa') || n.includes('grenwall') || n.includes('spirit weed')) {
    return 5000;
  }
  if (t.includes('armour') || t.includes('weapon') || t.includes('shield') || n.includes('sword') || n.includes('bow') || n.includes('staff')) {
    return 100;
  }
  if (n.includes('codex') || n.includes('crest') || n.includes('dye') || n.includes('hilt') || n.includes('essence')) {
    return 10;
  }
  return 5000; // General default limit
}

/**
 * Executes a full high-fidelity GE flip analysis.
 */
export function analyzeFlip(detail: JagexItemDetail, graph: JagexPriceGraph): FlipAnalysis {
  const item = detail.item;
  const currentPrice = parsePriceString(item.current.price);
  
  // Extract prices from timestamp map
  const dailyPrices = Object.values(graph.daily) as number[];
  const totalDays = dailyPrices.length;

  const avg30d = totalDays >= 30 
    ? Math.round(dailyPrices.slice(-30).reduce((a, b) => a + b, 0) / 30)
    : currentPrice;

  const avg90d = totalDays >= 90
    ? Math.round(dailyPrices.slice(-90).reduce((a, b) => a + b, 0) / 90)
    : currentPrice;

  const avg180d = totalDays > 0
    ? Math.round(dailyPrices.reduce((a, b) => a + b, 0) / totalDays)
    : currentPrice;

  // Margin calculation relative to 30d baseline
  const priceDiff = currentPrice - avg30d;
  const marginPercent = avg30d > 0 ? (priceDiff / avg30d) * 100 : 0;

  // Calculate 30-day volatility index
  const prices30d = dailyPrices.slice(-30);
  const mean30d = prices30d.reduce((a, b) => a + b, 0) / Math.max(1, prices30d.length);
  const stdDev30d = getStandardDeviation(prices30d, mean30d);
  const volatilityPercent = mean30d > 0 ? (stdDev30d / mean30d) * 100 : 0;

  const trend180d = classifyTrend(dailyPrices);
  const buyLimitEstimate = getBuyLimitEstimate(item.type, item.name);

  // Volatility categorizes risk
  let riskRating: 'low' | 'medium' | 'high' = 'low';
  if (volatilityPercent > 8) {
    riskRating = 'high';
  } else if (volatilityPercent > 3.5) {
    riskRating = 'medium';
  }

  // Margin Score Calculation (0-100 scale)
  // Higher absolute margin deviation + reasonable stability = higher score
  const absoluteDeviation = Math.abs(marginPercent);
  let baseScore = absoluteDeviation * 12; // reward margins

  // Risk & Volatility deductions
  if (riskRating === 'high') {
    baseScore -= volatilityPercent * 2;
  } else {
    baseScore += (5 - volatilityPercent) * 2; // reward stability
  }

  // Cap and bound the flip score
  const flipScore = Math.min(100, Math.max(5, Math.round(baseScore)));

  // Buy or Sell Recommendations based on trend direction
  let recommendation: 'buy' | 'sell' | 'hold' | 'avoid' = 'hold';
  if (flipScore >= 60) {
    if (marginPercent < -1.5) {
      recommendation = trend180d === 'falling' ? 'hold' : 'buy'; // Avoid catching falling knives
    } else if (marginPercent > 1.5) {
      recommendation = 'sell';
    }
  } else if (flipScore < 30 || volatilityPercent > 12) {
    recommendation = 'avoid';
  }

  return {
    itemId: item.id,
    itemName: item.name,
    itemIcon: item.icon,
    description: item.description,
    itemType: item.type,
    currentPrice,
    avg30d,
    avg90d,
    avg180d,
    marginPercent: Math.round(marginPercent * 100) / 100,
    volatilityPercent: Math.round(volatilityPercent * 100) / 100,
    trend180d,
    flipScore,
    riskRating,
    recommendation,
    buyLimitEstimate,
  };
}
