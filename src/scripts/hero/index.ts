/**
 * Elemento 3D del hero. Se carga con import dinámico, cuando el navegador está
 * ocioso, y SOLO si hay WebGL y el usuario no pidió menos movimiento. Si no, se
 * queda el degradado estático (fallback) que ya pinta el CSS.
 * Se pausa fuera de pantalla y con la pestaña oculta.
 */
import { prefersReducedMotion } from '../tokens';
import type { HeroScene } from './types';

const fx = document.querySelector<HTMLElement>('[data-hero-fx]');
const stage = fx?.parentElement;

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start(host: HTMLElement, area: HTMLElement) {
  // ?hero=portal permite ver la opción B mientras se decide (fase 1)
  const variant = new URLSearchParams(location.search).get('hero') === 'portal' ? 'portal' : 'orb';
  let scene: HeroScene;
  try {
    scene =
      variant === 'portal'
        ? (await import('./portal')).createPortal()
        : (await import('./orb')).createOrb();
  } catch (err) {
    console.warn('[hero] WebGL no disponible, se usa el fallback estático', err);
    return;
  }

  host.append(scene.canvas);
  const resize = () => {
    const r = host.getBoundingClientRect();
    scene.resize(Math.max(1, r.width * 1.16), Math.max(1, r.height * 1.16));
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const pointer = { x: 0, y: 0 };
  addEventListener(
    'pointermove',
    (e) => {
      const r = area.getBoundingClientRect();
      pointer.x = Math.max(
        -1.5,
        Math.min(1.5, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)),
      );
      pointer.y = Math.max(
        -1.5,
        Math.min(1.5, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)),
      );
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

  // Primer fotograma antes de mostrar el canvas (evita un parpadeo)
  scene.frame(0, pointer);
  requestAnimationFrame(() => host.setAttribute('data-ready', ''));
  wake();

  // El tema cambia los colores de los tokens
  new MutationObserver(() => scene.colors()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-palette'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => scene.colors());

  scene.canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(raf);
    host.removeAttribute('data-ready');
    scene.canvas.remove();
  });
}

if (fx && stage && !prefersReducedMotion() && hasWebGL()) {
  const go = () => start(fx, stage);
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 300);
}
