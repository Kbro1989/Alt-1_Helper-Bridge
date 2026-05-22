// =============================================================================
// src/utils/itemIndex.ts
// Local Item Name → ID Resolution from Jagex Cache Pedagogy (42,116 items)
// =============================================================================

type ItemTuple = [number, string]; // [id, name]

export interface ItemIndexEntry {
  id: number;
  name: string;
  lastAccessed: number;
}

const CACHE_KEY = 'aegis_item_pedagogy_v1';
const MAX_CACHE_SIZE = 50000;

let memoryCache: ItemIndexEntry[] | null = null;
let bundledIndex: ItemTuple[] | null = null;
let loadPromise: Promise<void> | null = null;

async function fetchBundledIndex(): Promise<ItemTuple[]> {
  if (bundledIndex) return bundledIndex;
  try {
    const base = import.meta.env.BASE_URL || './';
    const res = await fetch(`${base}items_index.json`);
    bundledIndex = await res.json();
    return bundledIndex!;
  } catch (err) {
    console.warn('Failed to load bundled item index:', err);
    return [];
  }
}

export async function ensureLoaded(): Promise<ItemIndexEntry[]> {
  if (memoryCache) return memoryCache;
  if (!loadPromise) {
    loadPromise = (async () => {
      const bundled = await fetchBundledIndex();
      let persisted: ItemIndexEntry[] = [];
      
      try {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) persisted = JSON.parse(saved);
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
      
      const merged = new Map<number, ItemIndexEntry>();
      bundled.forEach(([id, name]) => merged.set(id, { id, name, lastAccessed: 0 }));
      persisted.forEach(i => merged.set(i.id, { ...i, lastAccessed: i.lastAccessed || Date.now() }));
      
      memoryCache = Array.from(merged.values());
    })();
  }
  await loadPromise;
  return memoryCache!;
}

export function saveItemIndex() {
  if (!memoryCache || !bundledIndex) return;
  
  const bundledIds = new Set(bundledIndex.map(([id]) => id));
  const discoveries = memoryCache.filter(i => !bundledIds.has(i.id));
  
  if (discoveries.length > MAX_CACHE_SIZE) {
    discoveries.sort((a, b) => b.lastAccessed - a.lastAccessed);
    discoveries.length = MAX_CACHE_SIZE;
  }
  
  localStorage.setItem(CACHE_KEY, JSON.stringify(discoveries));
}

let saveTimeout: ReturnType<typeof setTimeout> | undefined;
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveItemIndex(), 500);
}

export async function addItemDiscovery(id: number, name: string) {
  const cache = await ensureLoaded();
  const existing = cache.find(i => i.id === id);
  
  const existingByName = cache.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (existingByName && existingByName.id !== id) {
    console.warn(`Item ID conflict: ${name} was ${existingByName.id}, now ${id}`);
    existingByName.id = id;
    existingByName.lastAccessed = Date.now();
  } else if (existing) {
    existing.name = name;
    existing.lastAccessed = Date.now();
  } else {
    cache.push({ id, name, lastAccessed: Date.now() });
  }
  
  debouncedSave();
}

export interface ItemMatch {
  id: number;
  name: string;
  exact: boolean;
}

export async function searchItemsByName(query: string, limit = 10): Promise<ItemMatch[]> {
  const index = await ensureLoaded();
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const exactMatches: ItemMatch[] = [];
  const startsWithMatches: ItemMatch[] = [];
  const containsMatches: ItemMatch[] = [];

  for (const item of index) {
    const lower = item.name.toLowerCase();
    if (lower === q) {
      exactMatches.push({ id: item.id, name: item.name, exact: true });
    } else if (lower.startsWith(q)) {
      startsWithMatches.push({ id: item.id, name: item.name, exact: false });
    } else if (lower.includes(q)) {
      containsMatches.push({ id: item.id, name: item.name, exact: false });
    }

    if (exactMatches.length + startsWithMatches.length + containsMatches.length >= limit * 3) break;
  }

  return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, limit);
}

export async function resolveItemId(name: string): Promise<number | null> {
  const matches = await searchItemsByName(name, 1);
  if (matches.length > 0 && matches[0].exact) {
      const index = await ensureLoaded();
      const exact = index.find(i => i.id === matches[0].id);
      if(exact) exact.lastAccessed = Date.now();
      return matches[0].id;
  }
  
  const broader = await searchItemsByName(name, 5);
  if (broader.length > 0) {
      const index = await ensureLoaded();
      const match = index.find(i => i.id === broader[0].id);
      if(match) match.lastAccessed = Date.now();
      return broader[0].id;
  }
  return null;
}
