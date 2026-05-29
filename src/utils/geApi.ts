// =============================================================================
// src/utils/geApi.ts
// CORS-Free Jagex Grand Exchange and RuneScape Wiki API Integration
// =============================================================================

const JAGEX_GE_BASE = 'https://secure.runescape.com/m=itemdb_rs/api';
import { resolveItemId, addItemDiscovery } from './itemIndex';

// Ordered list of CORS proxy providers — tried in sequence on failure
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

/**
 * Fetch a JSON response via CORS proxies, trying each in order.
 * Returns the parsed inner payload or throws if all proxies fail.
 */
async function proxiedFetch(targetUrl: string): Promise<unknown> {
  let lastError: unknown;
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      
      // If the proxy itself failed
      if (!res.ok) {
        console.warn(`Proxy ${proxyUrl} returned status ${res.status}`);
        continue;
      }

      const text = await res.text();
      let payload: any;

      try {
        payload = JSON.parse(text);
      } catch {
        // Not JSON - might be raw HTML from a passthrough proxy
        console.warn(`Proxy returned non-JSON text: ${text.substring(0, 50)}...`);
        continue;
      }

      // allorigins wraps in { contents }, others might return raw
      const raw = payload.contents ?? payload;
      
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          // If the wrapped content is not JSON (e.g. 404 HTML page wrapped in JSON)
          console.warn(`Wrapped content is not valid JSON: ${raw.substring(0, 50)}...`);
          continue;
        }
      }
      
      return raw;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('All CORS proxies failed');
}

export interface JagexItemDetail {
  item: {
    id: number;
    icon: string;
    icon_large: string;
    type: string;
    typeIcon: string;
    name: string;
    description: string;
    current: { trend: string; price: string | number };
    today: { trend: string; price: string | number };
    members: string;
    day30?: { trend: string; change: string };
    day90?: { trend: string; change: string };
    day180?: { trend: string; change: string };
  };
}

export interface JagexPriceGraph {
  daily: Record<string, number>;
  average: Record<string, number>;
}

/**
/**
 * Resolves a RuneScape item name to its Jagex Item ID via the RS Wiki search API.
 * NOTE: The local itemIndex.ts is preferred for name→ID resolution.
 * This is a network-based fallback for items not in the local cache.
 */
export async function resolveItemNameToId(itemName: string): Promise<number | null> {
  const cleanName = itemName.trim();
  if (!cleanName) return null;

  // Layer 1: Local cache/index (bundled + persisted)
  const localId = await resolveItemId(cleanName);
  if (localId !== null) return localId;

  // Layer 2: Wiki Fallback
  try {
    // RS Wiki full-text search — finds items by name, returns item ID in snippet
    const wikiUrl = `https://runescape.wiki/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanName)}&srnamespace=0&format=json&srlimit=1`;
    const data = await proxiedFetch(wikiUrl) as { query?: { search?: Array<{ snippet?: string }> } };
    const snippet = data?.query?.search?.[0]?.snippet ?? '';
    // The snippet encodes item IDs as: {"name":"...","id":NNNNN}
    const match = snippet.match(/"id"\s*:\s*(\d+)/);
    if (match) {
      const id = parseInt(match[1], 10);
      addItemDiscovery(id, cleanName);
      return id;
    }
  } catch (err) {
    console.warn(`Wiki search failed for "${cleanName}":`, err);
  }

  return null;
}

/**
 * Resolves a Jagex Item ID to its canonical item name via the RS Wiki search API.
 * Useful for display when only an ID is known.
 */
export async function resolveIdToName(itemId: number): Promise<string | null> {
  const cacheKey = `ge_name_cache_${itemId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const wikiUrl = `https://runescape.wiki/api.php?action=query&list=search&srsearch=${itemId}&srnamespace=0&format=json&srlimit=1`;
    const data = await proxiedFetch(wikiUrl) as { query?: { search?: Array<{ title?: string; snippet?: string }> } };
    const result = data?.query?.search?.[0];
    // Confirm the snippet actually mentions this ID to avoid false matches
    if (result?.snippet?.includes(String(itemId))) {
      const name = result.title ?? null;
      if (name) {
        localStorage.setItem(cacheKey, name);
        return name;
      }
    }
  } catch (err) {
    console.warn(`Wiki ID→name lookup failed for ${itemId}:`, err);
  }

  return null;
}

/**
 * Fetches item detail metrics from Jagex's official GE DB.
 */
export async function fetchGeItemDetail(itemId: number): Promise<JagexItemDetail | null> {
  try {
    const jagexUrl = `${JAGEX_GE_BASE}/catalogue/detail.json?item=${itemId}`;
    const data = await proxiedFetch(jagexUrl) as JagexItemDetail;
    if (data && data.item) {
      return data;
    }
  } catch (err) {
    console.error(`Failed to fetch GE details for item ${itemId}:`, err);
  }
  return null;
}

/**
 * Fetches 180 days of daily and average price points.
 */
export async function fetchGePriceGraph(itemId: number): Promise<JagexPriceGraph | null> {
  try {
    const jagexUrl = `https://secure.runescape.com/m=itemdb_rs/api/graph/${itemId}.json`;
    const data = await proxiedFetch(jagexUrl) as JagexPriceGraph;
    if (data && data.daily) {
      return data;
    }
  } catch (err) {
    console.error(`Failed to fetch price graph for item ${itemId}:`, err);
  }
  return null;
}
