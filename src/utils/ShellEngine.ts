import { ok, err, type Result } from '../core/models';

export interface ShellParams {
    command: string;
    cwd?: string;
}

export class ShellEngine {
    constructor(_renderer: any) {
    }

    public async execute(_params: ShellParams): Promise<Result<{ output: string }>> {
        try {
            return ok({ output: 'Shell execution mock success' });
        } catch (e) {
            return err(e as Error);
        }
    }
}
