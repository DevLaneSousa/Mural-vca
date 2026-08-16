import { useEffect, useRef } from 'react';

const BALL_COUNT = 140;

// Fundo decorativo (não interativo) inspirado no efeito de bolhas orbitando
// do protótipo de referência. Roda em canvas puro, sem dependências externas.
export default function AmbientBackground({ hue = 210 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const hueRef = useRef(hue);

  useEffect(() => {
    hueRef.current = hue;
  }, [hue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function makeBall(centerX, centerY, maxRadius) {
      const radius = Math.random() * maxRadius * 0.5 + maxRadius * 0.5;
      return {
        radius,
        x: centerX - radius,
        y: centerY - radius,
        position: Math.random() * Math.PI * 2,
        speed: (Math.random() * Math.PI * 2) / 1400 + (Math.PI * 2) / 2600,
        wavePeriod: 1 + Math.random() * 5,
        waveHeight: Math.random() * 0.2,
        waveOffset: Math.random() * Math.PI,
        xi: 0,
        yi: 0,
      };
    }

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.35;
      const maxBallRadius = radius * 0.09;
      const balls = [];
      for (let i = 0; i < BALL_COUNT; i++) {
        balls.push(makeBall(centerX, centerY, maxBallRadius));
      }
      stateRef.current = { centerX, centerY, radius, balls };
    }

    resize();
    window.addEventListener('resize', resize);

    let raf;
    function tick() {
      const s = stateRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      for (const ball of s.balls) {
        ball.position += ball.speed;
        const radiusOffset =
          s.radius + Math.sin((ball.position + ball.waveOffset) * ball.wavePeriod) * s.radius * ball.waveHeight;
        const targetX = Math.sin(ball.position) * radiusOffset - ball.radius + s.centerX;
        const targetY = -Math.cos(ball.position) * radiusOffset - ball.radius + s.centerY;
        ball.xi += ((targetX - ball.x) * 0.05 - ball.xi) * 0.05;
        ball.yi += ((targetY - ball.y) * 0.05 - ball.yi) * 0.05;
        ball.x += ball.xi;
        ball.y += ball.yi;

        const h = hueRef.current + (Math.random() * 12 - 6);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${h}, 85%, 55%, 0.18)`;
        ctx.arc(ball.x + ball.radius, ball.y + ball.radius, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-background" />;
}
