/**
 * Carrusel de pantallas curvas de «Proyectos» (Works.astro + works/scene.ts).
 *  - El scroll vertical recorre las pantallas: `p` (continuo) con una pausa en cada una; la
 *    velocidad de `p` alimenta la ola del shader.
 *  - Cada pantalla es la captura del proyecto, su vídeo (se reproduce solo la activa) o un marcador
 *    [TODO] dibujado en un canvas. El texto de cada proyecto es DOM real; solo se ve el activo.
 *  - Sin WebGL, con reduced-motion o si la escena falla: la sección queda como lista apilada
 *    (el CSS solo fija la sección cuando existe `data-gl`).
 */
import { prefersReducedMotion, readColor, hasFinePointer } from '../tokens';
import type { ScreenSource, WorksScene } from './scene';

const section = document.querySelector<HTMLElement>('[data-works]');

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const css = (token: string, a = 1) => {
  const [r, g, b] = readColor(token);
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${a})`;
};

/** Marcador visible [TODO] (regla de contenido): rejilla, cruz y el texto en monoespaciada. */
function placeholder(label: string, num: number): ScreenSource {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 800;
  const g = c.getContext('2d')!;
  const mono =
    getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() ||
    'monospace';
  g.fillStyle = css('--bg-soft');
  g.fillRect(0, 0, 1280, 800);
  g.strokeStyle = css('--ink', 0.09);
  g.lineWidth = 1;
  for (let x = 0; x <= 1280; x += 80) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, 800);
    g.stroke();
  }
  for (let y = 0; y <= 800; y += 80) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(1280, y + 0.5);
    g.stroke();
  }
  g.fillStyle = css('--accent', 0.95);
  g.font = `600 30px ${mono}`;
  g.textAlign = 'center';
  g.fillText(String(num).padStart(2, '0'), 640, 330);
  g.fillStyle = css('--ink');
  g.font = `500 34px ${mono}`;
  const words = label.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 30) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => g.fillText(l, 640, 395 + i * 48));
  return { source: c, aspect: 1.6 };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(url));
    img.src = url;
  });
}

async function init(section: HTMLElement) {
  const items = [...section.querySelectorAll<HTMLElement>('[data-work]')];
  const stage = section.querySelector<HTMLElement>('[data-works-stage]');
  const counter = section.querySelector<HTMLElement>('[data-works-current]');
  const navs = [...section.querySelectorAll<HTMLButtonElement>('[data-works-go]')];
  const N = items.length;
  if (!stage || N < 2) return;

  section.dataset.gl = ''; // activa el diseño fijado (CSS); se retira si algo falla
  const coarse = matchMedia('(pointer: coarse)').matches;

  // ── Orígenes de las pantallas: marcador primero; luego póster/captura, y vídeo si lo hay ──
  const sources: ScreenSource[] = items.map((el, i) =>
    placeholder(el.dataset.ph ?? '[TODO]', i + 1),
  );
  const vids: (HTMLVideoElement | undefined)[] = [];
  const live = new Set<number>(); // pantallas que ya muestran su vídeo

  let scene: WorksScene;
  try {
    scene = (await import('./scene')).createWorksScene(sources, coarse);
  } catch (err) {
    console.warn('[works] WebGL no disponible, se usa la lista apilada', err);
    delete section.dataset.gl;
    return;
  }
  stage.prepend(scene.canvas);

  items.forEach((el, i) => {
    const img = el.dataset.img;
    const poster = el.dataset.poster;
    const video = el.dataset.video;
    const still = poster ?? img;
    if (still) {
      loadImage(still)
        .then((im) => {
          if (live.has(i)) return; // ya manda el vídeo
          scene.setSource(i, { source: im, aspect: im.naturalWidth / im.naturalHeight });
        })
        .catch(() => undefined); // se queda el marcador
    }
    if (video) {
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'none';
      v.setAttribute('aria-hidden', 'true');
      for (const [ext, type] of [
        ['webm', 'video/webm'],
        ['mp4', 'video/mp4'],
      ] as const) {
        const s = document.createElement('source');
        s.src = `${video}.${ext}`; // `video` ya es la ruta sin extensión (/videos/NOMBRE)
        s.type = type;
        v.append(s);
      }
      v.addEventListener('loadeddata', () => {
        live.add(i);
        scene.setSource(i, {
          source: v,
          aspect: (v.videoWidth || 16) / (v.videoHeight || 10),
          live: true,
        });
      });
      vids[i] = v;
    }
  });

  // ── Tamaño ──
  const resize = () => scene.resize(stage.clientWidth, stage.clientHeight);
  new ResizeObserver(resize).observe(stage);
  resize();

  // ── Estado del carrusel ──
  const ease = (f: number) => {
    const x = clamp((f - 0.28) / 0.44, 0, 1);
    return x * x * (3 - 2 * x);
  };
  let p = 0;
  let target = 0;
  let enter = 0;
  let energy = 0;
  let active = -1;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  const read = () => {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    const hp = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    const t = hp * (N - 1);
    const i = Math.min(N - 2, Math.floor(t));
    target = i + ease(t - i);
    enter = clamp(1 - r.top / innerHeight, 0, 1);
    section.style.setProperty('--hp', hp.toFixed(4));
    return r;
  };

  const setActive = (a: number) => {
    if (a === active) return;
    active = a;
    items.forEach((el, i) => {
      if (i === a) el.setAttribute('data-active', '');
      else el.removeAttribute('data-active');
    });
    navs.forEach((b, i) => b.setAttribute('aria-current', i === a ? 'true' : 'false'));
    if (counter) counter.textContent = String(a + 1).padStart(2, '0');
    section.style.setProperty('--ai', String(a));
  };

  // Vídeos: carga perezosa y solo se reproduce el activo
  const syncVideos = () => {
    vids.forEach((v, i) => {
      if (!v) return;
      const near = Math.abs(i - p) < 1.2;
      if (near && v.preload === 'none') {
        v.preload = 'auto';
        v.load();
      }
      if (Math.abs(i - p) < 0.6) v.play().catch(() => undefined);
      else v.pause();
    });
  };

  let raf = 0;
  let last = performance.now();
  let visible = true;
  const t0 = last;
  const loop = (now: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const r = read();
    visible = r.bottom > -300 && r.top < innerHeight + 300;
    // Con la sección fijada ocupa toda la pantalla y es opaca: el mundo de detrás se deja de pintar
    document.documentElement.classList.toggle(
      'is-covered',
      r.top <= 1 && r.bottom >= innerHeight - 1,
    );
    const prev = p;
    p += (target - p) * (1 - Math.exp(-dt * 6.5));
    const vel = Math.abs(p - prev) / dt;
    energy += (clamp(vel * 0.3, 0, 1) - energy) * (1 - Math.exp(-dt * 5));
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 4));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 4));
    setActive(clamp(Math.round(p), 0, N - 1));
    scene.frame((now - t0) / 1000, { p, enter, vel: energy, mouse: [mouse.x, mouse.y] });
    syncVideos();
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
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
  read();
  p = target;
  setActive(clamp(Math.round(p), 0, N - 1));
  scene.frame(0, { p, enter, vel: 0, mouse: [0, 0] });
  requestAnimationFrame(() => section.setAttribute('data-ready', ''));
  wake();

  if (hasFinePointer()) {
    addEventListener(
      'pointermove',
      (e) => {
        mouse.tx = (e.clientX / innerWidth) * 2 - 1;
        mouse.ty = (e.clientY / innerHeight) * 2 - 1;
        wake();
      },
      { passive: true },
    );
  }

  new MutationObserver(() => {
    scene.colors();
    items.forEach((el, i) => {
      if (!el.dataset.img && !el.dataset.video)
        scene.setSource(i, placeholder(el.dataset.ph ?? '[TODO]', i + 1));
    });
    wake();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });

  // ── Navegación: números, teclado y foco ──
  const goTo = (i: number) => {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    const hp = N > 1 ? clamp(i, 0, N - 1) / (N - 1) : 0;
    scrollTo({ top: scrollY + r.top + hp * total, behavior: 'smooth' });
  };
  navs.forEach((b, i) => b.addEventListener('click', () => goTo(i)));
  section.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      return;
    if (e.key === 'ArrowRight') goTo(active + 1);
    else if (e.key === 'ArrowLeft') goTo(active - 1);
  });
  section.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-work]');
    if (!el) return;
    const i = items.indexOf(el);
    if (i >= 0 && i !== active) goTo(i);
  });
}

if (section && !prefersReducedMotion() && hasWebGL()) void init(section);
