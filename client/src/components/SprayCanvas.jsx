import { useEffect, useRef } from 'react';

export const SPRAY_ASPECT = 2.2;

const STEP_PX = 2.2;
const PARTICLES_PER_STEP = 7;
const JITTER_RADIUS = 4;
const HALO_PARTICLES_PER_STEP = 5;
const HALO_SPREAD = 10;
const DOT_MIN = 0.6;
const DOT_MAX = 2.6;
const DRIP_CHANCE = 0.35;
const MID_STROKE_DRIP_INTERVAL = 42;
const MID_STROKE_DRIP_CHANCE = 0.3;
const ERASER_RADIUS = 16;

export default function SprayCanvas({ color, tool = 'spray', onReady, onStrokeChange }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const strokesRef = useRef([]);
  const dripAccumRef = useRef(0);
  const currentStrokeRef = useRef([]);
  const colorRef = useRef(color);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      canvas.width = cssWidth * ratio;
      canvas.height = cssHeight * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctxRef.current = ctx;
    };
    resize();
    window.addEventListener('resize', resize);

    onReady?.({
      clear: () => {
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokesRef.current = [];
        onStrokeChange?.(false);
      },
      isEmpty: () => strokesRef.current.length === 0,
      exportSignature: () => ({
        dataUrl: canvas.toDataURL('image/png'),
        strokes: strokesRef.current,
        color: colorRef.current,
      }),
    });

    return () => window.removeEventListener('resize', resize);
  }, []);

  const sprayBurst = (x, y) => {
    const ctx = ctxRef.current;

    for (let i = 0; i < PARTICLES_PER_STEP; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 1.6) * JITTER_RADIUS;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const rad = DOT_MIN + Math.random() * (DOT_MAX - DOT_MIN);
      const alpha = 0.3 + Math.random() * 0.5;

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < HALO_PARTICLES_PER_STEP; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = JITTER_RADIUS + Math.random() * HALO_SPREAD;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const rad = 0.4 + Math.random();
      const alpha = 0.04 + Math.random() * 0.1;

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };

  const sprayLine = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const steps = Math.max(1, Math.round(dist / STEP_PX));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      sprayBurst(from.x + dx * t, from.y + dy * t);
    }
  };

  const addDrip = (x, y) => {
    const ctx = ctxRef.current;
    const length = 14 + Math.random() * 26;
    const width = 1.5 + Math.random() * 2;
    const grad = ctx.createLinearGradient(x, y, x, y + length);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width / 3, y + length);
    ctx.lineTo(x - width / 3, y + length);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const eraseBurst = (x, y) => {
    const ctx = ctxRef.current;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, ERASER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const eraseLine = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const steps = Math.max(1, Math.round(dist / (ERASER_RADIUS * 0.5)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      eraseBurst(from.x + dx * t, from.y + dy * t);
    }
  };

  const getLocalPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    dripAccumRef.current = 0;
    const p = getLocalPoint(e);
    lastPointRef.current = p;
    if (tool === 'eraser') {
      eraseBurst(p.x, p.y);
      return;
    }
    currentStrokeRef.current = [normalize(p)];
    sprayBurst(p.x, p.y);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const p = getLocalPoint(e);
    const from = lastPointRef.current;

    if (tool === 'eraser') {
      eraseLine(from, p);
      lastPointRef.current = p;
      return;
    }

    sprayLine(from, p);
    currentStrokeRef.current.push(normalize(p));

    const dx = p.x - from.x;
    const dy = p.y - from.y;
    dripAccumRef.current += Math.sqrt(dx * dx + dy * dy);
    if (dripAccumRef.current >= MID_STROKE_DRIP_INTERVAL) {
      dripAccumRef.current = 0;
      if (Math.random() < MID_STROKE_DRIP_CHANCE) {
        addDrip(p.x, p.y);
      }
    }

    lastPointRef.current = p;
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (tool !== 'eraser' && currentStrokeRef.current.length > 1) {
      strokesRef.current.push(currentStrokeRef.current);
      if (Math.random() < DRIP_CHANCE && lastPointRef.current) {
        addDrip(lastPointRef.current.x, lastPointRef.current.y);
      }
    }
    currentStrokeRef.current = [];
    onStrokeChange?.(strokesRef.current.length > 0);
  };

  const normalize = (p) => {
    const canvas = canvasRef.current;
    return { x: p.x / canvas.offsetWidth, y: p.y / canvas.offsetHeight };
  };

  return (
    <canvas
      ref={canvasRef}
      className={`spray-canvas ${tool === 'eraser' ? 'spray-canvas-eraser' : ''}`}
      style={{ aspectRatio: SPRAY_ASPECT }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
