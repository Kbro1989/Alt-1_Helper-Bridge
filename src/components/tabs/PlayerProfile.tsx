import { useState, useEffect } from 'react';
import { User, Activity, ShieldAlert } from 'lucide-react';

interface PlayerProfileProps {
  username?: string;
}

export function PlayerProfile({ username = 'Pick_Of_Gods' }: PlayerProfileProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://runeapps.org/api/pprofile/player/${username}`);
        const data = await response.json();
        setProfileData(data);
      } catch (err) {
        console.error('Failed to fetch player profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) return <div style={{ color: 'hsl(var(--secondary))', padding: '20px', fontFamily: 'var(--font-mono)' }}>Initializing...</div>;

  return (
    <div style={{ color: 'white', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid hsla(var(--secondary), 0.3)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsla(var(--secondary), 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={40} style={{ color: 'hsl(var(--secondary))' }} />
        </div>
        <div>
          <h2 style={{ color: 'hsl(var(--accent-cyan))', margin: 0, fontFamily: 'var(--font-display)' }}>{username.replace('_', ' ')}</h2>
          <span className={`badge ${profileData?.online ? 'badge-live' : 'badge-stable'}`}>
            {profileData?.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h3 style={{ color: 'hsl(var(--secondary))', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} /> Skill Overview
          </h3>
          <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
            <p><strong>Total Level:</strong> {profileData?.skills?.overall?.level || 'N/A'}</p>
            <p><strong>Total XP:</strong> {profileData?.skills?.overall?.xp?.toLocaleString() || 'N/A'}</p>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h3 style={{ color: 'hsl(var(--secondary))', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} /> Boss Activity
          </h3>
          <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
            <p><strong>Boss Kills:</strong> {profileData?.bossKills?.count || '0'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
