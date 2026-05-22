import { Sparkles, Compass, Activity, TrendingUp, BarChart2, Layers, Settings } from 'lucide-react';

type TabType = 'oracle' | 'clue' | 'warden' | 'xp' | 'settings' | 'plugins' | 'ge-flip';

interface TabNavigationProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
}

export default function TabNavigation({ currentTab, setCurrentTab }: TabNavigationProps) {
  return (
    <nav className="tab-navigation">
      <button className={`tab-button ${currentTab === 'oracle' ? 'active' : ''}`} onClick={() => setCurrentTab('oracle')}>
        <Sparkles size={16} />
        AI Oracle
      </button>
      <button className={`tab-button ${currentTab === 'clue' ? 'active' : ''}`} onClick={() => setCurrentTab('clue')}>
        <Compass size={16} />
        Clue Solver
      </button>
      <button className={`tab-button ${currentTab === 'warden' ? 'active' : ''}`} onClick={() => setCurrentTab('warden')}>
        <Activity size={16} />
        Buff Sensor
      </button>
      <button className={`tab-button ${currentTab === 'xp' ? 'active' : ''}`} onClick={() => setCurrentTab('xp')}>
        <TrendingUp size={16} />
        XP Meter
      </button>
      <button className={`tab-button ${currentTab === 'ge-flip' ? 'active' : ''}`} onClick={() => setCurrentTab('ge-flip')}>
        <BarChart2 size={16} style={{ color: 'hsl(var(--accent-emerald))' }} />
        GE Flip
      </button>
      <button className={`tab-button ${currentTab === 'plugins' ? 'active' : ''}`} onClick={() => setCurrentTab('plugins')}>
        <Layers size={16} />
        Installed Plugins
      </button>
      <button className={`tab-button ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>
        <Settings size={16} />
        HUD Config
      </button>
    </nav>
  );
}
