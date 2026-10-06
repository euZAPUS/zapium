/**
 * «Ping»: un anillo fino que se expande y se desvanece desde un punto (clic, aterrizaje de la patata).
 * Sustituye a las chispas de la etapa anterior: un solo elemento, animado con WAAPI, sin lienzo ni bucle.
 * Con prefers-reduced-motion no hace nada.
 */
import { prefersReducedMotion } from './tokens';

export function ping(x: number, y: number, size = 72) {
  if (prefersReducedMotion()) return;
  const el = document.createElement('span');
  el.className = 'ping';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
  document.body.append(el);
  const done = () => el.remove();
  el.animate(
    [
      { scale: 0.15, opacity: 0.9 },
      { scale: 1, opacity: 0 },
    ],
    { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  ).finished.then(done, done);
}
