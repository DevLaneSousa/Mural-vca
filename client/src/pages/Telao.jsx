import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { socket } from '../socket';
import { SPRAY_ASPECT } from '../components/SprayCanvas';

const HIGHLIGHT_MS = 2000;
const VIEW_W = 440;
const VIEW_H = VIEW_W / SPRAY_ASPECT;
const DRAW_PX_PER_SEC = 1200; // velocidade do "desenho" vetorial do traço

export default function Telao() {
  const [placed, setPlaced] = useState([]); // já fixadas no mural
  const [active, setActive] = useState(null); // em animação no centro agora
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const wallRef = useRef(null);
  const videoRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    socket.on('signatures:sync', (all) => setPlaced(all));
    socket.on('signature:new', (sig) => {
      queueRef.current.push(sig);
      processQueue();
    });
    socket.on('signature:removed', ({ id }) => removePlaced(id));

    return () => {
      socket.off('signatures:sync');
      socket.off('signature:new');
      socket.off('signature:removed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removePlaced(id) {
    const el = document.getElementById(`sig-${id}`);
    if (el) {
      gsap.to(el, {
        opacity: 0,
        scale: 0.6,
        duration: 0.6,
        onComplete: () => setPlaced((prev) => prev.filter((s) => s.id !== id)),
      });
    } else {
      setPlaced((prev) => prev.filter((s) => s.id !== id));
    }
  }

  function processQueue() {
    if (processingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    processingRef.current = true;
    setActive(next);
  }

  function spawnDripFlourish(container, color) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const drip = document.createElement('div');
      drip.className = 'drip-flourish';
      drip.style.left = `${20 + Math.random() * 60}%`;
      drip.style.background = `linear-gradient(${color}, transparent)`;
      container.appendChild(drip);
      gsap.fromTo(
        drip,
        { scaleY: 0, opacity: 0.9 },
        {
          scaleY: 1,
          duration: 0.5 + Math.random() * 0.4,
          ease: 'power2.in',
          onComplete: () => {
            gsap.to(drip, { opacity: 0, duration: 0.6, delay: 0.3, onComplete: () => drip.remove() });
          },
        }
      );
    }
  }

  // Dispara a timeline sempre que uma nova assinatura entra em "active"
  useEffect(() => {
    if (!active) return;

    const imgEl = document.getElementById('active-signature');
    const dripContainer = document.getElementById('drip-container');
    const video = videoRef.current;
    if (!imgEl) return;

    const strokePaths = svgRef.current ? Array.from(svgRef.current.querySelectorAll('.stroke-path')) : [];
    const hasVectorReveal = strokePaths.length > 0;

    const tl = gsap.timeline({
      onComplete: () => {
        setPlaced((prev) => [...prev, active]);
        setActive(null);
        processingRef.current = false;
        setTimeout(processQueue, 150);
      },
    });

    gsap.set(imgEl, { opacity: 0, x: 0, y: 0, scale: 1.3 });
    if (svgRef.current) gsap.set(svgRef.current, { opacity: 1 });

    // --- 1) mascote entra e "joga tinta" (ou fallback em CSS) ---
    const hasVideo = video && video.readyState >= 2 && !video.error;
    if (hasVideo) {
      video.currentTime = 0;
      video.style.opacity = 1;
      video.play().catch(() => {});
      const SPLASH_AT = Math.min(1.0, (video.duration || 2) * 0.55);
      tl.to({}, { duration: SPLASH_AT });
      tl.to(video, { opacity: 0, duration: 0.4 });
    } else {
      tl.fromTo(
        '.paint-splash',
        { scale: 0, opacity: 0.9 },
        { scale: 1, opacity: 0, duration: 0.45, ease: 'power2.out' }
      );
    }

    // --- 2) o traço é "desenhado" progressivamente, como um grafite sendo feito ---
    if (hasVectorReveal) {
      strokePaths.forEach((path, i) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        const duration = Math.max(0.15, length / DRAW_PX_PER_SEC);
        tl.to(path, { strokeDashoffset: 0, duration, ease: 'none' }, i === 0 ? '+=0.05' : '-=0.08');
      });
    } else {
      // sem dados vetoriais (assinatura antiga): recorre ao reveal em círculo
      tl.fromTo(imgEl, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(140% at 50% 50%)', duration: 0.5 });
    }

    // --- 3) respingo de tinta escorrendo, na sequência ---
    tl.call(() => dripContainer && spawnDripFlourish(dripContainer, active.color || '#f4189b'));
    tl.to({}, { duration: 0.35 });

    // --- 4) crossfade do traço vetorial para a textura de spray final ---
    if (hasVectorReveal && svgRef.current) {
      tl.to(svgRef.current, { opacity: 0, duration: 0.35 }, '-=0.1');
    }
    tl.to(imgEl, { opacity: 1, duration: 0.35 }, '<');

    // --- 5) destaque parado no centro ---
    tl.to({}, { duration: HIGHLIGHT_MS / 1000 });

    // --- 6) voo até a posição escolhida no mural ---
    if (wallRef.current) {
      const wallRect = wallRef.current.getBoundingClientRect();
      const targetX = wallRect.left + active.x * wallRect.width;
      const targetY = wallRect.top + active.y * wallRect.height;
      const centerRect = imgEl.getBoundingClientRect();
      tl.to(imgEl, {
        x: targetX - (centerRect.left + centerRect.width / 2),
        y: targetY - (centerRect.top + centerRect.height / 2),
        scale: 0.32,
        duration: 1,
        ease: 'power3.inOut',
      });
    }

    tl.to(imgEl, { opacity: 0, duration: 0.15 });

    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="telao-page">
      <div className="wall brick-wall" ref={wallRef}>
        {placed.map((sig) => (
          <img
            key={sig.id}
            id={`sig-${sig.id}`}
            src={sig.dataUrl}
            className="placed-signature"
            style={{ left: `${sig.x * 100}%`, top: `${sig.y * 100}%` }}
            alt="assinatura"
          />
        ))}
      </div>

      {active && (
        <div className="active-overlay">
          <div className="paint-splash" />

          <svg
            ref={svgRef}
            className="active-svg"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            style={{ opacity: active.strokes?.length ? 1 : 0 }}
          >
            {(active.strokes || []).map((stroke, i) => (
              <path
                key={i}
                className="stroke-path"
                fill="none"
                stroke={active.color || '#f4189b'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d={strokeToPath(stroke)}
              />
            ))}
          </svg>

          <div id="drip-container" className="drip-container" />

          <img id="active-signature" src={active.dataUrl} className="active-signature" alt="assinatura em destaque" />
        </div>
      )}

      {/* Troque o src pelo vídeo real do mascote (webm com canal alpha) */}
      <video ref={videoRef} className="mascot-video" muted playsInline preload="auto">
        <source src="/mascot.webm" type="video/webm" />
      </video>
    </div>
  );
}

function strokeToPath(points) {
  if (!points || points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x * VIEW_W).toFixed(1)},${(p.y * VIEW_H).toFixed(1)}`)
    .join(' ');
}
