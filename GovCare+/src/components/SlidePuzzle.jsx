import { useState, useEffect, useRef, useCallback } from 'react';

const W = 300;       // total width
const BGH = 148;     // background image height
const PBW = 46;      // piece body width
const PTW = 13;      // tab protrusion width
const PH = 46;       // piece height
const PY = Math.round((BGH - PH) / 2);
const MAX_X = W - PBW - PTW - 2;

function makePiecePath(bw, tw, h) {
  const t1 = Math.round(h * 0.3), t2 = Math.round(h * 0.7);
  return `M0,0 L${bw},0 L${bw},${t1} Q${bw + tw},${h / 2} ${bw},${t2} L${bw},${h} L0,${h} Z`;
}

function makeHolePath(tx, ty, bw, tw, h) {
  const t1 = Math.round(h * 0.3), t2 = Math.round(h * 0.7);
  return `M${tx},${ty} L${tx + bw},${ty} L${tx + bw},${ty + t1} Q${tx + bw + tw},${ty + h / 2} ${tx + bw},${ty + t2} L${tx + bw},${ty + h} L${tx},${ty + h} Z`;
}

const BLOBS = [[30,18,70],[130,65,55],[240,25,65],[20,88,44],[205,88,38],[160,10,30]];

export default function SlidePuzzle({ onVerified }) {
  const [target] = useState(() =>
    Math.round(Math.random() * (MAX_X - PBW - 40)) + PBW + 40
  );
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const [origin, setOrigin] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | success | fail
  const xRef = useRef(0);

  const doMove = useCallback(cx => {
    if (!drag) return;
    const nx = Math.max(0, Math.min(cx - origin, MAX_X));
    xRef.current = nx;
    setX(nx);
  }, [drag, origin]);

  const doEnd = useCallback(() => {
    if (!drag) return;
    setDrag(false);
    const cur = xRef.current;
    if (Math.abs(cur - target) <= 15) {
      xRef.current = target;
      setX(target);
      setStatus('success');
      setTimeout(onVerified, 650);
    } else {
      setStatus('fail');
      xRef.current = 0;
      setX(0);
      setTimeout(() => setStatus('idle'), 750);
    }
  }, [drag, target, onVerified]);

  useEffect(() => {
    if (!drag) return;
    const mm = e => doMove(e.clientX);
    const tm = e => { e.preventDefault(); doMove(e.touches[0].clientX); };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', doEnd);
    window.addEventListener('touchmove', tm, { passive: false });
    window.addEventListener('touchend', doEnd);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', doEnd);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', doEnd);
    };
  }, [drag, doMove, doEnd]);

  function startDrag(cx, e) {
    e?.preventDefault();
    setDrag(true);
    setOrigin(cx - xRef.current);
  }

  const pct = Math.min(x / MAX_X, 1);
  const handleLeft = pct * (W - 44);
  const isOk = status === 'success';
  const isBad = status === 'fail';

  const pieceColor = isOk ? '#4caf50' : isBad ? '#ef5350' : 'rgba(255,255,255,0.94)';
  const handleBg = isOk ? '#4caf50' : isBad ? '#ef5350' : '#1a73e8';
  const piecePath = makePiecePath(PBW, PTW, PH);
  const holePath = makeHolePath(target, PY, PBW, PTW, PH);
  const noTrans = drag;

  return (
    <div style={{ width: W, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 14px rgba(0,0,0,0.18)', border: '1px solid #ccc', userSelect: 'none' }}>

      {/* Puzzle image area */}
      <div style={{ position: 'relative', width: W, height: BGH, background: 'linear-gradient(135deg,#1a2a6c 0%,#1e5fa8 50%,#1a73e8 100%)', overflow: 'hidden' }}>
        {BLOBS.map(([lx, ly, sz], i) => (
          <div key={i} style={{ position: 'absolute', left: lx, top: ly, width: sz, height: sz, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        ))}

        {/* Hole SVG overlay */}
        <svg style={{ position: 'absolute', inset: 0, width: W, height: BGH, overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <filter id="hole-inner">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>
          <path d={holePath} fill="rgba(0,0,0,0.42)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeDasharray="5 3" />
        </svg>

        {/* Sliding puzzle piece */}
        <svg
          onMouseDown={e => startDrag(e.clientX, e)}
          onTouchStart={e => startDrag(e.touches[0].clientX, e)}
          style={{
            position: 'absolute', left: x, top: PY,
            overflow: 'visible',
            cursor: drag ? 'grabbing' : 'grab',
            transition: noTrans ? 'none' : 'left 0.45s ease',
            touchAction: 'none',
          }}
          width={PBW} height={PH}
        >
          <defs>
            <filter id="piece-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.45" />
            </filter>
          </defs>
          <path d={piecePath} fill={pieceColor} filter="url(#piece-shadow)" stroke={isOk ? '#4caf50' : isBad ? '#ef5350' : 'rgba(255,255,255,0.85)'} strokeWidth="1" />
          {isOk && (
            <polyline
              points={`${PBW*0.28},${PH*0.52} ${PBW*0.45},${PH*0.68} ${PBW*0.72},${PH*0.34}`}
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            />
          )}
          {isBad && (
            <>
              <line x1={PBW*0.3} y1={PH*0.3} x2={PBW*0.7} y2={PH*0.7} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1={PBW*0.7} y1={PH*0.3} x2={PBW*0.3} y2={PH*0.7} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
          {!isOk && !isBad && (
            <image href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a73e8' stroke-width='1.5'%3E%3Cpath d='M4 8h2V4h12v4h2v12h-2v4H6v-4H4V8z' stroke-linejoin='round'/%3E%3Cpath d='M10 4v3a2 2 0 000 4v3M14 20v-3a2 2 0 000-4v-3' stroke-linejoin='round'/%3E%3C/svg%3E"
              x={PBW*0.16} y={PH*0.16} width={PBW*0.68} height={PH*0.68}
            />
          )}
        </svg>

        {/* Status text */}
        {(isOk || isBad) && (
          <div style={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            textAlign: 'center', fontSize: 12, fontWeight: 600,
            color: isOk ? '#a5d6a7' : '#ef9a9a',
            letterSpacing: '0.5px',
          }}>
            {isOk ? 'Verified — you may proceed' : 'Incorrect position, try again'}
          </div>
        )}
      </div>

      {/* Slider bar */}
      <div style={{ position: 'relative', height: 44, background: '#f2f2f2', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Progress fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct * 100}%`,
          background: isOk ? 'rgba(76,175,80,0.22)' : 'rgba(26,115,232,0.14)',
          transition: noTrans ? 'none' : 'width 0.45s ease',
        }} />

        {/* Label */}
        <span style={{
          position: 'absolute', left: 52, right: 0, textAlign: 'center',
          fontSize: 13, color: '#bbb', pointerEvents: 'none',
          opacity: pct > 0.1 ? 0 : 1, transition: 'opacity 0.2s',
        }}>
          Slide the piece to the gap →
        </span>

        {/* Handle */}
        <div
          onMouseDown={e => startDrag(e.clientX, e)}
          onTouchStart={e => startDrag(e.touches[0].clientX, e)}
          style={{
            position: 'absolute',
            left: handleLeft,
            width: 44, height: 44,
            background: handleBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: drag ? 'grabbing' : 'grab',
            transition: noTrans ? 'none' : 'left 0.45s ease, background 0.25s',
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          {isOk
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : isBad
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/><polyline points="15 18 21 12 15 6"/></svg>
          }
        </div>
      </div>
    </div>
  );
}
