import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import SignatureModal, { SPRAY_COLORS } from '../components/SignatureModal';
import { socket } from '../socket';
import { getContrastText } from '../lib/color';

const STICKERS = [
  { src: '/adesivos/adesivos1.svg', className: 'sticker sticker-1' },
  { src: '/adesivos/adesivos5.svg', className: 'sticker sticker-2' },
  { src: '/adesivos/adesivos4.svg', className: 'sticker sticker-3' },
  { src: '/adesivos/adesivos8.svg', className: 'sticker sticker-4' },
  { src: '/adesivos/adesivos3.svg', className: 'sticker sticker-5' },
  { src: '/adesivos/adesivos6.svg', className: 'sticker sticker-6' },
];

const REVEAL_DELAY_MS = 3000;

export default function Tablet() {
  const wallRef = useRef(null);
  const confettiRef = useRef(null);
  const [pendingPos, setPendingPos] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentColor, setSentColor] = useState('#00ff00');
  const [occupied, setOccupied] = useState([]);

  useEffect(() => {
    socket.on('signatures:sync', (all) => setOccupied(all));
    socket.on('signature:new', (sig) => setOccupied((prev) => [...prev, sig]));
    socket.on('signature:removed', ({ id }) => setOccupied((prev) => prev.filter((s) => s.id !== id)));

    return () => {
      socket.off('signatures:sync');
      socket.off('signature:new');
      socket.off('signature:removed');
    };
  }, []);

  const handleWallClick = (e) => {
    const rect = wallRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPos({ x, y });
    setShowModal(true);
  };

  const spawnConfetti = () => {
    const container = confettiRef.current;
    if (!container) return;
    const colors = SPRAY_COLORS.map((c) => c.value);
    const count = 90;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const size = 6 + Math.random() * 7;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * (0.4 + Math.random() * 0.6)}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
      container.appendChild(piece);

      const drift = (Math.random() - 0.5) * 240;
      const rotations = (180 + Math.random() * 540) * (Math.random() < 0.5 ? -1 : 1);
      gsap.fromTo(
        piece,
        { y: -30, x: 0, opacity: 1, rotate: 0 },
        {
          y: window.innerHeight + 40,
          x: drift,
          rotate: rotations,
          opacity: 0.9,
          duration: 1.6 + Math.random() * 1.4,
          ease: 'power1.in',
          onComplete: () => piece.remove(),
        }
      );
    }
  };

  const handleConfirm = (signaturePayload) => {
    setShowModal(false);
    setSentColor(signaturePayload.color || '#00ff00');
    setSent(true);
    spawnConfetti();

    setTimeout(() => {
      socket.emit('signature:new', { ...pendingPos, ...signaturePayload });
    }, REVEAL_DELAY_MS);

    setTimeout(() => setSent(false), REVEAL_DELAY_MS + 1800);
  };

  return (
    <div className="tablet-page">
      {STICKERS.map((s) => (
        <img key={s.className} src={s.src} className={s.className} alt="" aria-hidden="true" />
      ))}

      <img src="/boneco-frente-spray.svg" className="mascot-hero" alt="Mascote VCA" />

      <div className="tablet-content">
        <div className="tablet-header">
          <h1 className="tablet-title">
            Deixe sua marca
            <br />
            <span>no mural</span>
          </h1>
          <p className="tablet-subtitle">
            Toque em um espaço livre abaixo — é um espelho ao vivo do telão
          </p>
        </div>

        <div className="wall-preview brick-wall" ref={wallRef} onClick={handleWallClick}>
          {occupied.map((sig) => (
            <img
              key={sig.id}
              src={sig.dataUrl}
              className="occupied-mark"
              style={{ left: `${sig.x * 100}%`, top: `${sig.y * 100}%` }}
              alt=""
            />
          ))}
          <span className="wall-hint">Toque em um espaço livre</span>
        </div>
      </div>

      {showModal && (
        <SignatureModal onConfirm={handleConfirm} onCancel={() => setShowModal(false)} />
      )}

      {sent && (
        <div
          className="toast toast-big"
          style={{ background: sentColor, color: getContrastText(sentColor) }}
        >
          <strong>🎉 Assinatura enviada!</strong>
          <span>👀 Olhe para o telão agora — ela está chegando lá!</span>
        </div>
      )}

      <div ref={confettiRef} className="confetti-layer" />
    </div>
  );
}
