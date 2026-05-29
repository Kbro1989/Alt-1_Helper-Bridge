export type Result<T> = { ok: true; value: T } | { ok: false; error: Error };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: Error): Result<any> => ({ ok: false, error });

export type EngineOutput = any; 
export type YaoState = 'YoungYin' | 'OldYin' | 'YoungYang' | 'OldYang';
