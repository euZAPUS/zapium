/**
 * Cursor personalizado base (anillo con brillo + punto). Solo con puntero fino
 * y sin prefers-reduced-motion; en táctil o con reduced-motion no se activa y
 * se conserva el cursor nativo. El efecto magnético, la mano y los estados de
 * vídeo/arrastre llegan en la fase 3.
 */
import { hasFinePointer, prefersReducedMotion } from './tokens';

const root = document.querySelector<HTMLElement>('[data-cursor-root]');

if (root && hasFinePointer() && !prefersReducedMotion()) {
  const ring = root.querySelector<HTMLElement>('.cursor__ring');
  const dot = root.querySelector<HTMLElement>('.cursor__dot');
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let rx = x;
  let ry = y;
  let raf = 0;

  const loop = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    if (dot) dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = requestAnimationFrame(loop);
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!document.documentElement.classList.contains('has-cursor')) {
        rx = x;
        ry = y;
        document.documentElement.classList.add('has-cursor');
        raf = requestAnimationFrame(loop);
      }
      const hot = (e.target as Element | null)?.closest('a, button, [data-cursor]');
      root.dataset.state = hot ? 'link' : '';
    },
    { passive: true },
  );
  addEventListener('pointerdown', () => (root.dataset.state = 'down'));
  addEventListener('pointerup', () => (root.dataset.state = ''));
  document.addEventListener('mouseleave', () =>
    document.documentElement.classList.remove('has-cursor'),
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (document.documentElement.classList.contains('has-cursor'))
      raf = requestAnimationFrame(loop);
  });
}
