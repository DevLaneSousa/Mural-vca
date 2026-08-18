import express from 'express';
import http from 'http';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Quantidade máxima de assinaturas visíveis no mural ao mesmo tempo.
// Ao ultrapassar, a mais antiga é removida para liberar espaço.
const MAX_SIGNATURES = 60;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Serve o build de produção do client (rode "npm run build" na pasta client antes)
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Fallback de SPA: qualquer rota que não seja um arquivo estático
// (ex: /tablet, /telao) devolve o index.html e o React Router assume dali.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Estado em memória. Não há banco de dados: reiniciar o servidor zera tudo.
let signatures = [];

io.on('connection', (socket) => {
  console.log(`[+] cliente conectado: ${socket.id} (total: ${io.engine.clientsCount})`);

  // Ao conectar, quem entrar (telão ou tablet) recebe o estado atual completo,
  // isso resolve o caso de dar F5 no telão no meio do evento.
  socket.emit('signatures:sync', signatures);

  socket.on('signature:new', (payload) => {
    if (!payload || typeof payload.dataUrl !== 'string') return;

    const signature = {
      id: randomUUID(),
      dataUrl: payload.dataUrl,
      strokes: Array.isArray(payload.strokes) ? payload.strokes : [],
      color: typeof payload.color === 'string' ? payload.color : '#111111',
      x: clamp01(payload.x),
      y: clamp01(payload.y),
      createdAt: Date.now(),
    };

    signatures.push(signature);
    io.emit('signature:new', signature);

    // Libera espaço removendo a(s) mais antiga(s) além do limite
    while (signatures.length > MAX_SIGNATURES) {
      const removed = signatures.shift();
      io.emit('signature:removed', { id: removed.id });
    }
  });

  // Exclusão manual (usada pelo modo admin escondido no telão) — qualquer
  // cliente pode pedir, já que não há autenticação nesse projeto; o acesso
  // é controlado só pela UI escondida no telão.
  socket.on('signature:delete', (payload) => {
    const id = payload?.id;
    if (typeof id !== 'string') return;
    const idx = signatures.findIndex((s) => s.id === id);
    if (idx === -1) return;
    signatures.splice(idx, 1);
    io.emit('signature:removed', { id });
  });

  socket.on('disconnect', () => {
    console.log(`[-] cliente desconectado: ${socket.id}`);
  });
});

function clamp01(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return 0.5;
  return Math.min(1, Math.max(0, num));
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor do mural rodando em http://0.0.0.0:${PORT}`);
  console.log(`No evento, acesse pelos tablets em http://<ip-do-pc>:${PORT}/tablet`);
  console.log(`E no telão em http://localhost:${PORT}/telao`);
});
