// Import necessary types and utilities
import { type Result, type EngineOutput, type YaoState } from './core/models.js';
import { type SovereignDomain, DOMAIN_ADJACENCY } from './core/types/SovereignDomain.js';
import { createLogger } from "./utils/logger.js";

const logger = createLogger('ToolRegistry');

/**
 * Defines the structure for a sovereign tool, including its metadata, domain,
 * and execution parameters. All properties are readonly to ensure immutability
 * once a tool definition is created.
 */
export interface ToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly humanDescription?: string;      // High-level explanation for non-specialists
    readonly jargonDescription?: string;     // Technical, low-level explanation
    readonly idealYaoState?: YaoState;       // Preferred metabolic state for execution
    readonly domain: SovereignDomain;
    readonly category?: 'core' | 'filesystem' | 'network' | 'ai' | 'mcp' | 'sensory' | 'forge' | 'literary' | 'creative' | 'vscode';
    readonly parameters: Readonly<Record<string, unknown>>; // Parameters are part of the definition and should be immutable
    readonly execute: (args: Readonly<Record<string, unknown>>) => Promise<Result<EngineOutput>>; // The execution function itself is part of the definition
}

/**
 * ToolRegistry â€” Sovereign capability substrate with domain scoping.
 * Phase 18: Refined tool organization and category-based filtering.
 * Manages the registration, retrieval, and filtering of ToolDefinitions.
 */
export class ToolRegistry {
    private readonly tools: Map<string, ToolDefinition> = new Map();

    /**
     * Register a tool with the sovereign substrate.
     * @param tool The ToolDefinition to register.
     */
    public register(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
        logger.debug({ tool: tool.name, domain: tool.domain, category: tool.category }, 'Tool registered');
    }

    /**
     * Retrieve a tool by name (case-insensitive and format-agnostic).
     * Normalizes the input name and registered tool names for robust lookup.
     * @param name The name of the tool to retrieve.
     * @returns The ToolDefinition if found, otherwise undefined.
     */
    public getTool(name: string): ToolDefinition | undefined {
        const exact = this.tools.get(name);
        if (exact) return exact;

        const normalized = name.toLowerCase().replace(/[_-\s]/g, '');
        for (const [key, tool] of this.tools.entries()) {
            if (key.toLowerCase().replace(/[_-\s]/g, '') === normalized) {
                return tool;
            }
        }
        return undefined;
    }

    /**
     * Get all registered tool definitions.
     * @returns An array of all registered ToolDefinitions.
     */
    public getDefinitions(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tools scoped to a specific domain, including tools from adjacent domains
     * as defined by DOMAIN_ADJACENCY.
     * @param domain The primary domain for which to retrieve tools.
     * @returns An array of ToolDefinitions relevant to the specified domain and its adjacencies.
     */
    public getToolsForDomain(domain: SovereignDomain): ToolDefinition[] {
        const allowedDomains = DOMAIN_ADJACENCY[domain];
        if (!allowedDomains) {
            logger.warn({ domain }, 'No adjacency mapping found for domain. Returning empty array.');
            return [];
        }
        return this.getDefinitions().filter((t: ToolDefinition) => allowedDomains.has(t.domain));
    }

    /**
     * Get tools by a specific category.
     * @param category The category string to filter tools by.
     * @returns An array of ToolDefinitions belonging to the specified category.
     */
    public getToolsByCategory(category: string): ToolDefinition[] {
        return this.getDefinitions().filter((t: ToolDefinition) => t.category === category);
    }

    /**
     * Get formatted definitions for ALL tools (unscoped), suitable for human readability.
     * @returns A string containing a newline-separated list of formatted tool descriptions.
     */
    public getFormattedDefinitions(): string {
        return this.getDefinitions()
            .map((t: ToolDefinition) => `- ${t.name} [${t.domain}${t.category ? `:${t.category}` : ''}]: ${t.description}`)
            .join('\n');
    }

    /**
     * Get formatted definitions scoped to a domain for LLM context.
     * Includes tool name, description, and JSON-stringified parameters.
     * @param domain The domain to scope the formatted definitions to.
     * @returns A string containing a newline-separated list of formatted tool descriptions for LLM consumption.
     */
    public getFormattedDefinitionsForDomain(domain: SovereignDomain): string {
        return this.getToolsForDomain(domain)
            .map((t: ToolDefinition) => `- ${t.name}: ${t.description}. Params: ${JSON.stringify(t.parameters)}`)
            .join('\n');
    }

    /**
     * Get the domain for a specific tool.
     * @param toolName The name of the tool.
     * @returns The SovereignDomain of the tool if found, otherwise undefined.
     */
    public getToolDomain(toolName: string): SovereignDomain | undefined {
        return this.getTool(toolName)?.domain;
    }

    /**
     * Get all registered tool names.
     * @returns An array of strings, each representing the name of a registered tool.
     */
    public getToolNames(): string[] {
        return Array.from(this.tools.keys());
    }
}
