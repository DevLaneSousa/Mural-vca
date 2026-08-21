import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { socket } from '../socket';

const HIGHLIGHT_MS = 900;
const WIPE_DURATION = 0.9;
const SMOKE_LEAD = 0.4; 

export default function Telao() {
  const [placed, setPlaced] = useState([]);
  const [active, setActive] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const wallRef = useRef(null);
  const videoRef = useRef(null);
  const knownPlacedIdsRef = useRef(new Set());

  function requestDelete(sig) {
    if (!adminMode) return;
    setDeleteTarget(sig);
  }

  function confirmDelete() {
    if (deleteTarget) socket.emit('signature:delete', { id: deleteTarget.id });
    setDeleteTarget(null);
  }

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

  useLayoutEffect(() => {
    const known = knownPlacedIdsRef.current;
    placed.forEach((sig) => {
      if (known.has(sig.id)) return;
      known.add(sig.id);
      const el = document.getElementById(`sig-${sig.id}`);
      if (el) {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.3 },
          { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.4)' }
        );
      }
    });
  }, [placed]);

  function spawnSmoke(container, color, xPercent = 50, lifetime = 1.2) {
    const count = 5 + Math.floor(Math.random() * 4);

    const naturalGrow = 0.5 + Math.random() * 0.3;
    const naturalFade = 0.7;
    const naturalTotal = naturalGrow + naturalFade;
    const scale = Math.min(1, Math.max(lifetime, 0.2) / naturalTotal);
    const growDuration = naturalGrow * scale;
    const fadeDuration = naturalFade * scale;
    for (let i = 0; i < count; i++) {
      const puff = document.createElement('div');
      puff.className = 'paint-smoke';
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 30;
      const size = 60 + Math.random() * 70;
      puff.style.left = `calc(${xPercent}% + ${(Math.cos(angle) * dist).toFixed(1)}px)`;
      puff.style.top = `calc(50% + ${(Math.sin(angle) * dist).toFixed(1)}px)`;
      puff.style.width = `${size}px`;
      puff.style.height = `${size}px`;

      puff.style.background = `radial-gradient(circle, ${color}f2 0%, ${color}b3 30%, ${color}59 58%, ${color}00 85%)`;
      container.appendChild(puff);
      gsap.fromTo(
        puff,
        { scale: 0.3, opacity: 0 },
        {
          scale: 1.6,
          opacity: 0.7,
          y: -20 - Math.random() * 30,
          duration: growDuration,
          ease: 'power1.out',
          onComplete: () => {
            gsap.to(puff, {
              opacity: 0,
              y: '-=30',
              scale: '+=0.3',
              duration: fadeDuration,
              ease: 'power1.out',
              onComplete: () => puff.remove(),
            });
          },
        }
      );
    }
  }

  function spawnSplatter(container, color) {
    const count = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'paint-splatter';
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 150;
      const size = 3 + Math.random() * 6;
      dot.style.left = `calc(50% + ${(Math.cos(angle) * dist).toFixed(1)}px)`;
      dot.style.top = `calc(50% + ${(Math.sin(angle) * dist).toFixed(1)}px)`;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = color;
      container.appendChild(dot);
      gsap.fromTo(
        dot,
        { scale: 0, opacity: 0.95 },
        {
          scale: 1,
          duration: 0.2 + Math.random() * 0.25,
          ease: 'back.out(2.5)',
          onComplete: () => {
            gsap.to(dot, {
              opacity: 0,
              duration: 0.5,
              delay: 0.3 + Math.random() * 0.3,
              onComplete: () => dot.remove(),
            });
          },
        }
      );
    }
  }

  useEffect(() => {
    if (!active) return;

    const imgEl = document.getElementById('active-signature');
    const dripContainer = document.getElementById('drip-container');
    const smokeSweepEl = document.getElementById('smoke-sweep');
    const video = videoRef.current;
    if (!imgEl) return;

    const tl = gsap.timeline({
      onComplete: () => {
        setPlaced((prev) => [...prev, active]);
        setActive(null);
        processingRef.current = false;
        setTimeout(processQueue, 150);
      },
    });

    const color = active.color || '#f4189b';
    gsap.set(imgEl, { opacity: 0, x: 0, y: 0, scale: 1.3, clipPath: 'inset(0 100% 0 0)' });
    if (smokeSweepEl) {
      smokeSweepEl.style.color = color;
      gsap.set(smokeSweepEl, { opacity: 0, backgroundPosition: '150% 0' });
    }

    const hasVideo = video && video.readyState >= 2 && !video.error;
    const REVEAL_START_DELAY = 3.5;

    if (hasVideo) {
      video.pause();
      video.currentTime = 0;
      video.style.opacity = 1;
      video.play().catch(() => {});

      const fadeOutVideo = () => {
        video.removeEventListener('ended', fadeOutVideo);
        gsap.to(video, { opacity: 0, duration: 0.4 });
      };
      video.addEventListener('ended', fadeOutVideo);
    } else {
      tl.fromTo(
        '.paint-splash',
        { scale: 0, opacity: 0.9 },
        { scale: 1, opacity: 0, duration: 0.45, ease: 'power2.out' },
        0
      );
    }

    tl.call(() => dripContainer && spawnSplatter(dripContainer, color), null, REVEAL_START_DELAY);

    const wipeEnd = REVEAL_START_DELAY + WIPE_DURATION;
    const smokeStart = REVEAL_START_DELAY - SMOKE_LEAD;

    const puffCount = 13;
    for (let i = 0; i < puffCount; i++) {
      const progress = (i + 0.5) / puffCount;
      const t = smokeStart + progress * (wipeEnd - smokeStart);
      const xPercent = Math.max(0, Math.min(100, ((t - REVEAL_START_DELAY) / WIPE_DURATION) * 100));
      const lifetime = wipeEnd - t;
      tl.call(() => dripContainer && spawnSmoke(dripContainer, color, xPercent, lifetime), null, t);
    }

    tl.set(imgEl, { opacity: 1 }, REVEAL_START_DELAY);
    tl.to(
      imgEl,
      { clipPath: 'inset(0 0% 0 0)', duration: WIPE_DURATION, ease: 'power3.out' },
      REVEAL_START_DELAY
    );
    if (smokeSweepEl) {
      tl.to(smokeSweepEl, { opacity: 0.9, duration: 0.15 }, smokeStart);
      tl.to(
        smokeSweepEl,
        { backgroundPosition: '-60% 0', duration: wipeEnd - smokeStart, ease: 'power3.out' },
        smokeStart
      );
      tl.to(smokeSweepEl, { opacity: 0, duration: 0.3 }, wipeEnd - 0.3);
    }

    tl.addLabel('revealEnd');

    tl.to({}, { duration: HIGHLIGHT_MS / 1000 }, 'revealEnd+=0.15');

    tl.to(imgEl, { opacity: 0, scale: 0.55, duration: 0.25, ease: 'power2.in' });

    return () => tl.kill();
  }, [active]);

  return (
    <div className="telao-page">
      <div className="wall brick-wall" ref={wallRef}>
        <div className="wall-aging" />
      </div>

      <div className={`signatures-layer ${adminMode ? 'admin-mode' : ''}`}>
        {placed.map((sig) => (
          <div
            key={sig.id}
            id={`sig-${sig.id}`}
            className="placed-signature-wrap"
            style={{ left: `${sig.x * 100}%`, top: `${sig.y * 100}%`, '--sig-mask': `url(${sig.dataUrl})` }}
            onClick={() => requestDelete(sig)}
          >
            <img src={sig.dataUrl} className="placed-signature" alt="assinatura" />
            <div className="placed-signature-texture" />
          </div>
        ))}

        {deleteTarget && (
          <div
            className="admin-confirm-popover"
            style={{ left: `${deleteTarget.x * 100}%`, top: `${deleteTarget.y * 100}%` }}
          >
            <span>Excluir esta assinatura?</span>
            <div className="admin-confirm-actions">
              <button onClick={() => setDeleteTarget(null)}>Não</button>
              <button onClick={confirmDelete} className="admin-confirm-yes">Sim</button>
            </div>
          </div>
        )}
      </div>

      <img
        src="/adesivos/adesivos2.svg"
        alt=""
        aria-hidden="true"
        className={`admin-sticker ${adminMode ? 'active' : ''}`}
        onClick={() => setAdminMode((v) => !v)}
      />
      {adminMode && (
        <div className="admin-badge">Modo admin: toque numa assinatura pra excluir</div>
      )}

      {active && (
        <div className="active-overlay">
          <div className="paint-splash" />

          <div id="drip-container" className="drip-container" />

          <img id="active-signature" src={active.dataUrl} className="active-signature" alt="assinatura em destaque" />

          <div id="smoke-sweep" className="smoke-sweep" />
        </div>
      )}

      <video ref={videoRef} className="mascot-video" muted playsInline preload="auto">
        <source src="/video-s-bg.webm" type="video/webm" />
      </video>
    </div>
  );
}
