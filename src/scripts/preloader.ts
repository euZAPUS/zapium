export {}; // módulo (evita colisiones de nombres con otros scripts)
/**
 * Carga a modo de plano. Las líneas se dibujan solas (CSS); aquí van el texto que
 * se «descifra», el contador (progreso real: espera a fuentes y `load`) y la salida
 * con persiana. Se puede saltar con clic o teclado. Hay un límite de seguridad por
 * si algo no termina de cargar.
 */
const root = document.querySelector<HTMLElement>('[data-preloader]');
const html = document.documentElement;

if (root && html.classList.contains('is-loading')) {
  const count = root.querySelector<HTMLElement>('[data-pre-count]');
  const line1 = root.querySelector<HTMLElement>('[data-pre-line1]');
  const line2 = root.querySelector<HTMLElement>('[data-pre-line2]');
  const GLYPHS = '#$%&*+<>/=_ABCDEFGHJKLMNPRSTUVXYZ0123456789';
  const MIN_MS = 3300;
  const MAX_MS = 9000;
  const t0 = performance.now();
  let loaded = false;
  let finished = false;
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

  const decode = (el: HTMLElement | null, delay: number, duration: number) => {
    if (!el) return;
    const text = el.dataset.text ?? '';
    const start = performance.now() + delay;
    const tick = (now: number) => {
      if (finished) return;
      const k = (now - start) / duration;
      if (k >= 0) {
        const done = Math.floor(Math.min(1, k) * text.length);
        let tail = '';
        for (let i = done; i < Math.min(text.length, done + 7); i++) {
          tail += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = text.slice(0, done) + (k < 1 ? tail : '');
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  decode(line1, 900, 1000);
  decode(line2, 1800, 1300);

  const finish = () => {
    if (finished) return;
    finished = true;
    if (count) count.textContent = '100';
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

  const loop = (now: number) => {
    if (finished) return;
    const elapsed = now - t0;
    let p = Math.min(elapsed / MIN_MS, 1);
    p = 1 - Math.pow(1 - p, 2.2);
    if (!loaded) p = Math.min(p, 0.92);
    if (count) count.textContent = String(Math.round(p * 100)).padStart(3, '0');
    if ((p >= 1 && loaded && elapsed >= MIN_MS) || elapsed > MAX_MS) finish();
    else requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  root.addEventListener('click', finish);
  addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'Escape'].includes(e.key)) finish();
  });
}
