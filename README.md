# Mural de assinaturas VCA

Projeto 100% local.
## Estrutura

```
mural-vca/
  server/   -> Express + Socket.io, estado em memória (RAM)
  client/   -> React (Vite): páginas /tablet e /telao
```

## ⚠️ Importante: as assinaturas não são salvas em disco

O servidor guarda as assinaturas só em memória (RAM). Isso quer dizer que:

- **Se o servidor for reiniciado** (fechar/reabrir o terminal, queda de luz,
  travamento, `npm start` de novo etc.), **todas as assinaturas somem** e o
  mural volta a ficar vazio, do zero.

## Instalação 

```bash
cd server && npm install
cd ../client && npm install
```


## Rodando
```bash
cd client
npm run build       # gera client/dist

cd ../server
npm start           # serve o client/dist + API + socket na porta 3001
```


