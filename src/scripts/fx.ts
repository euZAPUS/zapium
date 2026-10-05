/**
 * Chispas: estela del cursor y ráfagas (aterrizaje de la patata, clics).
 * Un único <canvas> fijo, creado la primera vez que hace falta. Solo corre el
 * bucle mientras haya partículas vivas, así que en reposo no cuesta nada.
 * Con prefers-reduced-motion no hace nada.
 */
import { prefersReducedMotion, readColor } from './tokens';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  spin: number;
  color: string;
  star: boolean;
}

const TOKENS = ['--accent', '--pink', '--sky', '--mint', '--sun', '--accent-2'] as const;
const MAX_PARTICLES = 260;

let canvas: HTMLCanvasElement | undefined;
let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;
let palette: string[] = [];
let ink = '#17130e';
let particles: Particle[] = [];
let raf = 0;
let last = 0;

const css = (token: string) => {
  const [r, g, b] = readColor(token);
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
};

function refreshPalette() {
  palette = TOKENS.map(css);
  ink = css('--potato-line');
}

function ensure(): boolean {
  if (prefersReducedMotion()) return false;
  if (canvas) return true;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  ctx = canvas.getContext('2d');
  const resize = () => {
    if (!canvas) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  };
  resize();
  addEventListener('resize', resize, { passive: true });
  refreshPalette();
  new MutationObserver(refreshPalette).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-mode'],
  });
  return !!ctx;
}

function starPath(c: CanvasRenderingContext2D, r: number) {
  const k = r * 0.14;
  c.beginPath();
  c.moveTo(0, -r);
  c.quadraticCurveTo(k, -k, r, 0);
  c.quadraticCurveTo(k, k, 0, r);
  c.quadraticCurveTo(-k, k, -r, 0);
  c.quadraticCurveTo(-k, -k, 0, -r);
  c.closePath();
}

function tick(now: number) {
  const c = ctx;
  if (!c || !canvas) return;
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
  last = now;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, innerWidth, innerHeight);
  c.lineJoin = 'round';

  particles = particles.filter((p) => (p.life += dt) < p.max);
  for (const p of particles) {
    p.vy += 340 * dt * (p.star ? 0.5 : 1);
    p.vx *= 1 - 1.4 * dt;
    p.vy *= 1 - 0.9 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.spin * dt;
    const k = p.life / p.max;
    const scale = k < 0.12 ? k / 0.12 : 1 - ((k - 0.12) / 0.88) * 0.7;
    c.save();
    c.globalAlpha = Math.min(1, (1 - k) * 2.2);
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillStyle = p.color;
    c.strokeStyle = ink;
    c.lineWidth = 1.6;
    if (p.star) {
      starPath(c, p.size * scale);
    } else {
      c.beginPath();
      c.arc(0, 0, p.size * 0.38 * scale, 0, Math.PI * 2);
    }
    c.fill();
    c.stroke();
    c.restore();
  }
  raf = particles.length ? requestAnimationFrame(tick) : 0;
  if (!raf) c.clearRect(0, 0, innerWidth, innerHeight);
}

function spawn(p: Omit<Particle, 'life' | 'color' | 'star'> & { color?: string; star?: boolean }) {
  if (!ensure()) return;
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push({
    life: 0,
    color: p.color ?? palette[Math.floor(Math.random() * palette.length)] ?? '#ffae00',
    star: p.star ?? Math.random() < 0.72,
    ...p,
  });
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
}

/** Ráfaga de chispas desde un punto (coordenadas de pantalla). */
export function burst(x: number, y: number, count = 22, power = 1) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (120 + Math.random() * 360) * power;
    spawn({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 140 * power,
      max: 0.7 + Math.random() * 0.8,
      size: 6 + Math.random() * 12,
      rot: Math.random() * 6,
      spin: (Math.random() - 0.5) * 9,
    });
  }
}

/** Chispa suelta de la estela del cursor; `speed` en px/frame. */
export function trail(x: number, y: number, speed = 10) {
  const n = speed > 28 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    spawn({
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 70,
      vy: -20 - Math.random() * 60,
      max: 0.55 + Math.random() * 0.5,
      size: 5 + Math.random() * 8,
      rot: Math.random() * 6,
      spin: (Math.random() - 0.5) * 6,
    });
  }
}
