/**
 * Carga a modo de plano, GOBERNADA POR EL SCROLL: el dibujo avanza al hacer scroll
 * (rueda, flechas/espacio/AvPág, gesto táctil) y llega al 100 % cuando el visitante
 * ha scrolleado lo suficiente Y la página ya cargó de verdad (fuentes + `load`).
 * Primero, aviso de sonido (opt-in, se recuerda). Cada avance suena como un diente
 * de rueda. Esc o el botón «Saltar» la omiten.
 */
import { sfx, sound } from './audio';

const root = document.querySelector<HTMLElement>('[data-preloader]');
const html = document.documentElement;

if (root && html.classList.contains('is-loading')) {
  const count = root.querySelector<HTMLElement>('[data-pre-count]');
  const line1 = root.querySelector<HTMLElement>('[data-pre-line1]');
  const line2 = root.querySelector<HTMLElement>('[data-pre-line2]');
  const prompt = root.querySelector<HTMLElement>('[data-pre-prompt]');
  const GLYPHS = '#$%&*+<>/=_ABCDEFGHJKLMNPRSTUVXYZ0123456789';
  const WHEEL_PX = 2600; // px de rueda necesarios para llegar al 100 %
  const TIMELINE = 3.1; // duración del dibujo original, en «segundos de diseño»

  let loaded = false;
  let finished = false;
  let target = 0; // progreso pedido por el visitante (0-1)
  let p = 0; // progreso mostrado (suavizado)
  let lastTickAt = 0;
  let lastInput = performance.now();

  // En pantallas verticales el dibujo se ve ENTERO (meet) en vez de recortado por los lados (slice)
  if (innerHeight > innerWidth)
    root.querySelector('.pre__svg')?.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // En táctil no hay tecla Esc: el botón dice solo «Saltar»
  if (matchMedia('(pointer: coarse)').matches) {
    const skip = root.querySelector('[data-pre-skip]');
    if (skip) skip.textContent = (skip.textContent ?? '').replace(/\s*\(Esc\)/, '');
  }

  // Mientras dura la carga, el resto de la página no recibe foco ni lectores de pantalla
  const behind = document.querySelectorAll<HTMLElement>('.skip-link, header, main, footer');
  behind.forEach((el) => (el.inert = true));

  Promise.all([
    document.fonts.ready,
    new Promise<void>((r) =>
      document.readyState === 'complete'
        ? r()
        : addEventListener('load', () => r(), { once: true }),
    ),
  ]).then(() => (loaded = true));

  // ── Elementos del dibujo: cada uno con inicio y duración en unidades de progreso ──
  const parse = (el: Element, key: '--d' | '--t', fallback: number) => {
    const m = el.getAttribute('style')?.match(new RegExp(`${key}:([\\d.]+)s`));
    return m ? parseFloat(m[1] ?? '') : fallback;
  };
  const draws = [...root.querySelectorAll<SVGGeometryElement>('.draw')].map((el) => ({
    el,
    start: parse(el, '--d', 0) / TIMELINE,
    dur: parse(el, '--t', 1.2) / TIMELINE,
  }));
  const fades = [...root.querySelectorAll<SVGElement>('.fade')].map((el) => ({
    el,
    start: parse(el, '--d', 0) / TIMELINE,
    dur: 0.04,
  }));
  const fadeBase = new Map(fades.map(({ el }) => [el, 1]));

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const ease = (v: number) => 1 - Math.pow(1 - clamp01(v), 2.4);

  const decode = (el: HTMLElement | null, k: number) => {
    if (!el) return;
    const text = el.dataset.text ?? '';
    if (k <= 0) {
      el.textContent = '';
      return;
    }
    const done = Math.floor(clamp01(k) * text.length);
    let tail = '';
    if (k < 1) {
      for (let i = done; i < Math.min(text.length, done + 7); i++) {
        tail += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    el.textContent = text.slice(0, done) + tail;
  };

  const render = () => {
    for (const d of draws) {
      d.el.style.strokeDashoffset = String(1 - ease((p - d.start) / d.dur));
    }
    for (const f of fades)
      f.el.style.opacity = String(clamp01((p - f.start) / f.dur) * (fadeBase.get(f.el) ?? 1));
    decode(line1, (p - 0.3) / 0.3);
    decode(line2, (p - 0.55) / 0.35);
    if (count) count.textContent = String(Math.round(p * 100)).padStart(3, '0');
  };

  // ── Entrada del visitante ──
  const advance = (delta: number) => {
    if (finished || root.dataset.state !== 'scroll') return;
    target = clamp01(target + delta);
    lastInput = performance.now();
    root.setAttribute('data-engaged', '');
  };
  addEventListener('wheel', (e) => advance(e.deltaY / WHEEL_PX), { passive: true });
  let touchY = 0;
  addEventListener('touchstart', (e) => (touchY = e.touches[0]?.clientY ?? 0), { passive: true });
  addEventListener(
    'touchmove',
    (e) => {
      const y = e.touches[0]?.clientY ?? touchY;
      advance((touchY - y) / 900);
      touchY = y;
    },
    { passive: true },
  );
  addEventListener('keydown', (e) => {
    if (finished) return;
    if (e.key === 'Escape') return finish();
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      if (root.dataset.state === 'scroll' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        advance(e.key === 'ArrowDown' ? 0.07 : 0.2);
      }
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) advance(e.key === 'ArrowUp' ? -0.07 : -0.2);
  });
  root.querySelector('[data-pre-skip]')?.addEventListener('click', () => finish());

  // ── Aviso de sonido ──
  const startScroll = () => {
    root.dataset.state = 'scroll';
    lastInput = performance.now();
  };
  root.querySelectorAll<HTMLButtonElement>('[data-pre-sound]').forEach((b) =>
    b.addEventListener('click', () => {
      sound.set(b.dataset.preSound === 'on');
      if (sound.on) sfx.click();
      startScroll();
    }),
  );
  if (sound.saved) {
    // Ya eligió en otra visita: no se vuelve a preguntar
    if (sound.saved === 'on') sound.set(true, false);
    prompt?.setAttribute('hidden', '');
    startScroll();
  } else {
    root.querySelector<HTMLButtonElement>('[data-pre-sound="on"]')?.focus();
  }

  const finish = () => {
    if (finished) return;
    finished = true;
    p = 1;
    render();
    sfx.chime();
    html.classList.add('is-exiting');
    root.classList.add('is-done');
    // La intro del hero arranca con la persiana a medio abrir
    setTimeout(() => {
      behind.forEach((el) => (el.inert = false));
      html.classList.remove('is-loading');
      dispatchEvent(new Event('zapium:ready'));
    }, 450);
    setTimeout(() => {
      html.classList.remove('is-exiting');
      root.remove();
    }, 1500);
    try {
      sessionStorage.setItem('zapium-intro', '1');
    } catch {
      /* sin sessionStorage: la carga se repetirá en la próxima visita */
    }
  };

  const loop = () => {
    if (finished) return;
    // Hasta que la página no haya cargado de verdad, el progreso no pasa del 92 %
    const cap = loaded ? 1 : 0.92;
    const goal = Math.min(target, cap);
    p += (goal - p) * 0.09;
    if (Math.abs(goal - p) < 0.0004) p = goal;
    // un diente de rueda por cada ~1,6 % de avance
    if (Math.abs(p - lastTickAt) >= 0.016) {
      lastTickAt = p;
      sfx.tick(0.55);
    }
    render();
    if (p >= 0.999 && loaded) return finish();
    // Si nadie toca nada durante un rato, la pista late más fuerte
    root.toggleAttribute('data-idle', performance.now() - lastInput > 5000);
    requestAnimationFrame(loop);
  };
  render();
  requestAnimationFrame(loop);
}
