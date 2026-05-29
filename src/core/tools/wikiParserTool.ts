import { ok } from '../models';
import { ShellEngine } from '../../utils/ShellEngine';
import type { ToolRegistry } from '../../ToolRegistry';

export function registerWikiParser(registry: ToolRegistry, renderer: any) {
    registry.register({
        name: 'wiki_parser',
        description: 'Parse raw MediaWiki/Wiki text into structured JSON.',
        domain: 'RESEARCH',
        category: 'core',
        parameters: { text: 'string' },
        execute: async (args: Record<string, unknown>) => {
            const text = args.text as string;
            const scriptPath = 'third_party/parse_wiki.py';
            const escapedText = text.replace(/"/g, '\\"');
            const shell = new ShellEngine(renderer);
            
            const res = await shell.execute({ 
                command: `echo "${escapedText}" | python ${scriptPath}`
            });
            
            if (!res.ok) return res;
            try {
                return ok({ output: 'Wiki parsing successful.', data: JSON.parse(res.value.output) });
            } catch (e) {
                return { ok: false, error: new Error('Failed to parse wiki parser output') };
            }
        }
    });
}
