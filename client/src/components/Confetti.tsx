/**
 * Confetti — celebratory burst animation.
 *
 * Usage:
 *   const { burst } = useConfetti();
 *   burst();          // fires confetti from center of screen
 *   burst(x, y);      // fires from specific coordinates (px)
 */
import { useCallback } from 'react';

const COLORS = ['#E8A23A', '#2BAA8A', '#9B7EE6', '#E25555', '#3D7FB9', '#E8842A', '#F2C148', '#5BE8C8', '#F2A8A8'];
const SHAPES = ['rect', 'circle', 'rect', 'rect']; // weighted towards rectangles

interface Particle {
  id: number;
  color: string;
  shape: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  spin: number;
  size: number;
  duration: number;
  delay: number;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateParticles(cx: number, cy: number, count = 60): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(60, 180);
    return {
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      x: cx,
      y: cy,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed - rand(40, 100), // bias upward
      spin: rand(-720, 720),
      size: rand(5, 11),
      duration: rand(0.8, 1.4),
      delay: rand(0, 0.12),
    };
  });
}

/** Injects a self-removing confetti burst into the DOM. */
function fireBurst(cx: number, cy: number) {
  const particles = generateParticles(cx, cy);
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(container);

  const maxDuration = Math.max(...particles.map(p => (p.duration + p.delay) * 1000)) + 100;

  // Render particles as DOM elements (no React for speed)
  for (const p of particles) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    el.style.cssText = `
      left: ${p.x}px;
      top: ${p.y}px;
      width: ${p.size}px;
      height: ${p.shape === 'circle' ? p.size : p.size * 0.55}px;
      background: ${p.color};
      border-radius: ${p.shape === 'circle' ? '50%' : '2px'};
      --dx: ${p.dx}px;
      --dy: ${p.dy}px;
      --spin: ${p.spin}deg;
      --duration: ${p.duration}s;
      --delay: ${p.delay}s;
    `;
    container.appendChild(el);
  }

  // Clean up after animation completes
  setTimeout(() => {
    document.body.removeChild(container);
  }, maxDuration);
}

export function useConfetti() {
  const burst = useCallback((x?: number, y?: number) => {
    const cx = x ?? window.innerWidth / 2;
    const cy = y ?? window.innerHeight * 0.4;
    fireBurst(cx, cy);
  }, []);

  return { burst };
}
