/**
 * src/utils/CanonicalClock.ts
 * A central heartbeat for the Sovereign Substrate.
 */
export class CanonicalClock {
  private static instance: CanonicalClock;
  private listeners: Array<(tick: number) => void> = [];
  private tick = 0;

  private constructor() {
    setInterval(() => {
      this.tick++;
      this.listeners.forEach((l) => l(this.tick));
    }, 600);
  }

  public static getInstance(): CanonicalClock {
    if (!this.instance) this.instance = new CanonicalClock();
    return this.instance;
  }

  public registerPulse(listener: { callback: (tick: number) => void }) {
    this.listeners.push(listener.callback);
  }
}
