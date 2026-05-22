import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BarChart2, 
  Search, 
  Sparkles, 
  Layers, 
  Volume2, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle
} from 'lucide-react';
import * as a1lib from 'alt1/base';
import { 
  readTooltip, 
  mixColor, 
  drawNativeRect, 
  drawNativeText, 
  setNativeOverlayGroup, 
  clearNativeOverlayGroup 
} from '../../utils/alt1Bridge';
import { 
  resolveItemNameToId, 
  fetchGeItemDetail, 
  fetchGePriceGraph 
} from '../../utils/geApi';
import { 
  analyzeFlip, 
  type FlipAnalysis 
} from '../../utils/geEngine';

interface TrackedItem {
  itemId: number;
  itemName: string;
  analysis: FlipAnalysis;
  alarmEnabled: boolean;
  alarmThreshold: number;
  alarmMode: 'below' | 'above';
  alarmSound: 'siren' | 'chime' | 'bell';
  lastTriggered: number;
}

interface GeFlipProps {
  playSynthAlarm: (type: 'bell' | 'siren' | 'chime') => void;
  addTerminalLog: (tag: string, message: string) => void;
}

export default function GeFlip({ playSynthAlarm, addTerminalLog }: GeFlipProps) {
  // --- States ---
  const [isRsApiLoading, setIsRsApiLoading] = useState(false);
  const [rsApiError, setRsApiError] = useState<string | null>(null);
  
  const [geSearchInput, setGeSearchInput] = useState('');
  const [geActiveAnalysis, setGeActiveAnalysis] = useState<FlipAnalysis | null>(null);
  const [isGeScanRunning, setIsGeScanRunning] = useState(false);
  const [geFlipAlertThreshold, setGeFlipAlertThreshold] = useState<number>(0);
  const [geFlipAlertEnabled, setGeFlipAlertEnabled] = useState(false);
  const [geOverlayActive, setGeOverlayActive] = useState(false);
  const [isAutoHoverEnabled, setIsAutoHoverEnabled] = useState(false);

  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>(() => {
    try {
      const saved = localStorage.getItem('aegis_tracked_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track scanning states to avoid double scans
  const lastHoveredItemRef = useRef<string | null>(null);
  const isAutoScanningRef = useRef(false);
  const scanCooldownsRef = useRef<Map<string, number>>(new Map());
  const lastScanTimesRef = useRef<number[]>([]);

  // Sync tracked items to localStorage
  useEffect(() => {
    localStorage.setItem('aegis_tracked_items', JSON.stringify(trackedItems));
  }, [trackedItems]);

  const triggerGeOverlayDraw = useCallback((analysis: FlipAnalysis) => {
    if (!a1lib.hasAlt1) return;
    const groupName = 'ge-flip-active';
    setNativeOverlayGroup(groupName);
    clearNativeOverlayGroup(groupName);

    // Green border = buy, Red = sell, Yellow = hold
    const color = analysis.recommendation === 'buy' ? mixColor(0, 255, 0) :
                  analysis.recommendation === 'sell' ? mixColor(255, 0, 0) :
                  mixColor(255, 255, 0);

    // Highlight active hovering area or default corner region
    const x = 50;
    const y = 150;
    const w = 240;
    const h = 60;

    drawNativeRect(x, y, w, h, color, 8000, 3);
    drawNativeText(
      `📊 Flip Score: ${analysis.flipScore} (${analysis.recommendation.toUpperCase()})`,
      x + 5, y + 15, color, 14, 8000
    );
    drawNativeText(
      `Margin: ${analysis.marginPercent}% | Risk: ${analysis.riskRating.toUpperCase()}`,
      x + 5, y + 35, color, 12, 8000
    );
  }, []);

  const executeGeFlipAnalysis = useCallback(async (itemName: string) => {
    setIsRsApiLoading(true);
    setRsApiError(null);
    addTerminalLog('ANALYSIS', `Resolving Jagex ID for "${itemName}"...`);
    
    try {
      const itemId = await resolveItemNameToId(itemName);
      if (!itemId) {
        throw new Error(`Could not resolve "${itemName}" to a valid Jagex Item ID.`);
      }
      
      addTerminalLog('ANALYSIS', `Resolved to ID ${itemId}. Fetching Grand Exchange detail...`);
      const detail = await fetchGeItemDetail(itemId);
      if (!detail) {
        throw new Error(`GE details fetch failed for ID ${itemId}.`);
      }
      
      addTerminalLog('ANALYSIS', `Detail loaded. Fetching 180d price graph...`);
      const graph = await fetchGePriceGraph(itemId);
      if (!graph) {
        throw new Error(`Price history graph fetch failed for ID ${itemId}.`);
      }
      
      addTerminalLog('ANALYSIS', 'Compiling statistical indicators...');
      const analysis = analyzeFlip(detail, graph);
      setGeActiveAnalysis(analysis);

      // Update analysis in trackedItems if present
      setTrackedItems(prev => prev.map(item => {
        if (item.itemId === analysis.itemId) {
          return { ...item, analysis };
        }
        return item;
      }));
      
      addTerminalLog('ANALYSIS', `Analysis complete! Flip Score: ${analysis.flipScore}/100. Rec: ${analysis.recommendation.toUpperCase()}`);
      
      // Auto-trigger sound effect based on recommendation
      if (analysis.recommendation === 'buy') {
        playSynthAlarm('chime');
      } else if (analysis.recommendation === 'sell') {
        playSynthAlarm('bell');
      }

      // Synth Siren Alert Threshold Check
      if (geFlipAlertEnabled && geFlipAlertThreshold > 0) {
        if (analysis.recommendation === 'buy' && analysis.currentPrice <= geFlipAlertThreshold) {
          playSynthAlarm('siren');
          addTerminalLog('ALARM', `🚨 PRICE SIREN TRIGGERED! Guide price (${analysis.currentPrice.toLocaleString()} gp) is below threshold (${geFlipAlertThreshold.toLocaleString()} gp)`);
        } else if (analysis.recommendation === 'sell' && analysis.currentPrice >= geFlipAlertThreshold) {
          playSynthAlarm('siren');
          addTerminalLog('ALARM', `🚨 PRICE SIREN TRIGGERED! Guide price (${analysis.currentPrice.toLocaleString()} gp) is above threshold (${geFlipAlertThreshold.toLocaleString()} gp)`);
        }
      }
      
      // Render overlay immediately if active
      if (geOverlayActive) {
        triggerGeOverlayDraw(analysis);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRsApiError(msg);
      addTerminalLog('ERROR', `GE analysis failed: ${msg}`);
      playSynthAlarm('bell');
    } finally {
      setIsRsApiLoading(false);
    }
  }, [addTerminalLog, playSynthAlarm, geFlipAlertEnabled, geFlipAlertThreshold, geOverlayActive, triggerGeOverlayDraw]);

  const isItemTooltip = (text: string, name: string): boolean => {
    const REJECT_PATTERNS = [
      /^(Walk here|Examine|Attack|Talk-to|Trade with|Follow|Report|Mark)/i,
      /^(Bank|Grand Exchange|Portal|Door|Chest|Ladder|Stairs|Gate)/i,
      /^(Pickpocket|Loot|Take|Use|Activate|Deactivate|Investigate)/i,
      /^Level \d+ /,           
      /^\d+ \w+ life points/i, 
      /^(Select|Choose|Configure|Settings|Help|Close|Back|Confirm|Cancel)/i,
      /^(Withdraw|Deposit|Exchange|Buy|Sell|Search|Sort|Filter)/i,
      /^\d+ coins?$/i,
      /^(You are here|Teleport to|Travel to)/i,
      /^(Light|Chop|Mine|Fish|Cook|Smith|Craft|Fletch|Herb|Farm)/i,
    ];

    const ACCEPT_PATTERNS = [
      /(Tradeable|Untradeable|Members|Not tradeable)/i,
      /Value: [\d,]+ gp/i,
      /(Buy limit|Guide price|Grand Exchange)/i,
      /(Damage|Accuracy|Armour|Life points|Prayer bonus)/i,
      /(\d+ )?charges?/i,
    ];

    const nameClean = name.trim();
    if (nameClean.length < 3 || nameClean.length > 45) return false;

    const rejected = REJECT_PATTERNS.some(r => r.test(text));
    const accepted = ACCEPT_PATTERNS.some(r => r.test(text));
    
    return !rejected && (accepted || (nameClean.length >= 3 && nameClean.length <= 40));
  };

  // Auto-Hover Loop
  useEffect(() => {
    if (!isAutoHoverEnabled) {
      lastHoveredItemRef.current = null;
      return;
    }

    let hoverDebounce: number | null = null;

    const interval = setInterval(() => {
      if (isAutoScanningRef.current || isRsApiLoading) return;

      try {
        const tooltip = readTooltip();
        if (!tooltip || !tooltip.text) {
          lastHoveredItemRef.current = null;
          return;
        }

        const itemName = tooltip.text.split('\n')[0].replace(/[^a-zA-Z0-9\s'()-]/g, '').trim();
        if (!itemName || !isItemTooltip(tooltip.text, itemName)) {
          lastHoveredItemRef.current = null;
          return;
        }

        if (itemName === lastHoveredItemRef.current) return;

        // Per-item Cooldown Check (8s per item)
        const now = Date.now();
        const lastScan = scanCooldownsRef.current.get(itemName) || 0;
        if (now - lastScan < 8000) return;

        // Global Rate Limit Check (Max 12 scans per minute)
        const pastMinute = now - 60000;
        lastScanTimesRef.current = lastScanTimesRef.current.filter(t => t > pastMinute);
        if (lastScanTimesRef.current.length >= 12) return;

        if (hoverDebounce) clearTimeout(hoverDebounce);

        // Cursor Settle Debounce optimized to 120ms
        hoverDebounce = window.setTimeout(async () => {
          if (isAutoScanningRef.current) return;
          
          const scanTime = Date.now();
          isAutoScanningRef.current = true;
          lastHoveredItemRef.current = itemName;
          
          // Commit to cooldown maps
          scanCooldownsRef.current.set(itemName, scanTime);
          lastScanTimesRef.current.push(scanTime);

          addTerminalLog('GE_SCAN', `Auto-Hover detected: "${itemName}"`);
          setGeSearchInput(itemName);

          try {
            await executeGeFlipAnalysis(itemName);
          } finally {
            isAutoScanningRef.current = false;
          }
        }, 120);

      } catch {
        // Silent catch
      }
    }, 150);

    return () => {
      clearInterval(interval);
      if (hoverDebounce) clearTimeout(hoverDebounce);
    };
  }, [isAutoHoverEnabled, isRsApiLoading, executeGeFlipAnalysis, addTerminalLog]);

  // Background refresh for Tracked Items (every 60 seconds)
  useEffect(() => {
    if (trackedItems.length === 0) return;

    const interval = setInterval(async () => {
      addTerminalLog('ALARM', `Background refreshing ${trackedItems.length} pinned slots...`);

      for (const item of trackedItems) {
        try {
          const detail = await fetchGeItemDetail(item.itemId);
          const graph = await fetchGePriceGraph(item.itemId);
          if (detail && graph) {
            const freshAnalysis = analyzeFlip(detail, graph);

            if (item.alarmEnabled && item.alarmThreshold > 0) {
              const shouldTrigger = item.alarmMode === 'below'
                ? freshAnalysis.currentPrice <= item.alarmThreshold
                : freshAnalysis.currentPrice >= item.alarmThreshold;

              const cooldownOk = Date.now() - item.lastTriggered > 300000; // 5 min cooldown

              if (shouldTrigger && cooldownOk) {
                playSynthAlarm(item.alarmSound);
                addTerminalLog('ALARM', `🚨 MULTI-SLOT ALARM: "${item.itemName}" crossed target at ${freshAnalysis.currentPrice.toLocaleString()} gp (Mode: ${item.alarmMode.toUpperCase()})`);

                setTrackedItems(prev => prev.map(p => {
                  if (p.itemId === item.itemId) {
                    return { ...p, analysis: freshAnalysis, lastTriggered: Date.now() };
                  }
                  return p;
                }));
                continue;
              }
            }

            setTrackedItems(prev => prev.map(p => {
              if (p.itemId === item.itemId) {
                return { ...p, analysis: freshAnalysis };
              }
              return p;
            }));
          }
          await new Promise(r => setTimeout(r, 500));
        } catch {
          // Silent catch
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [trackedItems, addTerminalLog, playSynthAlarm]);

  const pinCurrentItem = () => {
    if (!geActiveAnalysis) return;

    if (trackedItems.some(item => item.itemId === geActiveAnalysis.itemId)) {
      addTerminalLog('ALARM', `"${geActiveAnalysis.itemName}" is already pinned.`);
      return;
    }

    const newItem: TrackedItem = {
      itemId: geActiveAnalysis.itemId,
      itemName: geActiveAnalysis.itemName,
      analysis: geActiveAnalysis,
      alarmEnabled: false,
      alarmThreshold: geActiveAnalysis.currentPrice,
      alarmMode: 'below',
      alarmSound: 'siren',
      lastTriggered: 0
    };

    setTrackedItems(prev => [...prev, newItem]);
    addTerminalLog('ALARM', `Pinned "${geActiveAnalysis.itemName}" to your Multi-Slot dashboard.`);
    playSynthAlarm('chime');
  };

  const removeTrackedItem = (itemId: number) => {
    setTrackedItems(prev => prev.filter(item => item.itemId !== itemId));
    addTerminalLog('ALARM', `Removed item ID ${itemId} from dashboard.`);
    playSynthAlarm('bell');
  };

  const toggleTrackedAlarm = (itemId: number) => {
    setTrackedItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        const nextState = !item.alarmEnabled;
        addTerminalLog('ALARM', `Alarm for "${item.itemName}" set to ${nextState ? 'ENABLED' : 'DISABLED'}`);
        return { ...item, alarmEnabled: nextState };
      }
      return item;
    }));
  };

  const updateTrackedAlarmThreshold = (itemId: number, threshold: number) => {
    setTrackedItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, alarmThreshold: threshold };
      }
      return item;
    }));
  };

  const updateTrackedAlarmMode = (itemId: number, mode: 'below' | 'above') => {
    setTrackedItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, alarmMode: mode };
      }
      return item;
    }));
  };

  const updateTrackedAlarmSound = (itemId: number, sound: 'siren' | 'chime' | 'bell') => {
    setTrackedItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, alarmSound: sound };
      }
      return item;
    }));
  };

  const handleScanGeTooltip = async () => {
    setIsGeScanRunning(true);
    addTerminalLog('GE_SCAN', 'Scanning screen buffers for active item tooltips...');
    
    try {
      const result = readTooltip();
      if (result && result.text) {
        const itemName = result.text.split('\n')[0].replace(/[^a-zA-Z0-9\s'()-]/g, '').trim();
        addTerminalLog('GE_SCAN', `Tooltip OCR match: "${itemName}"`);
        setGeSearchInput(itemName);
        await executeGeFlipAnalysis(itemName);
      } else {
        addTerminalLog('GE_SCAN', 'No active blue tooltip box detected. Hover an item first!');
        playSynthAlarm('bell');
      }
    } catch (err) {
      addTerminalLog('GE_SCAN', `Scan failed: ${err}`);
    } finally {
      setIsGeScanRunning(false);
    }
  };

  const handleToggleGeOverlay = () => {
    const nextState = !geOverlayActive;
    setGeOverlayActive(nextState);
    const groupName = 'ge-flip-active';
    
    if (nextState) {
      addTerminalLog('OVERLAY', 'Native AR HUD Overlay activated.');
      if (geActiveAnalysis) {
        triggerGeOverlayDraw(geActiveAnalysis);
      }
    } else {
      addTerminalLog('OVERLAY', 'Native AR HUD Overlay cleared.');
      clearNativeOverlayGroup(groupName);
    }
    playSynthAlarm('chime');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ padding: '16px', background: 'linear-gradient(135deg, hsla(var(--primary), 0.15), hsla(var(--accent-cyan), 0.05))', border: '1px solid hsla(var(--primary), 0.25)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={18} style={{ color: 'hsl(var(--accent-cyan))' }} />
              Grand Exchange Flip & Arbitrage Engine
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
              Real-time statistical market scanning, buy/sell limit evaluation, and volatility calculation using live Wiki Cargo databases.
            </p>
          </div>
          <span className="badge badge-live" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'hsl(var(--accent-cyan))', border: '1px solid hsla(var(--accent-cyan), 0.3)' }}>
            MARKET MONITOR ACTIVE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginTop: '4px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'hsl(var(--text-muted))' }} />
            <input 
              type="text" 
              value={geSearchInput}
              onChange={(e) => setGeSearchInput(e.target.value)}
              placeholder="Type item name (e.g. Noxious scythe, Saradomin brew...)"
              className="premium-input" 
              style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8rem' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && geSearchInput.trim()) {
                  executeGeFlipAnalysis(geSearchInput.trim());
                }
              }}
            />
          </div>
          <button 
            onClick={() => executeGeFlipAnalysis(geSearchInput.trim())}
            disabled={isRsApiLoading || !geSearchInput.trim()}
            className="btn-primary"
            style={{ padding: '0 16px', height: '36px', fontSize: '0.75rem' }}
          >
            {isRsApiLoading ? 'Processing...' : 'Analyze Market'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '2px' }}>
          <button 
            onClick={() => setIsAutoHoverEnabled(!isAutoHoverEnabled)}
            className="btn-secondary"
            style={{ 
              flex: 1, 
              height: '32px', 
              fontSize: '0.75rem', 
              justifyContent: 'center', 
              borderColor: isAutoHoverEnabled ? 'hsl(var(--accent-cyan))' : 'rgba(255,255,255,0.1)',
              color: isAutoHoverEnabled ? 'hsl(var(--accent-cyan))' : 'white',
              background: isAutoHoverEnabled ? 'rgba(0, 242, 254, 0.08)' : 'transparent'
            }}
            title="Ambient OCR scanning of tooltips automatically as you play"
          >
            <Sparkles size={13} style={{ marginRight: '6px', color: isAutoHoverEnabled ? 'hsl(var(--accent-cyan))' : 'inherit' }} />
            {isAutoHoverEnabled ? 'Ambient Hover [ON]' : 'Enable Auto-Hover Loop'}
          </button>

          <button 
            onClick={handleScanGeTooltip}
            disabled={isGeScanRunning}
            className="btn-secondary"
            style={{ flex: 1, height: '32px', fontSize: '0.75rem', justifyContent: 'center' }}
            title="OCR scan Alt1 screen buffer for item blue tooltips"
          >
            <Search size={13} style={{ marginRight: '6px' }} />
            {isGeScanRunning ? 'Scanning...' : 'Manual Tooltip Scan'}
          </button>

          <button 
            onClick={handleToggleGeOverlay}
            className="btn-secondary"
            style={{ 
              flex: 1, 
              height: '32px', 
              fontSize: '0.75rem', 
              justifyContent: 'center',
              borderColor: geOverlayActive ? 'hsl(var(--accent-rose))' : 'hsl(var(--accent-emerald))', 
              color: geOverlayActive ? 'hsl(var(--accent-rose))' : 'hsl(var(--accent-emerald))'
            }}
          >
            <Layers size={13} style={{ marginRight: '6px' }} />
            {geOverlayActive ? 'Clear AR Overlay' : 'Deploy AR HUD Overlay'}
          </button>
        </div>
      </div>

      {rsApiError && (
        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-rose))', padding: '10px', background: 'rgba(255, 107, 107, 0.08)', borderRadius: '8px', border: '1px solid rgba(255, 107, 107, 0.2)' }}>
          ⚠️ {rsApiError}
        </div>
      )}

      {/* Multi-Slot Arbitrage Dashboard Panel */}
      <div style={{ padding: '16px', background: 'hsla(var(--bg-surface-elevated), 0.3)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={16} style={{ color: 'hsl(var(--accent-cyan))' }} />
          Multi-Slot Arbitrage Dashboard ({trackedItems.length} active slots)
        </h4>
        {trackedItems.length === 0 ? (
          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic', padding: '12px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
            No pinned arbitrage slots. Search an item and click "+ Pin Slot" to track multiple items concurrently with background synthesized alarm warnings!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {trackedItems.map((item) => {
              const estimatedMargin = Math.abs(item.analysis.currentPrice - item.analysis.avg30d);
              return (
                <div 
                  key={item.itemId} 
                  style={{ 
                    padding: '12px', 
                    background: 'hsla(var(--bg-surface-elevated), 0.6)', 
                    border: '1px solid hsla(var(--border-light))', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    position: 'relative' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={`https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=${item.itemId}`} 
                          alt={item.itemName}
                          style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=4151";
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong 
                          style={{ fontSize: '0.78rem', color: 'white', cursor: 'pointer' }}
                          onClick={() => {
                            setGeSearchInput(item.itemName);
                            setGeActiveAnalysis(item.analysis);
                          }}
                          title="Click to view detailed analytics card"
                        >
                          {item.itemName}
                        </strong>
                        <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                          Guide: <strong style={{ color: 'white' }}>{item.analysis.currentPrice.toLocaleString()} gp</strong>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--accent-emerald))', fontWeight: 700 }}>
                          +{estimatedMargin.toLocaleString()} gp
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>
                          Yield: {item.analysis.marginPercent}%
                        </span>
                      </div>
                      <button 
                        onClick={() => removeTrackedItem(item.itemId)}
                        className="btn-action-cyan"
                        style={{ 
                          padding: '4px 6px', 
                          background: 'rgba(255, 75, 75, 0.1)', 
                          color: 'hsl(var(--accent-rose))', 
                          borderColor: 'rgba(255, 75, 75, 0.2)',
                          fontSize: '0.65rem' 
                        }}
                        title="Unpin slot"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Mini Alarm Controller deck */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <button
                      onClick={() => toggleTrackedAlarm(item.itemId)}
                      className="btn-action-cyan"
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px 8px',
                        height: '24px',
                        background: item.alarmEnabled ? 'hsla(var(--accent-emerald), 0.15)' : 'rgba(255,255,255,0.05)',
                        color: item.alarmEnabled ? 'hsl(var(--accent-emerald))' : 'hsl(var(--text-muted))',
                        borderColor: item.alarmEnabled ? 'rgba(0, 255, 128, 0.3)' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      <Volume2 size={11} style={{ marginRight: '4px' }} />
                      {item.alarmEnabled ? 'Alarm Active' : 'Alarm Disabled'}
                    </button>

                    {item.alarmEnabled && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'white' }}>
                          <span>Trigger if Price is</span>
                          <select
                            value={item.alarmMode}
                            title="Alarm Mode Selection"
                            onChange={(e) => updateTrackedAlarmMode(item.itemId, e.target.value as 'below' | 'above')}
                            style={{ background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 4px', fontSize: '0.65rem' }}
                          >
                            <option value="below">BELOW</option>
                            <option value="above">ABOVE</option>
                          </select>
                        </div>

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '85px' }}>
                          <input 
                            type="number" 
                            value={item.alarmThreshold || ''}
                            onChange={(e) => updateTrackedAlarmThreshold(item.itemId, Number(e.target.value))}
                            style={{ height: '22px', fontSize: '0.65rem', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0 4px', width: '100%' }}
                            title="Trigger threshold price"
                            placeholder="gp threshold"
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'white' }}>
                          <span>Sound:</span>
                          <select
                            value={item.alarmSound}
                            title="Alarm Sound Selection"
                            onChange={(e) => updateTrackedAlarmSound(item.itemId, e.target.value as 'siren' | 'chime' | 'bell')}
                            style={{ background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 4px', fontSize: '0.65rem' }}
                          >
                            <option value="siren">🚨 Siren</option>
                            <option value="chime">🔔 Chime</option>
                            <option value="bell">🛎️ Bell</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {geActiveAnalysis && (() => {
        const estimatedMarginGpValue = Math.abs(geActiveAnalysis.currentPrice - geActiveAnalysis.avg30d);
        const trend30dPercent = Math.round(((geActiveAnalysis.currentPrice - geActiveAnalysis.avg30d) / Math.max(1, geActiveAnalysis.avg30d)) * 10000) / 100;
        const trend30dStr = trend30dPercent >= 0 ? '+' + trend30dPercent + '%' : trend30dPercent + '%';
        const trend90dPercent = Math.round(((geActiveAnalysis.currentPrice - geActiveAnalysis.avg90d) / Math.max(1, geActiveAnalysis.avg90d)) * 10000) / 100;
        const trend90dStr = trend90dPercent >= 0 ? '+' + trend90dPercent + '%' : trend90dPercent + '%';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Item Details Header Card */}
            <div style={{ padding: '14px', background: 'hsla(var(--bg-surface-elevated), 0.5)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid hsla(var(--border-light))', flexShrink: 0, padding: '4px' }}>
                <img 
                  src={`https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=${geActiveAnalysis.itemId}`} 
                  alt={geActiveAnalysis.itemName} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=4151";
                  }}
                  style={{ width: '44px', height: '44px', objectFit: 'contain' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>{geActiveAnalysis.itemName}</h4>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button 
                      onClick={pinCurrentItem}
                      className="btn-action-cyan"
                      style={{ 
                        fontSize: '0.68rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        background: trackedItems.some(i => i.itemId === geActiveAnalysis.itemId) ? 'rgba(0, 255, 128, 0.12)' : 'rgba(0, 242, 254, 0.12)', 
                        color: trackedItems.some(i => i.itemId === geActiveAnalysis.itemId) ? 'hsl(var(--accent-emerald))' : 'hsl(var(--accent-cyan))', 
                        borderColor: trackedItems.some(i => i.itemId === geActiveAnalysis.itemId) ? 'rgba(0, 255, 128, 0.3)' : 'rgba(0, 242, 254, 0.3)' 
                      }}
                    >
                      {trackedItems.some(i => i.itemId === geActiveAnalysis.itemId) ? '✓ Pinned' : '+ Pin Slot'}
                    </button>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--text-muted))', border: '1px solid rgba(255,255,255,0.1)' }}>
                      ID: {geActiveAnalysis.itemId}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>"{geActiveAnalysis.description}"</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                  <span>Category: <strong style={{ color: 'white' }}>{geActiveAnalysis.itemType}</strong></span>
                  <span>•</span>
                  <span>Daily Vol: <strong style={{ color: 'hsl(var(--accent-cyan))' }}>{geActiveAnalysis.volatilityPercent.toLocaleString()} gp</strong></span>
                </div>
              </div>
            </div>

            {/* Primary Arbitrage Analytics Display Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              
              {/* Recommendations & Flip Score Panel */}
              <div style={{ padding: '14px', background: 'hsla(var(--bg-surface-elevated), 0.5)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Tactical Verdict</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {geActiveAnalysis.recommendation === 'buy' && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(0, 255, 128, 0.12)', border: '1px solid rgba(0, 255, 128, 0.3)', color: 'hsl(var(--accent-emerald))', fontWeight: 700, fontSize: '0.85rem' }}>
                        <TrendingUp size={14} /> HIGH BUY PRESSURE
                      </div>
                    )}
                    {geActiveAnalysis.recommendation === 'sell' && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255, 75, 75, 0.12)', border: '1px solid rgba(255, 75, 75, 0.3)', color: 'hsl(var(--accent-rose))', fontWeight: 700, fontSize: '0.85rem' }}>
                        <TrendingDown size={14} /> LIQUIDATE / SELL
                      </div>
                    )}
                    {geActiveAnalysis.recommendation === 'hold' && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(0, 242, 254, 0.12)', border: '1px solid rgba(0, 242, 254, 0.3)', color: 'hsl(var(--accent-cyan))', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Activity size={14} /> MARKET STABLE / HOLD
                      </div>
                    )}
                    {geActiveAnalysis.recommendation === 'avoid' && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255, 165, 0, 0.12)', border: '1px solid rgba(255, 165, 0, 0.3)', color: 'orange', fontWeight: 700, fontSize: '0.85rem' }}>
                        <AlertTriangle size={14} /> HIGH VOLATILITY AVOID
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: '1.4', marginTop: '6px' }}>
                    {geActiveAnalysis.recommendation === 'buy' && "Current margins exceed typical standard deviations. Buying is favored for immediate arbitrage."}
                    {geActiveAnalysis.recommendation === 'sell' && "Asset is experiencing downward pressure or massive negative daily change metrics. Liquidate existing stock."}
                    {geActiveAnalysis.recommendation === 'hold' && "Asset price has minimal fluctuations. Safely buy/sell at regular margins but don't expect high speed flips."}
                    {geActiveAnalysis.recommendation === 'avoid' && "High daily price deviations makes this asset dangerous. High risk of losing gp."}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Unified Flip Score:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: geActiveAnalysis.flipScore > 70 ? 'hsl(var(--accent-emerald))' : geActiveAnalysis.flipScore > 40 ? 'hsl(var(--accent-cyan))' : 'hsl(var(--accent-rose))' }}>
                      {geActiveAnalysis.flipScore} / 100
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${geActiveAnalysis.flipScore}%`, 
                        background: geActiveAnalysis.flipScore > 70 ? 'hsl(var(--accent-emerald))' : geActiveAnalysis.flipScore > 40 ? 'hsl(var(--accent-cyan))' : 'hsl(var(--accent-rose))',
                        boxShadow: `0 0 8px ${geActiveAnalysis.flipScore > 70 ? 'hsla(var(--accent-emerald), 0.5)' : 'hsla(var(--accent-cyan), 0.5)'}`,
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Financial Margin Matrix */}
              <div style={{ padding: '14px', background: 'hsla(var(--bg-surface-elevated), 0.5)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Pricing & Margins</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Active GE Guide:</span>
                    <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>{geActiveAnalysis.currentPrice.toLocaleString()} gp</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Target Buy Limit:</span>
                    <strong style={{ color: 'hsl(var(--accent-cyan))' }}>{geActiveAnalysis.buyLimitEstimate.toLocaleString()} / 4 hrs</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '2px' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Calculated Margin:</span>
                    <strong style={{ color: 'hsl(var(--accent-emerald))', fontFamily: 'var(--font-mono)' }}>+{estimatedMarginGpValue.toLocaleString()} gp</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Margin Yield:</span>
                    <strong style={{ color: 'hsl(var(--accent-emerald))', fontFamily: 'var(--font-mono)' }}>{geActiveAnalysis.marginPercent}%</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '4px', marginTop: '2px' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Max Slot Profit:</span>
                    <strong style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>
                      {Math.round(estimatedMarginGpValue * geActiveAnalysis.buyLimitEstimate).toLocaleString()} gp
                    </strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Risk Rating:</span>
                  <span style={{ fontWeight: 700, color: geActiveAnalysis.riskRating === 'low' ? 'hsl(var(--accent-emerald))' : geActiveAnalysis.riskRating === 'medium' ? 'hsl(var(--accent-cyan))' : 'hsl(var(--accent-rose))' }}>
                    {geActiveAnalysis.riskRating.toUpperCase()}
                  </span>
                </div>
              </div>

            </div>

            {/* Historical Trend Vector analysis card */}
            <div style={{ padding: '14px', background: 'hsla(var(--bg-surface-elevated), 0.5)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} style={{ color: 'hsl(var(--accent-cyan))' }} />
                Long-Term Price Vector & Volatility
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', marginTop: '4px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>30d Price Vector</span>
                  <strong style={{ fontSize: '0.78rem', color: trend30dStr.startsWith('+') ? 'hsl(var(--accent-emerald))' : 'hsl(var(--accent-rose))' }}>
                    {trend30dStr}
                  </strong>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>90d Price Vector</span>
                  <strong style={{ fontSize: '0.78rem', color: trend90dStr.startsWith('+') ? 'hsl(var(--accent-emerald))' : 'hsl(var(--accent-rose))' }}>
                    {trend90dStr}
                  </strong>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>180d Classifier</span>
                  <strong style={{ fontSize: '0.72rem', color: 'white', textTransform: 'uppercase' }}>
                    {geActiveAnalysis.trend180d}
                  </strong>
                </div>
              </div>
            </div>

            {/* Synth Siren Custom Pricing Alarm Setup */}
            <div style={{ padding: '14px', background: 'hsla(var(--bg-surface-elevated), 0.5)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={14} style={{ color: 'hsl(var(--secondary))' }} />
                Target Pricing Siren Alert Tether
              </h5>
              <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                Configure the synthesizer to automatically play a loud audio warning if the Jagex API guide price crosses your custom limit!
              </p>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    className="premium-input" 
                    placeholder="Guide price gp limit..." 
                    value={geFlipAlertThreshold || ''}
                    onChange={(e) => setGeFlipAlertThreshold(Number(e.target.value))}
                    style={{ height: '32px', paddingRight: '32px', fontSize: '0.75rem' }}
                    title="Target Alert Price"
                  />
                  <span style={{ position: 'absolute', right: '10px', fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>gp</span>
                </div>
                <button 
                  onClick={() => {
                    const next = !geFlipAlertEnabled;
                    setGeFlipAlertEnabled(next);
                    if (next) {
                      addTerminalLog('ALARM', `Price alarm configured at ${geFlipAlertThreshold.toLocaleString()} gp`);
                      playSynthAlarm('chime');
                    } else {
                      addTerminalLog('ALARM', `Price alarm disabled.`);
                    }
                  }}
                  className={`btn-action-cyan`}
                  style={{ 
                    padding: '0 12px', 
                    height: '32px', 
                    fontSize: '0.72rem', 
                    background: geFlipAlertEnabled ? 'hsla(var(--accent-emerald), 0.15)' : 'rgba(255,255,255,0.06)',
                    color: geFlipAlertEnabled ? 'hsl(var(--accent-emerald))' : 'white',
                    borderColor: geFlipAlertEnabled ? 'hsla(var(--accent-emerald), 0.3)' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  {geFlipAlertEnabled ? 'Alarm Bound' : 'Set Alarm'}
                </button>
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
}
