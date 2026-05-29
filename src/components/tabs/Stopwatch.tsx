import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

export function Stopwatch() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((t) => t + 10);
      }, 10) as unknown as number;
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const toggleRunning = () => setIsRunning(!isRunning);
  const reset = () => {
    setIsRunning(false);
    setTime(0);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return {
      big: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      small: centiseconds.toString().padStart(2, '0')
    };
  };

  const { big, small } = formatTime(time);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', border: '1px solid hsla(var(--secondary), 0.3)' }}>
      <h3 style={{ color: 'hsl(var(--accent-cyan))', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
        <Timer size={16} /> Stopwatch
      </h3>
      
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '4rem', color: 'white', textShadow: '0 0 20px hsla(var(--secondary), 0.5)' }}>
        {big}<span style={{ fontSize: '2rem', color: 'hsl(var(--text-muted))' }}>.{small}</span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={toggleRunning} className="btn-primary" style={{ padding: '10px 20px' }}>
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="btn-secondary" style={{ padding: '10px 20px' }}>
          <RotateCcw size={18} /> Reset
        </button>
      </div>
    </div>
  );
}
