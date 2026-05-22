import { Layers, Link } from 'lucide-react';
import { installedApps } from '../../utils/installedApps';

export default function PluginManager() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '16px', background: 'hsla(var(--bg-surface-elevated), 0.5)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--accent-cyan))', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={16} />
          Installed Alt1 Toolkit Apps
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          The Oracle AI is aware of these locally installed tools. You can launch them directly or ask the AI how to use them alongside your current activity.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          {installedApps.map((app, index) => (
            <div key={index} style={{ padding: '12px', background: 'hsla(var(--bg-surface-elevated), 0.4)', borderRadius: '8px', border: '1px solid hsla(var(--border-light))', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{app.name}</span>
                <button 
                  className="btn-action-cyan" 
                  style={{ padding: '4px 8px', fontSize: '0.65rem' }}
                  title={`Launch ${app.name}`}
                  aria-label={`Launch ${app.name}`}
                  onClick={() => {
                    const finalUrl = app.name.includes("Local")
                      ? `${window.location.origin}/appconfig.json`
                      : app.url;
                    if (window.alt1 && window.alt1.identifyAppUrl) {
                      window.alt1.identifyAppUrl(finalUrl);
                    } else {
                      window.open(finalUrl, '_blank');
                    }
                  }}
                >
                  Launch <Link size={10} style={{ marginLeft: '4px' }} />
                </button>
              </div>
              {app.description && (
                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: '1.3' }}>
                  {app.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
