import { useRef, useState } from 'react';
import SignatureModal from '../components/SignatureModal';
import { socket } from '../socket';

export default function Tablet() {
  const wallRef = useRef(null);
  const [pendingPos, setPendingPos] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sent, setSent] = useState(false);

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
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="tablet-page">
      <h1>Escolha um lugar no mural e assine</h1>
      <p className="subtitle">Toque em qualquer ponto da imagem abaixo (é um espelho do telão)</p>

      {/*
        Essa div representa o mural em miniatura. Troque o background
        por uma captura de tela real do /telao para a pessoa escolher
        o local com precisão.
      */}
      <div className="wall-preview brick-wall" ref={wallRef} onClick={handleWallClick}>
        <span className="wall-hint">Toque em um espaço livre</span>
      </div>

      {showModal && (
        <SignatureModal onConfirm={handleConfirm} onCancel={() => setShowModal(false)} />
      )}

      {sent && <div className="toast">Assinatura enviada! Olhe para o telão ✨</div>}
    </div>
  );
}
