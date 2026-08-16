import { useEffect, useRef } from 'react';

// Proporção fixa do canvas (largura:altura). Mantemos isso constante em
// qualquer tela para que os pontos normalizados (0-1) cheguem intactos no
// telão, sem distorcer o traço.
export const SPRAY_ASPECT = 2.2; // largura / altura

// Ajuste estes valores para calibrar o "realismo" do spray:
const STEP_PX = 2.2; // distância entre amostras ao longo do traço (menor = mais denso/contínuo)
const PARTICLES_PER_STEP = 5; // partículas geradas a cada amostra
const JITTER_RADIUS = 3.2; // dispersão das partículas ao redor do traço (px) — pequeno = mais "linear"
const DOT_MIN = 0.6;
const DOT_MAX = 2.2;
const DRIP_CHANCE = 15; // chance de pingar tinta ao soltar o traço

export default function SprayCanvas({ color, onReady, onStrokeChange }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const strokesRef = useRef([]); // pontos normalizados (0-1) por traço, para reconstrução vetorial no telão
  const currentStrokeRef = useRef([]);

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

    // Expõe controles para o componente pai (limpar / exportar)
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
        color,
      }),
    });

    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sprayBurst = (x, y) => {
    const ctx = ctxRef.current;
    for (let i = 0; i < PARTICLES_PER_STEP; i++) {
      const angle = Math.random() * Math.PI * 2;
      // distribuição concentrada perto do centro (spray real tem núcleo denso + halo leve)
      const r = Math.pow(Math.random(), 1.6) * JITTER_RADIUS;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const rad = DOT_MIN + Math.random() * (DOT_MAX - DOT_MIN);
      const alpha = 0.25 + Math.random() * 0.5;

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // Distribui as amostras ao longo do segmento com espaçamento ~constante
  // (STEP_PX), independentemente da velocidade do movimento — é isso que
  // evita tanto lacunas (traço rápido) quanto acúmulo de tinta (traço lento).
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

  const getLocalPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = getLocalPoint(e);
    lastPointRef.current = p;
    currentStrokeRef.current = [normalize(p)];
    sprayBurst(p.x, p.y);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const p = getLocalPoint(e);
    sprayLine(lastPointRef.current, p);
    currentStrokeRef.current.push(normalize(p));
    lastPointRef.current = p;
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentStrokeRef.current.length > 1) {
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
      className="spray-canvas"
      style={{ aspectRatio: SPRAY_ASPECT }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
