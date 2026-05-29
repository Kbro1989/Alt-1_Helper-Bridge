import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { fetchWikiInfobox } from '../../src/utils/wikiApi';

type Bindings = {
    ITEMS_LIST: KVNamespace;
    AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

// Test: Fetch item from KV and Price from Wiki
app.get('/test/enrich/:id', async (c) => {
    const id = c.req.param('id');
    
    // 1. Get from KV
    const meta = await c.env.ITEMS_LIST.get(`entity:item:${id}:meta`);
    const drops = await c.env.ITEMS_LIST.get(`entity:item:${id}:drops`);
    
    if (!meta) {
        return c.json({ error: 'Item not found in KV' }, 404);
    }

    const itemMeta = JSON.parse(meta);
    
    // 2. Fetch live price from Wiki (Proxying through the worker)
    const wikiInfo = await fetchWikiInfobox(itemMeta.name);
    
    return c.json({
        kvMeta: itemMeta,
        drops: drops ? JSON.parse(drops) : [],
        wikiPrice: wikiInfo?.['Current GE price'] || 'N/A'
    });
});

export default app;
