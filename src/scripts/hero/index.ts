/**
 * Fondo WebGL del hero + interacción (mascota, doodles, parallax).
 * El WebGL se carga con import dinámico cuando el navegador está ocioso y SOLO
 * si hay WebGL y el usuario no pidió menos movimiento; si no, se queda el
 * degradado estático que pinta el CSS. Se pausa fuera de pantalla y con la
 * pestaña oculta.
 */
import { prefersReducedMotion } from '../tokens';
import type { MeshScene } from './mesh';
import './interact';

const bg = document.querySelector<HTMLElement>('[data-hero-bg]');
const hero = bg?.parentElement;

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start(host: HTMLElement, area: HTMLElement) {
  let scene: MeshScene;
  try {
    scene = (await import('./mesh')).createMesh();
  } catch (err) {
    console.warn('[hero] WebGL no disponible, se usa el fallback estático', err);
    return;
  }

  host.append(scene.canvas);
  const resize = () => {
    const r = host.getBoundingClientRect();
    scene.resize(Math.max(1, r.width), Math.max(1, r.height));
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const pointer = { x: 0.75, y: 0.5 };
  addEventListener(
    'pointermove',
    (e) => {
      const r = area.getBoundingClientRect();
      pointer.x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      pointer.y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    },
    { passive: true },
  );

  let visible = true;
  let raf = 0;
  const t0 = performance.now();
  const loop = (now: number) => {
    scene.frame((now - t0) / 1000, pointer);
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const wake = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    wake();
  }).observe(area);
  document.addEventListener('visibilitychange', wake);

  scene.frame(0, pointer); // primer fotograma antes de mostrar el canvas
  requestAnimationFrame(() => host.setAttribute('data-ready', ''));
  wake();

  new MutationObserver(() => scene.colors()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => scene.colors());

  scene.canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(raf);
    host.removeAttribute('data-ready');
    scene.canvas.remove();
  });
}

if (bg && hero && !prefersReducedMotion() && hasWebGL()) {
  const go = () => start(bg, hero);
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 });
  else setTimeout(go, 250);
}
