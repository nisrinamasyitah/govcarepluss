import { useState, useEffect, useRef, useCallback } from 'react';
import imgValley  from '../assets/puzzle-valley.jpg';
import imgAlpine  from '../assets/puzzle-alpine.jpg';
import imgCoast   from '../assets/puzzle-coast.jpg';
import imgCanyon  from '../assets/puzzle-canyon.jpg';
import imgMeadow  from '../assets/puzzle-meadow.jpg';

const IMAGES = [imgValley, imgAlpine, imgCoast, imgCanyon, imgMeadow];

const W   = 300;   // container width
const BGH = 150;   // background height  (matches 600×300 images at 300×150)
const PBW = 46;    // piece body width
const PTW = 13;    // tab protrusion on right side
const PH  = 46;    // piece height
const PY  = Math.round((BGH - PH) / 2);   // 52 — vertically centred
const MAX_X = W - PBW - PTW - 2;          // 239 — max drag distance

function makePiecePath(bw, tw, h) {
  const t1 = Math.round(h * 0.3);
  const t2 = Math.round(h * 0.7);
  return `M0,0 L${bw},0 L${bw},${t1} Q${bw + tw},${h / 2} ${bw},${t2} L${bw},${h} L0,${h} Z`;
}

function makeHolePath(tx, ty, bw, tw, h) {
  const t1 = Math.round(h * 0.3);
  const t2 = Math.round(h * 0.7);
  return `M${tx},${ty} L${tx+bw},${ty} L${tx+bw},${ty+t1} Q${tx+bw+tw},${ty+h/2} ${tx+bw},${ty+t2} L${tx+bw},${ty+h} L${tx},${ty+h} Z`;
}

export default function SlidePuzzle({ onVerified }) {
  // Pick a random image AND a random hole position — both change every render
  const [img]    = useState(() => IMAGES[Math.floor(Math.random() * IMAGES.length)]);
  const [target] = useState(() => Math.round(Math.random() * 110) + 100); // 100–210

  const [x,      setX]      = useState(0);
  const [drag,   setDrag]   = useState(false);
  const [origin, setOrigin] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | success | fail
  const xRef = useRef(0);
  const uid  = useRef(`sp${Math.random().toString(36).slice(2, 7)}`).current;

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
      setTimeout(onVerified, 700);
    } else {
      setStatus('fail');
      xRef.current = 0;
      setX(0);
      setTimeout(() => setStatus('idle'), 800);
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

  const pct        = Math.min(x / MAX_X, 1);
  const handleLeft = pct * (W - 44);
  const isOk  = status === 'success';
  const isBad = status === 'fail';
  const noTrans = drag;

  const piece   = makePiecePath(PBW, PTW, PH);
  const hole    = makeHolePath(target, PY, PBW, PTW, PH);
  const clipId  = `clip-${uid}`;
  const shadId  = `shad-${uid}`;

  return (
    <div style={{ width: W, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 14px rgba(0,0,0,0.2)', border: '1px solid #ccc', userSelect: 'none' }}>

      {/* ── Puzzle image area ── */}
      <div style={{ position: 'relative', width: W, height: BGH, overflow: 'hidden' }}>

        {/* Background photo — changes every time the puzzle mounts */}
        <img
          src={img}
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: W, height: BGH, objectFit: 'fill', display: 'block' }}
        />

        {/* Hole overlay — dark cutout with dashed border in jigsaw shape */}
        <svg style={{ position: 'absolute', inset: 0, width: W, height: BGH, overflow: 'visible', pointerEvents: 'none' }}>
          <path d={hole} fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="5 3" />
        </svg>

        {/* Sliding puzzle piece — shows the matching image fragment, clipped to jigsaw shape */}
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
          width={PBW + PTW} height={PH}
        >
          <defs>
            <clipPath id={clipId}><path d={piece} /></clipPath>
            <filter id={shadId} x="-25%" y="-25%" width="150%" height="175%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
            </filter>
          </defs>

          {/* Image cut from the TARGET position of the current photo */}
          <g filter={`url(#${shadId})`}>
            <image
              href={img}
              x={-target} y={-PY}
              width={W} height={BGH}
              preserveAspectRatio="none"
              clipPath={`url(#${clipId})`}
            />
          </g>

          {/* Success / fail colour overlay */}
          {isOk  && <path d={piece} fill="rgba(76,175,80,0.5)"  clipPath={`url(#${clipId})`} />}
          {isBad && <path d={piece} fill="rgba(239,83,80,0.5)"  clipPath={`url(#${clipId})`} />}

          {/* Jigsaw border */}
          <path d={piece} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />

          {/* Status icons */}
          {isOk && (
            <polyline
              points={`${PBW*0.25},${PH*0.52} ${PBW*0.43},${PH*0.68} ${PBW*0.72},${PH*0.33}`}
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            />
          )}
          {isBad && (
            <>
              <line x1={PBW*0.3} y1={PH*0.3} x2={PBW*0.7} y2={PH*0.7} stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1={PBW*0.7} y1={PH*0.3} x2={PBW*0.3} y2={PH*0.7} stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </>
          )}
        </svg>

        {/* Status text at bottom */}
        {(isOk || isBad) && (
          <div style={{ position:'absolute', bottom:6, left:0, right:0, textAlign:'center', fontSize:12, fontWeight:600, color: isOk ? '#c8f0c8' : '#f9c0c0', textShadow:'0 1px 3px rgba(0,0,0,0.6)' }}>
            {isOk ? 'Verified — you may proceed' : 'Try again'}
          </div>
        )}
      </div>

      {/* ── Slider bar ── */}
      <div style={{ position:'relative', height:44, background:'#f2f2f2', borderTop:'1px solid #ddd', display:'flex', alignItems:'center', overflow:'hidden' }}>

        {/* Progress fill */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct*100}%`, background: isOk ? 'rgba(76,175,80,0.25)' : 'rgba(26,115,232,0.15)', transition: noTrans ? 'none' : 'width 0.45s ease' }} />

        {/* Label */}
        <span style={{ position:'absolute', left:52, right:0, textAlign:'center', fontSize:13, color:'#bbb', pointerEvents:'none', opacity: pct > 0.1 ? 0 : 1, transition:'opacity 0.2s' }}>
          Slide to fit the piece →
        </span>

        {/* Drag handle */}
        <div
          onMouseDown={e => startDrag(e.clientX, e)}
          onTouchStart={e => startDrag(e.touches[0].clientX, e)}
          style={{ position:'absolute', left:handleLeft, width:44, height:44, background: isOk ? '#4caf50' : isBad ? '#ef5350' : '#1a73e8', display:'flex', alignItems:'center', justifyContent:'center', cursor: drag ? 'grabbing' : 'grab', transition: noTrans ? 'none' : 'left 0.45s ease, background 0.25s', touchAction:'none', flexShrink:0 }}
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
