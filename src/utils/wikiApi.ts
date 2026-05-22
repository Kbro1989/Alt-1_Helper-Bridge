// =============================================================================
// src/utils/wikiApi.ts
// Live MediaWiki API Bridge for RuneScape Mechanics, Bestiary, and Context
// Ported from POG2 WikiEnricher limbs
// =============================================================================

// Ordered list of CORS proxy providers
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

/**
 * Fetch a JSON response via CORS proxies, trying each in order.
 */
async function proxiedFetch(targetUrl: string): Promise<unknown> {
  let lastError: unknown;
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const wrapper = await res.json();
      const raw = wrapper.contents ?? wrapper;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('All CORS proxies failed');
}

export interface WikiRotation {
  section: string;
  label: string;
  abilities: {
    name: string;
    predicate?: string;
  }[];
}

const CACHE_TTL = 3600000; // 1 hour
const infoboxCache = new Map<string, { data: Record<string, string>; timestamp: number }>();
const rotationsCache = new Map<string, { data: WikiRotation[]; timestamp: number }>();

/**
 * Fetches and parses MediaWiki Infobox variables (stats, weakness, lifepoints, etc.)
 */
export async function fetchWikiInfobox(pageName: string): Promise<Record<string, string> | null> {
  const normalized = pageName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const cached = infoboxCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      action: 'parse',
      format: 'json',
      page: pageName,
      prop: 'wikitext',
      origin: '*'
    });

    const targetUrl = `https://runescape.wiki/api.php?${params.toString()}`;
    const data = await proxiedFetch(targetUrl) as { parse?: { wikitext?: { '*': string } } };
    const wikitext = data.parse?.wikitext?.['*'] || '';

    const variables: Record<string, string> = {};
    const matches = wikitext.matchAll(/\|\s*([\w\d]+)\s*=\s*([^|\n}]+)/g);
    for (const match of matches) {
      variables[match[1].trim()] = match[2].trim();
    }

    if (Object.keys(variables).length > 0) {
      infoboxCache.set(normalized, { data: variables, timestamp: Date.now() });
      return variables;
    }
  } catch (err) {
    console.warn(`Wiki infobox fetch failed for "${pageName}":`, err);
  }

  return null;
}

/**
 * Extracts PvME-style ability rotations from a boss's strategy page on the RS Wiki.
 */
export async function fetchWikiRotations(bossName: string): Promise<WikiRotation[]> {
  const normalized = bossName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const cached = rotationsCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const title = bossName.includes('/') ? bossName : `${bossName}/Strategies`;
  
  try {
    const params = new URLSearchParams({
      action: 'parse',
      format: 'json',
      page: title,
      prop: 'wikitext',
      origin: '*'
    });

    const targetUrl = `https://runescape.wiki/api.php?${params.toString()}`;
    const data = await proxiedFetch(targetUrl) as { parse?: { wikitext?: { '*': string } } };
    const wikitext = data.parse?.wikitext?.['*'] || '';

    const rotations: WikiRotation[] = [];
    const templateRegex = /\{\{[Aa]bility\s+rotation\s*\|([^}]+)\}\}/g;
    let match;

    const lines = wikitext.split('\n');
    let currentSection = 'General';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('==')) {
        currentSection = line.replace(/=/g, '').trim();
      }

      while ((match = templateRegex.exec(line)) !== null) {
        const content = match[1];
        const abilities = content.split('|')
          .map(a => a.trim())
          .filter(a => a && !a.includes('=')); 

        let label = 'Rotation';
        if (i > 0 && lines[i-1].startsWith('!')) {
          label = lines[i-1].replace('!', '').trim();
        }

        rotations.push({
          section: currentSection,
          label,
          abilities: abilities.map(a => {
            const predMatch = a.match(/\((if [^)]+)\)/i);
            let rawName = a;
            let predicate: string | undefined;
            if (predMatch) {
              predicate = predMatch[1].trim();
              rawName = a.replace(predMatch[0], '').trim();
            }
            return {
              name: rawName.replace(/^@/, '').replace(/\[\[File:[^\]]+\]\]/g, '').replace(/&nbsp;/g, ' ').split('|')[0].trim(),
              predicate
            };
          })
        });
      }
    }

    if (rotations.length > 0) {
      rotationsCache.set(normalized, { data: rotations, timestamp: Date.now() });
    }
    
    return rotations;
  } catch (err) {
    console.warn(`Wiki rotation fetch failed for "${bossName}":`, err);
  }

  return [];
}
