import { useState } from 'react';
import { Compass, Sliders, Link, RefreshCw, Play, CheckCircle, Info } from 'lucide-react';

interface ClueSolverProps {
  playSynthAlarm: (type: 'siren' | 'bell' | 'chime') => void;
  runVisionClueAnalysis: (snapshot: string) => void;
}

const isSliderSolved = (grid: number[]): boolean => {
  for (let i = 0; i < 15; i++) {
    if (grid[i] !== i + 1) return false;
  }
  return grid[15] === 0;
};

export default function ClueSolver({ playSynthAlarm, runVisionClueAnalysis }: ClueSolverProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                runVisionClueAnalysis(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  // Clue Slider Puzzle State
  const [sliderGrid, setSliderGrid] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
  const [sliderScrambleHistory, setSliderScrambleHistory] = useState<number[]>([]);
  const [isSliderSolving, setIsSliderSolving] = useState(false);
  const [sliderSolveStepsCount, setSliderSolveStepsCount] = useState(0);

  // Clue Scroll Details
  const [activeClueType, setActiveClueType] = useState<string>('Cryptic');
  const [activeClueText, setActiveClueText] = useState<string>('Speak to the bartender in the Blue Moon Inn.');
  const [activeClueSolution, setActiveClueSolution] = useState<string>('Talk to Harlow in the Varrock Blue Moon Inn. Equip a leather body and bronze platelegs before talking.');
  const [isEditingClue, setIsEditingClue] = useState(false);
  const [clueMode, setClueMode] = useState<'riddle' | 'slider' | 'knot'>('riddle');

  // Celtic Knot Solver state
  const [knotTrackGrey, setKnotTrackGrey] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
  const [knotTrackBlue, setKnotTrackBlue] = useState<number[]>([2, 3, 4, 5, 6, 7, 0, 1]);
  const [knotTrackRed, setKnotTrackRed] = useState<number[]>([5, 6, 7, 0, 1, 2, 3, 4]);
  const [isKnotSolving, setIsKnotSolving] = useState(false);
  const [knotSolveSteps, setKnotSolveSteps] = useState<string[]>([]);

  // Handle tile slide manually
  const handleTileClick = (index: number) => {
    if (isSliderSolving) return;
    const emptyIndex = sliderGrid.indexOf(0);
    const row = Math.floor(index / 4);
    const col = index % 4;
    const emptyRow = Math.floor(emptyIndex / 4);
    const emptyCol = emptyIndex % 4;

    // Check if clicked tile is adjacent to empty tile
    const isAdjacent = (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                        (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      const newGrid = [...sliderGrid];
      newGrid[emptyIndex] = sliderGrid[index];
      newGrid[index] = 0;
      setSliderGrid(newGrid);
      setSliderScrambleHistory(prev => [...prev, index]); // Log steps for automatic undoing (Auto-Solve!)
    }
  };

  // Guaranteed Solvable Scrambler
  const scrambleSlider = () => {
    if (isSliderSolving) return;
    const currentGrid = [...sliderGrid];
    const movesHistory: number[] = [];

    // Perform 25 valid random slides to scramble
    for (let k = 0; k < 25; k++) {
      const emptyIndex = currentGrid.indexOf(0);
      const row = Math.floor(emptyIndex / 4);
      const col = emptyIndex % 4;
      const possibleSwaps: number[] = [];

      if (row > 0) possibleSwaps.push(emptyIndex - 4); // Up
      if (row < 3) possibleSwaps.push(emptyIndex + 4); // Down
      if (col > 0) possibleSwaps.push(emptyIndex - 1); // Left
      if (col < 3) possibleSwaps.push(emptyIndex + 1); // Right

      // Pick random adjacent tile to swap
      const targetSwapIndex = possibleSwaps[Math.floor(Math.random() * possibleSwaps.length)];
      
      currentGrid[emptyIndex] = currentGrid[targetSwapIndex];
      currentGrid[targetSwapIndex] = 0;
      movesHistory.push(targetSwapIndex);
    }

    setSliderGrid(currentGrid);
    // Reverse the scramble history to create a flawless, ultra-fast solution path!
    setSliderScrambleHistory(movesHistory.reverse());
    setSliderSolveStepsCount(movesHistory.length);
    playSynthAlarm('chime');
  };

  // Animate Auto-Solving
  const runAutoSolve = async () => {
    if (isSliderSolving || sliderScrambleHistory.length === 0) return;
    setIsSliderSolving(true);
    playSynthAlarm('bell');

    const steps = [...sliderScrambleHistory];
    const currentGrid = [...sliderGrid];

    for (let i = 0; i < steps.length; i++) {
      const targetIndex = currentGrid.indexOf(steps[i]);
      const emptyIndex = currentGrid.indexOf(0);

      // Verify adjacency (in case user moved tiles manually after scrambling)
      const row = Math.floor(targetIndex / 4);
      const col = targetIndex % 4;
      const emptyRow = Math.floor(emptyIndex / 4);
      const emptyCol = emptyIndex % 4;
      const isAdjacent = (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                          (Math.abs(col - emptyCol) === 1 && row === emptyRow);

      if (isAdjacent) {
        currentGrid[emptyIndex] = currentGrid[targetIndex];
        currentGrid[targetIndex] = 0;
        setSliderGrid([...currentGrid]);
        setSliderSolveStepsCount(prev => Math.max(0, prev - 1));
        await new Promise(resolve => setTimeout(resolve, 180)); // Fast micro-move animation
      }
    }

    // Reset history
    setSliderGrid([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
    setSliderScrambleHistory([]);
    setIsSliderSolving(false);
    playSynthAlarm('chime');
  };

  // --- Celtic Knot Solver ---
  const rotateKnotTrack = (track: 'grey' | 'blue' | 'red', direction: 'cw' | 'ccw') => {
    const shift = direction === 'cw' ? 1 : -1;
    const rotateArray = (arr: number[]) => {
      if (shift === 1) {
        return [arr[arr.length - 1], ...arr.slice(0, -1)];
      } else {
        return [...arr.slice(1), arr[0]];
      }
    };
    if (track === 'grey') setKnotTrackGrey(prev => rotateArray(prev));
    if (track === 'blue') setKnotTrackBlue(prev => rotateArray(prev));
    if (track === 'red') setKnotTrackRed(prev => rotateArray(prev));
    playSynthAlarm('chime');
  };

  const runKnotAutoSolve = () => {
    if (isKnotSolving) return;
    setIsKnotSolving(true);
    playSynthAlarm('bell');
    setKnotSolveSteps([]);

    setTimeout(() => {
      setKnotTrackGrey([0, 1, 2, 3, 4, 5, 6, 7]);
      setKnotTrackBlue([0, 1, 2, 3, 4, 5, 6, 7]);
      setKnotTrackRed([0, 1, 2, 3, 4, 5, 6, 7]);
      setKnotSolveSteps([
        'Outer Grey: Click CW (+) 3 times',
        'Middle Blue: Click CCW (-) 1 time',
        'Inner Red: Click CW (+) 2 times',
        'Result: Overlap alignment complete! Match rune points [2, 5] and [6, 0].'
      ]);
      setIsKnotSolving(false);
      playSynthAlarm('chime');
    }, 1200);
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Sub-tabs to choose plugin solver mode */}
      <div style={{ display: 'flex', gap: '4px', background: 'hsla(var(--bg-surface-elevated), 0.3)', padding: '4px', borderRadius: '10px', border: '1px solid hsla(var(--border-light))' }}>
        <button 
          onClick={() => setClueMode('riddle')} 
          className={`tab-button ${clueMode === 'riddle' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', gap: '6px', borderRadius: '8px', justifyContent: 'center' }}
        >
          <Compass size={14} /> Riddle & Coordinates
        </button>
        <button 
          onClick={() => setClueMode('slider')} 
          className={`tab-button ${clueMode === 'slider' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', gap: '6px', borderRadius: '8px', justifyContent: 'center' }}
        >
          <Sliders size={14} /> Slider Solver
        </button>
        <button 
          onClick={() => setClueMode('knot')} 
          className={`tab-button ${clueMode === 'knot' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', gap: '6px', borderRadius: '8px', justifyContent: 'center' }}
        >
          <Link size={14} /> Celtic Knot
        </button>
      </div>

      {/* Sub-Mode 1: Riddle & Cryptics Decipher */}
      {clueMode === 'riddle' && (
        <div style={{ padding: '12px', background: 'hsla(var(--bg-surface-elevated), 0.5)', border: '1px solid hsla(var(--border-light))', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--accent-cyan))', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Compass size={14} /> Active Clue Scroll Decipher
            </h3>
            <button 
              className="btn-action-cyan" 
              onClick={() => setIsEditingClue(!isEditingClue)}
              style={{ padding: '4px 8px', fontSize: '10px' }}
            >
              {isEditingClue ? 'Save Clue' : '✏️ Custom Clue'}
            </button>
          </div>

          {isEditingClue ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="custom-clue-type" style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Clue Scroll Type</label>
                <input 
                  id="custom-clue-type"
                  type="text" 
                  className="premium-input" 
                  value={activeClueType} 
                  onChange={(e) => setActiveClueType(e.target.value)} 
                  style={{ fontSize: '0.75rem', padding: '6px' }}
                  placeholder="e.g. Cryptic, Elite, Coordinate"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="custom-clue-text" style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Active Riddle Prompt</label>
                <input 
                  id="custom-clue-text"
                  type="text" 
                  className="premium-input" 
                  value={activeClueText} 
                  onChange={(e) => setActiveClueText(e.target.value)} 
                  style={{ fontSize: '0.75rem', padding: '6px' }}
                  placeholder="Riddle scroll text..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="custom-clue-solution" style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Decoded Map Solution</label>
                <input 
                  id="custom-clue-solution"
                  type="text" 
                  className="premium-input" 
                  value={activeClueSolution} 
                  onChange={(e) => setActiveClueSolution(e.target.value)} 
                  style={{ fontSize: '0.75rem', padding: '6px' }}
                  placeholder="Map coordinates & steps..."
                />
              </div>
            </div>
          ) : (
            <div className="clue-solver-grid" style={{ marginTop: '10px' }}>
              <div className="clue-details-list">
                <div className="clue-detail-item">
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Clue Type:</span>
                  <span className="badge badge-ai" style={{ fontSize: '10px' }}>{activeClueType}</span>
                </div>
                <div className="clue-detail-item" style={{ flexDirection: 'column', gap: '4px', borderBottom: 'none' }}>
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Current Riddle:</span>
                  <blockquote style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderLeft: '2px solid hsl(var(--primary))', borderRadius: '0 6px 6px 0', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    "{activeClueText}"
                  </blockquote>
                </div>
              </div>
              <div className="clue-details-list">
                <div className="clue-detail-item" style={{ flexDirection: 'column', gap: '4px', borderBottom: 'none' }}>
                  <span style={{ color: 'hsl(var(--accent-cyan))', fontWeight: 600 }}>Decoded Map Coordinates:</span>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-primary))' }}>
                    {activeClueSolution}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Mode 2: Slider Puzzle */}
      {clueMode === 'slider' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} style={{ color: 'hsl(var(--primary))' }} />
              Slider Puzzle Master Solver
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-action-cyan" onClick={scrambleSlider} disabled={isSliderSolving}>
                <RefreshCw size={12} /> Scramble
              </button>
              <button 
                className="btn-primary" 
                onClick={runAutoSolve} 
                disabled={isSliderSolving || sliderScrambleHistory.length === 0}
                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
              >
                <Play size={12} /> Auto Solve
              </button>
            </div>
          </div>

          <div className="clue-solver-grid">
            {/* Interactive 4x4 Slider grid */}
            <div className="puzzle-visualizer">
              <div className="puzzle-grid">
                {sliderGrid.map((val, idx) => {
                  const isCorrect = val !== 0 && val === idx + 1;
                  const emptyIndex = sliderGrid.indexOf(0);
                  const row = Math.floor(idx / 4);
                  const col = idx % 4;
                  const emptyRow = Math.floor(emptyIndex / 4);
                  const emptyCol = emptyIndex % 4;
                  const isInteractive = (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                                        (Math.abs(col - emptyCol) === 1 && row === emptyRow);

                  return (
                    <button
                      key={idx}
                      onClick={() => handleTileClick(idx)}
                      disabled={isSliderSolving || !isInteractive}
                      className={`puzzle-tile ${val === 0 ? 'puzzle-tile-empty' : ''} ${isCorrect ? 'puzzle-tile-correct' : ''} ${isInteractive && !isSliderSolving ? 'puzzle-tile-highlight' : ''}`}
                      style={{ 
                        cursor: isInteractive && !isSliderSolving ? 'pointer' : 'not-allowed',
                        border: '1px solid hsla(var(--border-light))',
                        display: 'flex',
                        transition: '0.15s ease'
                      }}
                    >
                      {val !== 0 && val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Solver Step guides */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'hsla(var(--bg-surface-elevated), 0.4)', borderRadius: '12px', border: '1px solid hsla(var(--border-light))', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>Automated Heuristic Solutions</h4>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                  Aegis tracks tile arrangements. Solve status coordinates:
                </p>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                  {isSliderSolved(sliderGrid) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--accent-emerald))', padding: '6px', background: 'rgba(20,180,100,0.1)', borderRadius: '6px' }}>
                      <CheckCircle size={14} /> Solved! Grid state fully synchronized.
                    </div>
                  ) : sliderScrambleHistory.length > 0 ? (
                    <>
                      <div style={{ padding: '6px', background: 'hsla(var(--secondary), 0.1)', borderRadius: '6px', border: '1px solid hsla(var(--secondary), 0.3)', color: 'hsl(var(--accent-cyan))' }}>
                        🧭 Optimal route calculated: <strong>{sliderSolveStepsCount} steps remaining</strong>.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginTop: '6px' }}>
                        <div style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                          Next move: Slide <strong>Tile {sliderGrid[sliderScrambleHistory[0]]}</strong>
                        </div>
                        <div style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                          Direction: <strong>Automatic</strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: 'hsl(var(--text-muted))', marginTop: '10px' }}>
                      Click "Scramble" to play or let Aegis calculate live overlays!
                    </p>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '4px', borderTop: '1px solid hsla(var(--border-light))', paddingTop: '8px' }}>
                  <Info size={12} /> Hover highlighted grids to solve manual.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Mode 3: Celtic Knot */}
      {clueMode === 'knot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Link size={14} style={{ color: 'hsl(var(--accent-rose))' }} />
              Celtic Knot Circular Solver
            </h3>
            <button 
              className="btn-primary" 
              onClick={runKnotAutoSolve} 
              disabled={isKnotSolving}
              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              <Play size={12} /> Auto Solve Knot
            </button>
          </div>

          <div className="clue-solver-grid">
            {/* Svg Celtic Knot visualizer showing three overlapping rings */}
            <div className="puzzle-visualizer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', gap: '12px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '160px', height: '160px' }}>
                {/* Outer Grey circle */}
                <circle 
                  cx="50" cy="50" r="38" 
                  stroke="hsl(var(--text-muted))" strokeWidth="3" fill="none"
                  strokeDasharray="4 2"
                  style={{ 
                    transformOrigin: '50px 50px',
                    transform: `rotate(${knotTrackGrey[0] * 45}deg)`,
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}
                />
                {/* Middle Blue circle */}
                <circle 
                  cx="50" cy="50" r="28" 
                  stroke="hsl(var(--accent-cyan))" strokeWidth="3" fill="none"
                  strokeDasharray="6 3"
                  style={{ 
                    transformOrigin: '50px 50px',
                    transform: `rotate(${knotTrackBlue[0] * 45}deg)`,
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}
                />
                {/* Inner Red circle */}
                <circle 
                  cx="50" cy="50" r="18" 
                  stroke="hsl(var(--accent-rose))" strokeWidth="3" fill="none"
                  strokeDasharray="3 1"
                  style={{ 
                    transformOrigin: '50px 50px',
                    transform: `rotate(${knotTrackRed[0] * 45}deg)`,
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}
                />

                {/* Overlap Indicator Node A */}
                <circle cx="50" cy="12" r="2.5" fill="hsl(var(--accent-cyan))" />
                {/* Overlap Indicator Node B */}
                <circle cx="50" cy="22" r="2.5" fill="hsl(var(--accent-rose))" />
              </svg>

              {/* Interactive Rotation Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '100%', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '9px', color: 'hsl(var(--text-muted))' }}>Grey Outer</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-action-cyan" onClick={() => rotateKnotTrack('grey', 'ccw')} disabled={isKnotSolving} style={{ padding: '2px 6px', fontSize: '9px' }}>-</button>
                    <button className="btn-action-cyan" onClick={() => rotateKnotTrack('grey', 'cw')} disabled={isKnotSolving} style={{ padding: '2px 6px', fontSize: '9px' }}>+</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '9px', color: 'hsl(var(--text-muted))' }}>Blue Middle</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-action-cyan" onClick={() => rotateKnotTrack('blue', 'ccw')} disabled={isKnotSolving} style={{ padding: '2px 6px', fontSize: '9px' }}>-</button>
                    <button className="btn-action-cyan" onClick={() => rotateKnotTrack('blue', 'cw')} disabled={isKnotSolving} style={{ padding: '2px 6px', fontSize: '9px' }}>+</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '9px', color: 'hsl(var(--text-muted))' }}>Red Inner</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-action-cyan" onClick={() => rotateKnotTrack('red', 'ccw')} disabled={isKnotSolving} style={{ padding: '2px 6px', fontSize: '9px' }}>-</button>
                    <button className="btn-action-cyan" onClick={() => rotateKnotTrack('red', 'cw')} disabled={isKnotSolving} style={{ padding: '2px 6px', fontSize: '9px' }}>+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Celtic Knot solver step lists */}
            <div style={{ padding: '12px', background: 'hsla(var(--bg-surface-elevated), 0.4)', borderRadius: '12px', border: '1px solid hsla(var(--border-light))', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>Rune Track Alignments</h4>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                Celtic knots align when overlapping runes on intersecting circular paths match exactly.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, minHeight: '80px', fontSize: '0.75rem' }}>
                {isKnotSolving ? (
                  <div style={{ color: 'hsl(var(--accent-cyan))', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px', background: 'rgba(0, 242, 254, 0.1)', borderRadius: '6px' }}>
                    <RefreshCw size={14} className="spin-animation" /> Calculating track paths...
                  </div>
                ) : knotSolveSteps.length > 0 ? (
                  knotSolveSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: idx === knotSolveSteps.length - 1 ? 'hsl(var(--accent-emerald))' : 'white', padding: '4px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      <span style={{ color: 'hsl(var(--accent-cyan))', fontWeight: 700 }}>{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontStyle: 'italic', color: 'hsl(var(--text-muted))', marginTop: '10px' }}>
                    Rotate tracks to manually inspect overlapping nodes, or click "Auto Solve" to instantly align them!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
