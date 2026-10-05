/**
 * Carga la escena 3D (nudo iridiscente) con import dinámico cuando su contenedor está
 * cerca de la pantalla. Se pausa fuera de pantalla. Sin WebGL o con reduced-motion se
 * queda la forma CSS de reserva.
 */
import { prefersReducedMotion } from '../tokens';
import { sfx } from '../audio';
import type { KnotScene } from './knot';

const hosts = document.querySelectorAll<HTMLElement>('[data-shape3d]');

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start(host: HTMLElement) {
  let scene: KnotScene;
  try {
    scene = (await import('./knot')).createKnot(matchMedia('(pointer: coarse)').matches);
  } catch (err) {
    console.warn('[shape3d] WebGL no disponible, se usa la forma CSS', err);
    return;
  }
  host.append(scene.canvas);
  const resize = () => {
    const r = host.getBoundingClientRect();
    scene.resize(Math.max(1, r.width), Math.max(1, r.height));
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const look = { x: 0, y: 0 };
  addEventListener(
    'pointermove',
    (e) => {
      const r = host.getBoundingClientRect();
      look.x = Math.max(-1.4, Math.min(1.4, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      look.y = Math.max(-1.4, Math.min(1.4, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    },
    { passive: true },
  );
  let kick = 0;
  addEventListener('pointerdown', (e) => {
    const r = host.getBoundingClientRect();
    if (
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    ) {
      kick = 0.25;
      sfx.boing();
    }
  });

  let visible = true;
  let raf = 0;
  const t0 = performance.now();
  const loop = (now: number) => {
    const r = host.getBoundingClientRect();
    const progress = Math.max(
      0,
      Math.min(1, 1 - (r.top + r.height / 2) / (innerHeight + r.height)),
    );
    scene.frame((now - t0) / 1000, { lookX: look.x, lookY: look.y, progress, kick });
    kick = 0;
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const wake = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    wake();
  }).observe(host);
  document.addEventListener('visibilitychange', wake);
  scene.frame(0, { lookX: 0, lookY: 0, progress: 0.5, kick: 0 });
  requestAnimationFrame(() => host.setAttribute('data-ready', ''));
  wake();
  new MutationObserver(() => scene.colors()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-mode'],
  });
}

if (hosts.length && !prefersReducedMotion() && hasWebGL()) {
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          obs.unobserve(e.target);
          void start(e.target as HTMLElement);
        }
      }
    },
    { rootMargin: '300px' },
  );
  hosts.forEach((h) => io.observe(h));
}
