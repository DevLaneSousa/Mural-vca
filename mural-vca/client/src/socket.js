import { io } from 'socket.io-client';

// Sem parâmetros, conecta na própria origem: funciona tanto em dev
// (o proxy do Vite redireciona /socket.io para o backend na porta 3001)
// quanto em produção (o Express serve tudo numa porta só).
export const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 500,
});
