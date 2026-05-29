import { ToolRegistry } from '../../ToolRegistry';
import { err, type Result } from '../models';
import { registerWikiParser } from '../tools/wikiParserTool';

/**
 * OrchestrateEngine (Miniaturized for Alt1-AI)
 * Manages tool registration and execution.
 */
export class OrchestrateEngine {
    private readonly registry: ToolRegistry;
    private readonly renderer: any;

    constructor(renderer: any) {
        this.renderer = renderer;
        this.registry = new ToolRegistry();
        this.initializeTools();
    }

    private initializeTools(): void {
        registerWikiParser(this.registry, this.renderer);
    }

    public async executeTool(
        toolName: string,
        args: Record<string, unknown> = {}
    ): Promise<Result<any>> {
        const tool = this.registry.getTool(toolName);
        if (!tool) {
            return err(new Error(`Tool not found: ${toolName}`));
        }
        return tool.execute(args);
    }
}
