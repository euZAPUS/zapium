/**
 * Interacción del hero: parallax de los doodles, inclinación de la patata hacia
 * el cursor, clic en la patata (salto + chiste + chispas; muchos clics = se
 * marea), clic en doodles y chispas al aterrizar la patata en la intro.
 */
import { burst } from '../fx';
import { whenReady } from '../ready';
import { hasFinePointer, prefersReducedMotion } from '../tokens';

const hero = document.querySelector<HTMLElement>('[data-hero]');
const mascot = document.querySelector<HTMLElement>('[data-mascot]');
const bubble = document.querySelector<HTMLElement>('[data-bubble]');
const calm = prefersReducedMotion();

// ── Parallax del hero y mirada/inclinación de la patata ───────────────
if (hero && hasFinePointer() && !calm) {
  let frame = 0;
  addEventListener(
    'pointermove',
    (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2));
        hero.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2));
        if (mascot) {
          const m = mascot.getBoundingClientRect();
          const dx = (e.clientX - (m.left + m.width / 2)) / (innerWidth / 2);
          const dy = (e.clientY - (m.top + m.height / 2)) / (innerHeight / 2);
          mascot.style.setProperty('--tilt-x', String(Math.max(-1, Math.min(1, dx))));
          mascot.style.setProperty('--tilt-y', String(Math.max(-1, Math.min(1, dy))));
        }
      });
    },
    { passive: true },
  );
}

// ── Intro: al aterrizar la patata, ráfaga de chispas y saludo ─────────
if (mascot && !calm) {
  const fallMs = 150 + 0.4 * 1250; // el aterrizaje ocurre al ~38 % de la animación
  void whenReady().then(() =>
    setTimeout(() => {
      const r = mascot.getBoundingClientRect();
      burst(r.left + r.width / 2, r.bottom - r.height * 0.12, 34, 1.15);
      mascot.classList.add('is-greeting');
      setTimeout(() => mascot.classList.remove('is-greeting'), 2200);
      document
        .querySelector('.hero__inner')
        ?.animate(
          [
            { translate: '0 0' },
            { translate: '0 7px' },
            { translate: '0 -3px' },
            { translate: '0 0' },
          ],
          { duration: 380, easing: 'ease-out' },
        );
    }, fallMs),
  );
}

// ── Clic en la patata ─────────────────────────────────────────────────
if (mascot && bubble) {
  const jokes: string[] = JSON.parse(bubble.dataset.jokes ?? '[]');
  let last = -1;
  let clicks: number[] = [];
  mascot.addEventListener('click', (e) => {
    const now = performance.now();
    clicks = [...clicks.filter((t) => now - t < 1300), now];

    if (jokes.length) {
      let i = Math.floor(Math.random() * jokes.length);
      if (i === last) i = (i + 1) % jokes.length;
      last = i;
      bubble.textContent = jokes[i] ?? '';
      if (!calm) {
        bubble.classList.remove('is-new');
        void bubble.offsetWidth; // reinicia la animación
        bubble.classList.add('is-new');
      }
    }
    if (calm) return;
    const r = mascot.getBoundingClientRect();
    const px = e.clientX || r.left + r.width / 2;
    const py = e.clientY || r.top + r.height / 2;
    const dizzy = clicks.length >= 5;
    mascot.classList.remove('is-jumping', 'is-dizzy');
    void mascot.offsetWidth;
    mascot.classList.add(dizzy ? 'is-dizzy' : 'is-jumping');
    burst(px, py, dizzy ? 60 : 24, dizzy ? 1.5 : 1);
    if (dizzy) clicks = [];
  });
}

// ── Clic en doodles: explotan en chispas ──────────────────────────────
if (!calm) {
  document.querySelectorAll<HTMLElement>('[data-doodle]').forEach((d) => {
    d.addEventListener('click', () => {
      const r = d.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 18, 0.9);
      d.animate([{ scale: 1 }, { scale: 1.5, rotate: '25deg' }, { scale: 1 }], {
        duration: 450,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      });
    });
  });
}
