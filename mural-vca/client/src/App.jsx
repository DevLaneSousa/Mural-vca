import { Routes, Route, Link } from 'react-router-dom';
import Tablet from './pages/Tablet';
import Telao from './pages/Telao';

export default function App() {
  return (
    <Routes>
      <Route path="/tablet" element={<Tablet />} />
      <Route path="/telao" element={<Telao />} />
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

function Home() {
  return (
    <div className="home">
      <h1>Mural de assinaturas VCA</h1>
      <p>
        Abra <code>/telao</code> na tela grande e <code>/tablet</code> em cada tablet do evento.
      </p>
      <div className="home-links">
        <Link className="btn primary" to="/tablet">Abrir /tablet</Link>
        <Link className="btn secondary" to="/telao">Abrir /telao</Link>
      </div>
    </div>
  );
}
