import { useState, useEffect } from 'react';
import { Move, X, Info, Settings } from 'lucide-react';
import { Thalamus } from '../../core/Thalamus';
import { OracleLimb } from '../../core/limbs/OracleLimb';
import { VisualParser } from '../../utils/visualParser';

interface AbilityTrackerProps {
  getCanvasSnapshotBase64: () => Promise<string | null>;
}

export function AbilityTracker({ getCanvasSnapshotBase64 }: AbilityTrackerProps) {
  const [parsedAbilities, setParsedAbilities] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (isParsing) return;
      setIsParsing(true);

      try {
        const snapshot = await getCanvasSnapshotBase64();
        if (snapshot) {
          const parsed = await VisualParser.parseAbilityBar(snapshot);

          const thalamus = Thalamus.getInstance();
          const oracle = thalamus.getLimb<OracleLimb>('ORACLE_CORTEX');

          const response = await oracle.query(
            "Parse this screenshot. Identify the ability bar and detect cooldowns/status. Return a JSON object with this structure: { abilities: [{ name: string, cooldown: number, ready: boolean }] }",
            { timestamp: Date.now() } as any,
            parsed.rawSnapshot
          );

          const text = (response.payload as { text?: string }).text || '';
          try {
            const jsonMatch = text.match(/\{.*\}/s);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                setParsedAbilities(data.abilities || []);
            }
          } catch(e) {
            console.error('Failed to parse ability data', e);
          }
        }
      } catch (err) {
        console.error('Visual parsing failed', err);
      } finally {
        setIsParsing(false);
      }
    }, 5000); // Parse every 5s
    return () => clearInterval(timer);
  }, [getCanvasSnapshotBase64, isParsing]);

  return (
    <div className="glass-panel" style={{ position: 'relative', border: '1px solid hsla(var(--secondary), 0.3)', display: 'flex', flexDirection: 'column', color: 'white' }}>
      
      {/* Ability Tracker Header/Drag Bar */}
      <div style={{ height: '30px', background: 'hsla(var(--bg-surface-elevated), 0.8)', cursor: 'move', display: 'flex', alignItems: 'center', padding: '0 8px', borderRadius: '8px 8px 0 0', borderBottom: '1px solid hsla(var(--border-light))' }}>
        <Move size={14} color="hsl(var(--text-muted))" />
        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginLeft: '8px', fontWeight: 'bold' }}>VISUAL ABILITY PARSER</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Settings size={14} className="transbutton" />
          <Info size={14} className="transbutton" />
          <X size={14} className="transbutton" />
        </div>
      </div>

      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
         {parsedAbilities.map((abil, i) => (
             <div key={i} style={{ aspectRatio: '1/1', background: 'hsla(var(--bg-surface-elevated), 0.8)', border: `1px solid ${abil.ready ? 'hsl(var(--primary))' : 'hsla(var(--border-light))'}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ fontSize: '0.6rem' }}>{abil.name.substring(0, 3)}</span>
                {!abil.ready && <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.min(abil.cooldown * 10, 100)}%`, background: 'hsla(var(--secondary), 0.5)' }}></div>}
             </div>
         ))}
      </div>
    </div>
  );
}
