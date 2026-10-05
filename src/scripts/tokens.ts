/**
 * Lee tokens CSS desde JS (colores, easings, duraciones) para que el código
 * de animación use SIEMPRE los mismos valores que src/styles/tokens.css.
 */
let probe: HTMLElement | undefined;

/** Color de un token en formato [r, g, b] (0-1), ya resuelto para el tema actual. */
export function readColor(token: string): [number, number, number] {
  probe ??= Object.assign(document.createElement('span'), {
    hidden: false,
    ariaHidden: 'true',
  });
  probe.style.cssText = 'position:absolute;pointer-events:none;visibility:hidden';
  if (!probe.isConnected) document.body.append(probe);
  probe.style.color = `var(${token})`;
  const m = getComputedStyle(probe)
    .color.match(/[\d.]+/g)
    ?.map(Number) ?? [255, 255, 255];
  return [(m[0] ?? 255) / 255, (m[1] ?? 255) / 255, (m[2] ?? 255) / 255];
}

export const prefersReducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export const hasFinePointer = (): boolean =>
  matchMedia('(hover: hover) and (pointer: fine)').matches;
