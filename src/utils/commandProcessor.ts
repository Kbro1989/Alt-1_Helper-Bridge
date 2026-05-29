// src/utils/commandProcessor.ts
import { Thalamus } from '../core/Thalamus';
import { OracleLimb } from '../core/limbs/OracleLimb';
import { fetchWikiInfobox } from './wikiApi';
import { fetchRemoteItemIndex } from './remoteItemsApi';
import localItemIndex from '../../public/items_index.json';

export type CommandHandler = (args: string[]) => Promise<string>;

async function findItemId(name: string): Promise<number | null> {
  const remoteIndex = await fetchRemoteItemIndex();
  const index = remoteIndex || (localItemIndex as [number, string][]);
  const entry = index.find(([_, n]) => n.toLowerCase() === name.toLowerCase());
  return entry ? entry[0] : null;
}

const commands: Record<string, { description: string; handler: CommandHandler }> = {
  '/wiki': {
    description: 'Get info on an item: /wiki <item name>',
    handler: async (args) => {
      const name = args.join(' ');
      if (!name) return 'Usage: /wiki <item name>';
      const id = await findItemId(name);
      const info = await fetchWikiInfobox(name);
      let response = `Wiki info for "${name}"${id !== null ? ` (ID: ${id})` : ''}:\n`;
      if (info) {
        response += Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n');
      } else {
        response += 'No specific infobox data found.';
      }
      return response;
    }
  },
  '/oracle': {
    description: 'Query the Oracle limb: /oracle <prompt>',
    handler: async (args) => {
      const prompt = args.join(' ');
      if (!prompt) return 'Usage: /oracle <prompt>';
      const thalamus = Thalamus.getInstance();
      const oracle = thalamus.getLimb<OracleLimb>('ORACLE_CORTEX');
      const dummyTelemetry = { timestamp: Date.now() } as any;
      const response = await oracle.query(prompt, dummyTelemetry);
      return (response.payload as { text?: string }).text || 'No response';
    }
  },
  '/infer': {
    description: 'Query the Oracle with current profile context: /infer <prompt>',
    handler: async (args) => {
      const prompt = args.join(' ');
      if (!prompt) return 'Usage: /infer <prompt>';
      const thalamus = Thalamus.getInstance();
      const oracle = thalamus.getLimb<OracleLimb>('ORACLE_CORTEX');
      const context = "Current Profile: Pick Of Gods. Total Level: 2850. Boss Kills: 0 (Placeholder).";
      const dummyTelemetry = { timestamp: Date.now() } as any;
      const response = await oracle.query(prompt, dummyTelemetry, undefined, context);
      return (response.payload as { text?: string }).text || 'No response';
    }
  },
  '/help': {
    description: 'List available commands',
    handler: async () => {
      return Object.entries(commands)
        .map(([cmd, { description }]) => `${cmd}: ${description}`)
        .join('\n');
    }
  }
};

export async function processCommand(input: string): Promise<string> {
  const [cmd, ...args] = input.split(' ');
  if (!commands[cmd]) return `Unknown command: ${cmd}. Type /help for assistance.`;
  return await commands[cmd].handler(args);
}
