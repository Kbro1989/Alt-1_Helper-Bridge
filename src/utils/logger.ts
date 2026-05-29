export const createLogger = (name: string) => ({
    debug: (msg: any, ...args: any[]) => console.debug(`[${name}]`, msg, ...args),
    info: (msg: any, ...args: any[]) => console.info(`[${name}]`, msg, ...args),
    warn: (msg: any, ...args: any[]) => console.warn(`[${name}]`, msg, ...args),
    error: (msg: any, ...args: any[]) => console.error(`[${name}]`, msg, ...args),
});
