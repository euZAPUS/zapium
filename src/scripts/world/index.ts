/**
 * Carga el mundo WebGL (import dinámico, con el navegador ocioso) en escritorio y móvil
 * (en táctil, con menos resolución) si hay WebGL y no hay prefers-reduced-motion.
 * Si no, se queda la rejilla CSS (fallback). Se pausa fuera de pantalla y con la pestaña oculta.
 * Publica la «vista» de la cámara en el evento `zapium:view` (la usa el gizmo tipo Blender).
 */
import { prefersReducedMotion } from '../tokens';
import type { WorldScene } from './factory';

const host = document.querySelector<HTMLElement>('[data-world]');
const coarse = matchMedia('(pointer: coarse)').matches; // móvil/tablet táctil: render más barato

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start(el: HTMLElement) {
  let scene: WorldScene;
  try {
    scene = (await import('./factory')).createWorld(coarse);
  } catch (err) {
    console.warn('[world] WebGL no disponible, se usa la rejilla CSS', err);
    return;
  }
  el.append(scene.canvas);
  const resize = () => scene.resize(Math.max(1, innerWidth), Math.max(1, innerHeight));
  addEventListener('resize', resize, { passive: true });
  resize();

  // Entrada: scroll → z, ratón → mirada, velocidad → alabeo
  const mouse = { x: 0, y: 0 };
  addEventListener(
    'pointermove',
    (e) => {
      mouse.x = (e.clientX / innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / innerHeight - 0.5) * 2;
    },
    { passive: true },
  );
  const view = { z: 0, yaw: 0, pitch: 0, roll: 0 };
  // Estela luminosa del cursor sobre las losetas + onda al hacer clic
  type Hit = { p: [number, number, number]; born: number };
  const trail: Hit[] = [];
  let ripple: Hit | null = null;
  let lastPush = 0;
  addEventListener(
    'pointermove',
    (e) => {
      const now = performance.now();
      if (e.pointerType !== 'mouse' || now - lastPush < 90) return;
      lastPush = now;
      const hit = scene.cast(mouse.x, -mouse.y, { ...view, dim: 1 });
      trail.unshift({ p: hit, born: now });
      if (trail.length > 10) trail.pop();
    },
    { passive: true },
  );
  addEventListener('pointerdown', (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / innerHeight - 0.5) * 2;
    ripple = { p: scene.cast(mouse.x, -mouse.y, { ...view, dim: 1 }), born: performance.now() };
  });
  let lastY = scrollY;
  let vel = 0;
  let zTarget = 0;
  let visible = true;
  let raf = 0;
  const t0 = performance.now();
  // Proyectos (pantalla completa, opaca) tapa el mundo: no tiene sentido pintarlo detrás
  const covered = () => document.documentElement.classList.contains('is-covered');

  const loop = (now: number) => {
    const t = (now - t0) / 1000;
    const dy = scrollY - lastY;
    lastY = scrollY;
    vel += (dy - vel) * 0.12;
    zTarget = (scrollY / innerHeight) * 2.1;
    const drift = t * 0.1; // avanza siempre un poquito: el mundo está vivo
    view.z += (zTarget + drift - view.z) * 0.07;
    view.yaw += (mouse.x * 0.2 - view.yaw) * 0.05;
    view.pitch += (mouse.y * 0.1 - view.pitch) * 0.05;
    view.roll += (Math.max(-0.12, Math.min(0.12, vel * 0.0035)) - view.roll) * 0.08;
    // se oscurece al bajar del hero para que el texto de las secciones se lea bien
    const fixed = Number(el.dataset.dim ?? NaN);
    const dim = Number.isNaN(fixed)
      ? 0.86 - 0.34 * Math.min(1, Math.max(0, scrollY / (innerHeight * 0.9)))
      : fixed;
    const nowMs = performance.now();
    while (trail.length && nowMs - (trail[trail.length - 1]?.born ?? 0) > 1500) trail.pop();
    if (ripple && nowMs - ripple.born > 1400) ripple = null;
    scene.frame(t, {
      ...view,
      dim,
      trail: trail.map((h) => [...h.p, (nowMs - h.born) / 1000]),
      ripple: ripple ? [...ripple.p, (nowMs - ripple.born) / 1000] : null,
    });
    dispatchEvent(new CustomEvent('zapium:view', { detail: { ...view, z: view.z } }));
    raf = visible && !covered() && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const wake = () => {
    if (!raf && visible && !covered() && !document.hidden) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    wake();
  }).observe(el);
  document.addEventListener('visibilitychange', wake);
  new MutationObserver(wake).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  scene.frame(0, { ...view, dim: 0.86 });
  requestAnimationFrame(() => {
    el.setAttribute('data-ready', '');
    document.documentElement.classList.add('has-world');
  });
  wake();

  new MutationObserver(() => scene.colors()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-mode'],
  });
  scene.canvas.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(raf);
    el.removeAttribute('data-ready');
    document.documentElement.classList.remove('has-world');
    scene.canvas.remove();
  });
}

if (host && !prefersReducedMotion() && hasWebGL()) {
  const go = () => start(host);
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1000 });
  else setTimeout(go, 250);
}
