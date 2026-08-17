import { useEffect, useRef, useState } from 'react';
import SignatureModal from '../components/SignatureModal';
import { socket } from '../socket';
import { getContrastText } from '../lib/color';

// Adesivos decorativos espalhados pela tela — troque/adicione à vontade
const STICKERS = [
  { src: '/adesivos/adesivos1.svg', className: 'sticker sticker-1' },
  { src: '/adesivos/adesivos5.svg', className: 'sticker sticker-2' },
  { src: '/adesivos/adesivos4.svg', className: 'sticker sticker-3' },
  { src: '/adesivos/adesivos8.svg', className: 'sticker sticker-4' },
  { src: '/adesivos/adesivos3.svg', className: 'sticker sticker-5' },
  { src: '/adesivos/adesivos6.svg', className: 'sticker sticker-6' },
];

export default function Tablet() {
  const wallRef = useRef(null);
  const [pendingPos, setPendingPos] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentColor, setSentColor] = useState('#16a34a');
  const [occupied, setOccupied] = useState([]); // espelha as assinaturas já no mural

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

  const handleConfirm = (signaturePayload) => {
    // signaturePayload = { dataUrl, strokes, color } — vem do SprayCanvas
    socket.emit('signature:new', { ...pendingPos, ...signaturePayload });
    setShowModal(false);
    setSentColor(signaturePayload.color || '#16a34a');
    setSent(true);
    setTimeout(() => setSent(false), 2500);
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
          className="toast"
          style={{ background: sentColor, color: getContrastText(sentColor) }}
        >
          Assinatura enviada! Olhe para o telão ✨
        </div>
      )}
    </div>
  );
}
