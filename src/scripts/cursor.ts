/**
 * Cursor: una mano naranja (como la patata) que sigue al puntero con un poco de
 * retraso, con resplandor y estela de chispas. Se inclina según la velocidad,
 * crece sobre lo clicable y se encoge al pulsar. Solo con puntero fino y sin
 * prefers-reduced-motion; en táctil o con menos movimiento queda el cursor nativo.
 */
import { burst, trail } from './fx';
import { hasFinePointer, prefersReducedMotion } from './tokens';

const root = document.querySelector<HTMLElement>('[data-cursor-root]');

if (root && hasFinePointer() && !prefersReducedMotion()) {
  const glow = root.querySelector<HTMLElement>('.cursor__glow');
  const hand = root.querySelector<HTMLElement>('.cursor__hand');
  const html = document.documentElement;
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let hx = x;
  let hy = y;
  let gx = x;
  let gy = y;
  let trailDist = 0;
  let lastX = x;
  let lastY = y;
  let raf = 0;

  const loop = () => {
    const vx = x - hx;
    hx += vx * 0.42;
    hy += (y - hy) * 0.42;
    gx += (x - gx) * 0.16;
    gy += (y - gy) * 0.16;
    if (hand) {
      hand.style.translate = `${hx}px ${hy}px`; // `translate` (no `transform`): rotate/scale se componen bien con él
      hand.style.rotate = `${Math.max(-22, Math.min(22, vx * 0.9))}deg`;
    }
    if (glow) glow.style.translate = `${gx}px ${gy}px`;
    raf = requestAnimationFrame(loop);
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!html.classList.contains('has-cursor')) {
        hx = gx = lastX = x;
        hy = gy = lastY = y;
        html.classList.add('has-cursor');
        raf = requestAnimationFrame(loop);
      }
      const d = Math.hypot(x - lastX, y - lastY);
      trailDist += d;
      lastX = x;
      lastY = y;
      if (trailDist > 22) {
        trailDist = 0;
        trail(x, y, d);
      }
      const hot = (e.target as Element | null)?.closest('a, button, [data-cursor], [data-doodle]');
      root.dataset.state = hot ? 'link' : '';
    },
    { passive: true },
  );
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    root.dataset.state = 'down';
    burst(e.clientX, e.clientY, 12, 0.8);
  });
  addEventListener('pointerup', () => (root.dataset.state = ''));
  document.addEventListener('mouseleave', () => html.classList.remove('has-cursor'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (html.classList.contains('has-cursor') && !raf) raf = requestAnimationFrame(loop);
  });
}
