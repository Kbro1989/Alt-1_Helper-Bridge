import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { fetchWikiInfobox } from './wikiApi';

type Bindings = {
    ITEMS_LIST: KVNamespace;
    AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

// Health check
app.get('/', (c) => c.json({ status: 'Sovereign Vision Gateway Online' }));

// The Gateway: Ingests raw screen telemetry & structural state
app.post('/gateway/ingest', async (c) => {
    const payload = await c.req.json();
    
    // Ingestion logic: Map screen regions -> tactical state
    // In the future, this calls your AI Swarm (OracleLimb)
    
    return c.json({ 
        status: 'accepted',
        directive: 'Tactical guidance processed' // Placeholder for AI response
    });
});

// Registry: Register new game objects (Items, NPCs, Abilities) using sharded schema
app.post('/registry/register', async (c) => {
    const { type, id, meta, drops } = await c.req.json();
    
    // Store metadata
    await c.env.ITEMS_LIST.put(`entity:${type}:${id}:meta`, JSON.stringify(meta));
    
    // Store drops (with optional 7-day TTL if provided, or default)
    if (drops) {
        await c.env.ITEMS_LIST.put(`entity:${type}:${id}:drops`, JSON.stringify(drops), { expirationTtl: 604800 });
    }
    
    return c.json({ status: 'registered', id: `entity:${type}:${id}` });
});

// Test: Fetch item from KV and Price from Wiki
app.get('/test/enrich/:id', async (c) => {
    const id = c.req.param('id');
    const meta = await c.env.ITEMS_LIST.get(`entity:item:${id}:meta`);
    const drops = await c.env.ITEMS_LIST.get(`entity:item:${id}:drops`);
    
    if (!meta) {
        return c.json({ error: 'Item not found in KV' }, 404);
    }
    return c.json({
        kvMeta: JSON.parse(meta),
        drops: drops ? JSON.parse(drops) : []
    });
});

export default app;
