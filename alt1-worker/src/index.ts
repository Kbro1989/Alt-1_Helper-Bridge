import { Hono } from 'hono';
import { cors } from 'hono/cors';

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

// Registry: Register new game objects (Items, NPCs, Abilities)
app.post('/registry/register', async (c) => {
    const { type, id, metadata } = await c.req.json();
    await c.env.ITEMS_LIST.put(`reg:${type}:${id}`, JSON.stringify(metadata));
    return c.json({ status: 'registered' });
});

export default app;
