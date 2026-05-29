export type SovereignDomain = 'RESEARCH' | 'VISION' | 'CODE' | 'SYSTEM' | 'FORGE' | 'OBSERVE' | 'MOTOR';

export const DOMAIN_ADJACENCY: Record<SovereignDomain, Set<SovereignDomain>> = {
    RESEARCH: new Set(['RESEARCH', 'OBSERVE'] as SovereignDomain[]),
    VISION: new Set(['VISION', 'OBSERVE'] as SovereignDomain[]),
    CODE: new Set(['CODE', 'FORGE'] as SovereignDomain[]),
    SYSTEM: new Set(['SYSTEM', 'OBSERVE'] as SovereignDomain[]),
    FORGE: new Set(['FORGE', 'CODE'] as SovereignDomain[]),
    OBSERVE: new Set(['OBSERVE', 'RESEARCH', 'VISION'] as SovereignDomain[]),
    MOTOR: new Set(['MOTOR', 'SYSTEM'] as SovereignDomain[])
};
