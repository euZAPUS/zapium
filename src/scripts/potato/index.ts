/**
 * Hero 3D: la patata en WebGL (scene.ts) gira con el scroll y, mientras el hero está fijado, una «otra dimensión»
 * (túnel cebra) se abre como un iris desde ella; al final la patata se cuela por el túnel y el hero da paso a
 * «Proyectos». Con el cursor la patata se inclina; el clic (o 5 seguidos) la hace girar.
 * Sin WebGL, con reduced-motion o si algo falla, el hero se queda como estaba (la patata 2D y todo apilado).
 * El texto del hero es DOM real: aquí solo se escribe `--hp` y la visibilidad de la copia.
 */
import { prefersReducedMotion, hasFinePointer } from '../tokens';
import { whenReady } from '../ready';
import { ping } from '../ping';
import type { PotatoScene } from './scene';

const hero = document.querySelector<HTMLElement>('[data-hero]');
const host = hero?.querySelector<HTMLElement>('[data-hero-gl]');
const mascot = hero?.querySelector<HTMLElement>('.mascot[data-mascot]');
const mascotBody = hero?.querySelector<HTMLImageElement>('.mascot__body');
const mascotArmL = hero?.querySelector<HTMLImageElement>('.mascot__arm--l');
const mascotArmR = hero?.querySelector<HTMLImageElement>('.mascot__arm--r');

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 4);
const easeInOut = (x: number) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function loaded(img: HTMLImageElement): Promise<HTMLImageElement> {
  return img.complete && img.naturalWidth
    ? Promise.resolve(img)
    : new Promise((resolve, reject) => {
        img.addEventListener('load', () => resolve(img), { once: true });
        img.addEventListener('error', () => reject(new Error(img.src)), { once: true });
      });
}

/** Posición del pivote (centro del cuerpo) dentro de la caja de la imagen (1506×549): 852,5 / 274 */
const PIVOT_FRAC: [number, number] = [852.5 / 1506, 274 / 549];

async function init(hero: HTMLElement, host: HTMLElement, mascot: HTMLElement) {
  if (!mascotBody || !mascotArmL || !mascotArmR) return;
  let scene: PotatoScene;
  try {
    const [mod, body, armL, armR] = await Promise.all([
      import('./scene'),
      loaded(mascotBody),
      loaded(mascotArmL),
      loaded(mascotArmR),
    ]);
    scene = mod.createPotatoScene({ body, armL, armR }, matchMedia('(pointer: coarse)').matches);
  } catch (err) {
    console.warn('[potato] WebGL no disponible, se queda la patata 2D', err);
    return;
  }
  host.append(scene.canvas);
  hero.dataset.gl = ''; // activa el diseño fijado (CSS); se retira si algo falla

  // ── Medidas (relativas al lienzo; el escenario no se mueve mientras el hero está fijado) ──
  const layout = { x: 0, y: 0, size: 1, w: 1, h: 1 };
  const measure = () => {
    const hr = host.getBoundingClientRect();
    const mr = mascot.getBoundingClientRect();
    layout.w = Math.max(1, hr.width);
    layout.h = Math.max(1, hr.height);
    layout.size = Math.max(1, mr.width);
    layout.x = mr.left - hr.left + mr.width * PIVOT_FRAC[0];
    layout.y = mr.top - hr.top + mr.height * PIVOT_FRAC[1];
    scene.resize(layout.w, layout.h);
  };
  new ResizeObserver(measure).observe(host);
  new ResizeObserver(measure).observe(mascot);
  measure();

  // ── Estado ──
  const look = { x: 0, y: 0, tx: 0, ty: 0 }; // cursor respecto a la patata (-1..1)
  const mouse = { x: 0, y: 0 };
  let hop = -10; // instante del último clic (para el giro)
  let hopPower = 1;
  let sway = 0;
  let intro = 0; // 0 → 1 al aparecer la patata
  let introStart = -1;
  let p = 0; // progreso del hero fijado (0-1), suavizado
  let pTarget = 0;
  const t0 = performance.now();

  const readScroll = () => {
    const r = hero.getBoundingClientRect();
    const total = r.height - innerHeight;
    pTarget = total > 0 ? clamp(-r.top / total) : 0;
    return r;
  };

  void whenReady().then(() => {
    introStart = performance.now();
    setTimeout(() => {
      const hr = host.getBoundingClientRect();
      ping(hr.left + layout.x, hr.top + layout.y, 240);
    }, 1500);
    wake();
  });
  if (!document.documentElement.classList.contains('is-loading')) introStart = performance.now();

  if (hasFinePointer()) {
    addEventListener(
      'pointermove',
      (e) => {
        const hr = host.getBoundingClientRect();
        look.tx = clamp((e.clientX - (hr.left + layout.x)) / (innerWidth * 0.5), -1, 1);
        look.ty = clamp((e.clientY - (hr.top + layout.y)) / (innerHeight * 0.5), -1, 1);
        mouse.x = (e.clientX / innerWidth) * 2 - 1;
        mouse.y = (e.clientY / innerHeight) * 2 - 1;
        wake();
      },
      { passive: true },
    );
  }
  addEventListener('potato:hop', ((e: CustomEvent<{ dizzy: boolean }>) => {
    hop = (performance.now() - t0) / 1000;
    hopPower = e.detail?.dizzy ? 2 : 1;
    sway = 1;
    wake();
  }) as EventListener);

  // ── Bucle ──
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const time = (now - t0) / 1000;
    const r = readScroll();
    const onScreen = r.bottom > 0 && r.top < innerHeight;
    p += (pTarget - p) * (1 - Math.exp(-dt * 7));
    look.x += (look.tx - look.x) * (1 - Math.exp(-dt * 5));
    look.y += (look.ty - look.y) * (1 - Math.exp(-dt * 5));
    sway *= Math.exp(-dt * 1.6);
    if (introStart >= 0) intro = clamp((now - introStart) / 1700);
    else intro = 0;

    // Fases de la secuencia (p: 0 = hero; 1 = entra en «Proyectos»)
    const toCenter = smooth(0.0, 0.42, p); // la patata va al centro y crece
    const dive = smooth(0.6, 0.95, p); // se cuela por el túnel
    const iris = Math.pow(smooth(0.1, 0.66, p), 1.25) * 2.4;
    const spinP = easeInOut(clamp(p / 0.75)); // dos vueltas y media mientras se abre
    const kick = clamp((time - hop) / (hopPower > 1 ? 1.6 : 1.0));
    const kickAngle = -(1 - easeOut(kick)) * Math.PI * 2 * hopPower;
    const introSpin = (1 - easeOut(intro)) * Math.PI * 2.5;
    const bob = Math.sin(time * 1.1) * 0.012 * layout.h;
    const cx = lerp(layout.x, layout.w * 0.5, toCenter);
    const cy = lerp(layout.y, layout.h * 0.5, toCenter) + bob * (1 - toCenter);
    const size = lerp(
      layout.size,
      Math.min(layout.w * (layout.w < 700 ? 1.25 : 0.95), layout.h * 1.45),
      toCenter,
    );
    const shrink = 1 - dive * 0.985;
    const scale = (0.02 + 0.98 * easeOut(intro)) * shrink;
    const dim = smooth(0.12, 0.5, p);

    scene.frame({
      time,
      x: cx,
      y: cy,
      size,
      scale,
      rotX: look.y * 0.22 + Math.sin(time * 0.7) * 0.03 + toCenter * 0.12,
      rotY:
        look.x * 0.5 + spinP * Math.PI * 5 + kickAngle + introSpin + Math.sin(time * 0.5) * 0.06,
      rotZ: -look.x * 0.04 + dive * 0.8,
      iris,
      flow: p * 26 + time * 0.5,
      fade: smooth(0.88, 1.0, p),
      dim,
      mouse: [mouse.x, mouse.y],
      sway: clamp(sway),
    });

    // Texto: se desvanece pronto; el mundo de fondo se deja de pintar cuando el túnel lo tapa
    const copy = 1 - smooth(0.04, 0.26, p);
    hero.style.setProperty('--hp', p.toFixed(4));
    hero.style.setProperty('--copy', copy.toFixed(3));
    hero.style.setProperty('--dim', smooth(0.3, 0.5, p) * (1 - smooth(0.78, 0.92, p)) + '');
    hero.toggleAttribute('data-away', copy < 0.02);
    document.documentElement.classList.toggle(
      'is-covered',
      r.top <= 1 && r.bottom >= innerHeight - 1 && iris > 1.6,
    );

    // Mientras el hero está a la vista se pinta siempre (la patata respira y los brazos se mecen)
    raf = onScreen && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const wake = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', wake, { passive: true });
  document.addEventListener('visibilitychange', wake);
  readScroll();
  p = pTarget;
  wake();

  new MutationObserver(() => {
    scene.colors();
    wake();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
}

if (hero && host && mascot && !prefersReducedMotion() && hasWebGL()) {
  void init(hero, host, mascot);
}
