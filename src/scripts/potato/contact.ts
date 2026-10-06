/**
 * Visor 3D de «Contacto» (sustituye al nudo toroidal): la misma patata del hero en un recuadro tipo visor de modelos.
 * Se gira arrastrando (con inercia; en táctil, deslizando en horizontal), se inclina hacia el cursor y vuelve sola
 * a mirar de frente. Una lectura técnica (ROT X/Y/Z) se actualiza en vivo. Se carga al acercarse a la pantalla.
 * Sin WebGL o con reduced-motion se queda la patata 2D del recuadro.
 */
import { hasFinePointer, prefersReducedMotion } from '../tokens';
import { sfx } from '../audio';
import type { PotatoScene } from './scene';

const host = document.querySelector<HTMLElement>('[data-potato-viewer]');

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TAU = Math.PI * 2;
const deg = (r: number) => {
  const d = (((r * 180) / Math.PI + 180) % 360) - 180; // -180..180
  const v = d < -180 ? d + 360 : d;
  return `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1).padStart(5, '0')}°`;
};

async function start(host: HTMLElement) {
  const canvasHost = host.querySelector<HTMLElement>('[data-viewer-gl]');
  const body = host.querySelector<HTMLImageElement>('.mascot__body');
  const armL = host.querySelector<HTMLImageElement>('.mascot__arm--l');
  const armR = host.querySelector<HTMLImageElement>('.mascot__arm--r');
  const out = {
    x: host.querySelector<HTMLElement>('[data-rot-x]'),
    y: host.querySelector<HTMLElement>('[data-rot-y]'),
    z: host.querySelector<HTMLElement>('[data-rot-z]'),
  };
  if (!canvasHost || !body || !armL || !armR) return;
  let scene: PotatoScene;
  try {
    const [mod] = await Promise.all([
      import('./scene'),
      ...[body, armL, armR].map((img) =>
        img.complete && img.naturalWidth
          ? Promise.resolve()
          : new Promise<void>((res, rej) => {
              img.addEventListener('load', () => res(), { once: true });
              img.addEventListener('error', () => rej(new Error(img.src)), { once: true });
            }),
      ),
    ]);
    scene = mod.createPotatoScene({ body, armL, armR }, matchMedia('(pointer: coarse)').matches, {
      tunnel: false,
    });
  } catch (err) {
    console.warn('[potato] visor sin WebGL, se queda la patata 2D', err);
    return;
  }
  canvasHost.append(scene.canvas);

  const size = { w: 1, h: 1 };
  const resize = () => {
    const r = canvasHost.getBoundingClientRect();
    size.w = Math.max(1, r.width);
    size.h = Math.max(1, r.height);
    scene.resize(size.w, size.h);
  };
  new ResizeObserver(resize).observe(canvasHost);
  resize();
  host.dataset.ready = '';

  // ── Estado: giro por arrastre con inercia + inclinación hacia el cursor ──
  let yaw = -0.5; // entra ligeramente girada y se asienta de frente
  let pitch = 0;
  let vyaw = 0;
  let vpitch = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastMove = 0;
  const hover = { x: 0, y: 0 };
  let hoverT = { x: 0, y: 0 };
  let kick = -10;
  const t0 = performance.now();

  canvasHost.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    vyaw = 0;
    vpitch = 0;
    canvasHost.setPointerCapture(e.pointerId);
    host.dataset.dragging = '';
    wake();
  });
  canvasHost.addEventListener('pointermove', (e) => {
    if (hasFinePointer()) {
      const r = canvasHost.getBoundingClientRect();
      hoverT = {
        x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
        y: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
      };
    }
    if (!dragging) {
      wake();
      return;
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yaw += dx * 0.011;
    pitch = clamp(pitch + dy * 0.008, -0.7, 0.7);
    vyaw = dx * 0.011 * 60;
    vpitch = dy * 0.008 * 60;
    lastMove = performance.now();
    wake();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    delete host.dataset.dragging;
    if (performance.now() - lastMove > 90) {
      vyaw = 0;
      vpitch = 0;
    }
    wake();
  };
  canvasHost.addEventListener('pointerup', release);
  canvasHost.addEventListener('pointercancel', release);
  canvasHost.addEventListener('pointerleave', () => {
    hoverT = { x: 0, y: 0 };
    wake();
  });
  canvasHost.addEventListener('dblclick', () => {
    kick = (performance.now() - t0) / 1000;
    sfx.boing();
    wake();
  });

  let raf = 0;
  let last = performance.now();
  let visible = true;
  let outT = 0;
  const loop = (now: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const time = (now - t0) / 1000;
    if (!dragging) {
      yaw += vyaw * dt;
      pitch = clamp(pitch + vpitch * dt, -0.7, 0.7);
      vyaw *= Math.exp(-dt * 2.6);
      vpitch *= Math.exp(-dt * 4);
      // Reposo: vuelve despacio a mirar de frente (al múltiplo de 2π más cercano) y la inclinación a 0
      if (Math.abs(vyaw) < 0.25 && now - lastMove > 1200) {
        const target = Math.round(yaw / TAU) * TAU;
        yaw += (target - yaw) * (1 - Math.exp(-dt * 1.4));
        pitch += (0 - pitch) * (1 - Math.exp(-dt * 1.4));
      }
    }
    hover.x += (hoverT.x - hover.x) * (1 - Math.exp(-dt * 5));
    hover.y += (hoverT.y - hover.y) * (1 - Math.exp(-dt * 5));
    const k = clamp((time - kick) / 1.1, 0, 1);
    const spin = (1 - Math.pow(1 - k, 4)) * TAU;
    const rotY = yaw + hover.x * 0.32 + Math.sin(time * 0.6) * 0.07 - (k < 1 ? spin : 0);
    const rotX = pitch + hover.y * 0.2 + Math.sin(time * 0.8) * 0.025;
    const rotZ = -hover.x * 0.03;
    scene.frame({
      time,
      x: size.w * 0.5,
      y: size.h * 0.5 + Math.sin(time * 1.1) * size.h * 0.012,
      size: Math.min(size.w * 1.02, size.h * 2.2),
      scale: 1,
      rotX,
      rotY,
      rotZ,
      iris: 0,
      flow: 0,
      fade: 0,
      dim: 0,
      mouse: [0, 0],
      sway: dragging ? 1 : Math.min(1, Math.abs(vyaw) * 0.2),
    });
    if (now - outT > 90) {
      outT = now;
      if (out.x) out.x.textContent = deg(rotX);
      if (out.y) out.y.textContent = deg(rotY);
      if (out.z) out.z.textContent = deg(rotZ);
    }
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  function wake() {
    if (!raf && visible && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    wake();
  }).observe(host);
  document.addEventListener('visibilitychange', wake);
  new MutationObserver(() => {
    scene.colors();
    wake();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  wake();
}

if (host && !prefersReducedMotion() && hasWebGL()) {
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          obs.unobserve(e.target);
          void start(e.target as HTMLElement);
        }
      }
    },
    { rootMargin: '400px' },
  );
  io.observe(host);
}
