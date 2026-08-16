# Mural de assinaturas VCA

Projeto 100% local (sem internet, sem banco de dados). Um servidor Node roda na
máquina do evento; tablets e telão se conectam nele pela rede local.

## Estrutura

```
mural-vca/
  server/   -> Express + Socket.io, estado em memória (RAM)
  client/   -> React (Vite): páginas /tablet e /telao
```

## Instalação (uma vez, antes do evento, com internet disponível)

```bash
cd server && npm install
cd ../client && npm install
```

## Rodando em desenvolvimento (para testar/ajustar)

Terminal 1:
```bash
cd server
npm run dev        # sobe em http://localhost:3001
```

Terminal 2:
```bash
cd client
npm run dev        # sobe em http://localhost:5173, com proxy pro backend
```

Abra `http://localhost:5173/telao` numa aba e `http://localhost:5173/tablet` em outra.

## Rodando no dia do evento (produção, tudo numa porta só)

```bash
cd client
npm run build       # gera client/dist

cd ../server
npm start           # serve o client/dist + API + socket na porta 3001
```

- No próprio PC: abra `http://localhost:3001/telao` no navegador em modo kiosk
  (Chrome: `chrome --kiosk http://localhost:3001/telao`).
- Nos tablets: descubra o IP local do PC (`ipconfig` no Windows / `ifconfig` no
  Mac-Linux) e acesse `http://<ip-do-pc>:3001/tablet`. Todos precisam estar na
  mesma rede Wi-Fi/local — sem necessidade de internet.
- Recomendo IP fixo/estático no PC para o endereço não mudar durante o evento.

## Assinatura em spray (novidade)

O modal de assinatura não usa mais `signature_pad` — agora é um motor de
spray próprio (`SprayCanvas.jsx`):

- **Paleta de cores**: a pessoa escolhe entre 8 cores antes de assinar
  (`SPRAY_COLORS` em `SignatureModal.jsx` — edite à vontade).
- **Densidade constante**: as partículas são geradas por distância percorrida
  (não por evento de mouse/touch), o que evita tanto lacunas em traços
  rápidos quanto acúmulo de tinta em traços lentos. Para calibrar o
  "realismo" do spray, ajuste em `SprayCanvas.jsx`:
  - `JITTER_RADIUS` — dispersão das partículas (menor = mais legível/linear)
  - `PARTICLES_PER_STEP` e `STEP_PX` — densidade da textura
  - `DRIP_CHANCE` — chance de pingar tinta ao soltar o traço
- **Traço vetorial + textura raster**: cada traço é salvo tanto como PNG
  (textura final, já com os pingos) quanto como pontos normalizados
  (`strokes`), enviados junto pelo socket. O telão usa os pontos para
  "desenhar" a assinatura em tempo real (efeito de traço vetorial, técnica de
  `stroke-dashoffset`) antes de fazer o crossfade para a textura de spray
  final — e só então ela voa para o mural.

## Fundo animado do telão

`AmbientBackground.jsx` desenha bolhas de luz orbitando em canvas (fundo não
interativo, atrás do mural). A cor muda dinamicamente com a cor escolhida
por quem está assinando no momento. Ajuste `BALL_COUNT` e o hue padrão em
`Telao.jsx` (`hueFromColor`) conforme a identidade visual do evento.

## O que ajustar antes do evento

1. **Vídeo do mascote**: coloque `mascot.webm` (com canal alpha) em
   `client/public/`. Sem ele, o telão usa um splash de tinta em CSS como
   fallback — funciona, mas sem o mascote.
2. **Timestamp do "jato de tinta"**: em `Telao.jsx`, ajuste `SPLASH_AT` para
   bater com o frame exato em que a tinta atinge a parede no seu vídeo.
3. **Limite de assinaturas**: `MAX_SIGNATURES` em `server/index.js` (padrão 60).
   Ao passar do limite, a mais antiga some do mural automaticamente.
4. **Imagem de fundo do mural**: troque `.wall-preview` (tablet) e `.wall`
   (telão) pelo visual real do evento (logo, arte de fundo) via CSS.
5. **Mapeamento tablet → telão**: hoje o tablet usa uma área retangular
   simples para escolher a posição. Se quiser espelhar exatamente o layout do
   telão (com áreas já ocupadas em cinza), dá pra fazer o tablet também
   escutar `signatures:sync`/`signature:new` e desenhar os pontos ocupados por
   cima do preview.

## Testando sem hardware do evento

Abra várias abas em `/tablet` no mesmo navegador simulando pessoas
diferentes, e uma aba em `/telao` — tudo passa pelo mesmo `localhost:3001`,
então dá pra testar o fluxo inteiro sem tablets físicos.
