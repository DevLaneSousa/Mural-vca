import express from 'express';
import http from 'http';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const MAX_SIGNATURES = 60;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

let signatures = [];

io.on('connection', (socket) => {
  console.log(`[+] cliente conectado: ${socket.id} (total: ${io.engine.clientsCount})`);

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

    while (signatures.length > MAX_SIGNATURES) {
      const removed = signatures.shift();
      io.emit('signature:removed', { id: removed.id });
    }
  });

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
