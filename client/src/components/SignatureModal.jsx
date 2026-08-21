import { useRef, useState } from 'react';
import SprayCanvas from './SprayCanvas';

export const SPRAY_COLORS = [
  { name: 'Rosa neon', value: '#f4189b' },
  { name: 'Azul VCA', value: '#1f7ae0' },
  { name: 'Verde limão', value: '#8ee000' },
  { name: 'Laranja', value: '#ff7a1a' },
  { name: 'Amarelo', value: '#ffd400' },
  { name: 'Roxo', value: '#8b3cf0' },
  { name: 'Branco', value: '#f5f5f5' },
];

export default function SignatureModal({ onConfirm, onCancel }) {
  const [color, setColor] = useState(SPRAY_COLORS[0].value);
  const [tool, setTool] = useState('spray');
  const [empty, setEmpty] = useState(true);
  const controlsRef = useRef(null);

  const handleClear = () => {
    controlsRef.current?.clear();
  };

  const handleConfirm = () => {
    if (!controlsRef.current || controlsRef.current.isEmpty()) return;
    onConfirm(controlsRef.current.exportSignature());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Assine com spray</h2>

        <div className="tool-toggle">
          <button
            type="button"
            className={`tool-btn ${tool === 'spray' ? 'active' : ''}`}
            onClick={() => setTool('spray')}
          >
            🎨 Spray
          </button>
          <button
            type="button"
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
          >
            🧽 Borracha
          </button>
        </div>

        <div className={`color-palette ${tool === 'eraser' ? 'color-palette-disabled' : ''}`}>
          {SPRAY_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`color-swatch ${color === c.value ? 'selected' : ''}`}
              style={{ backgroundColor: c.value }}
              aria-label={c.name}
              onClick={() => setColor(c.value)}
            />
          ))}
        </div>

        <SprayCanvas
          color={color}
          tool={tool}
          onReady={(controls) => { controlsRef.current = controls; }}
          onStrokeChange={(hasStrokes) => setEmpty(!hasStrokes)}
        />

        <div className="modal-actions">
          <button onClick={handleClear} className="btn secondary">Limpar</button>
          <button onClick={onCancel} className="btn secondary">Cancelar</button>
          <button onClick={handleConfirm} disabled={empty} className="btn primary">
            Confirmar e enviar
          </button>
        </div>
      </div>
    </div>
  );
}
