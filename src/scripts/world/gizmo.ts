/** Gizmo de ejes tipo Blender: sigue la vista de la cámara del mundo (evento `zapium:view`). */
export {};

const gizmo = document.querySelector<HTMLElement>('[data-gizmo]');
const zText = document.querySelector<HTMLElement>('[data-view-z]');

if (gizmo) {
  const R = 36; // radio de los ejes (unidades del viewBox)
  const BASE_YAW = -0.62; // vista por defecto «en perspectiva», como el visor de Blender
  const BASE_PITCH = 0.42;
  const parts = {
    x: { v: [1, 0, 0] },
    y: { v: [0, 1, 0] },
    z: { v: [0, 0, 1] },
  } as const;

  const els = Object.keys(parts).map((id) => {
    const g = gizmo.querySelector<SVGGElement>(`[data-axis="${id}"]`);
    return {
      id: id as keyof typeof parts,
      line: g?.querySelector<SVGLineElement>('.gizmo__line'),
      pos: g?.querySelector<SVGCircleElement>('.gizmo__pos'),
      neg: g?.querySelector<SVGCircleElement>('.gizmo__neg'),
      txt: g?.querySelector<SVGTextElement>('.gizmo__txt'),
      g,
    };
  });

  addEventListener('zapium:view', (e) => {
    const { yaw, pitch, roll, z } = (
      e as CustomEvent<{ yaw: number; pitch: number; roll: number; z: number }>
    ).detail;
    const cy = Math.cos(BASE_YAW + yaw * 3);
    const sy = Math.sin(BASE_YAW + yaw * 3);
    const cp = Math.cos(BASE_PITCH + pitch * 3);
    const sp = Math.sin(BASE_PITCH + pitch * 3);
    const cr = Math.cos(roll * 4);
    const sr = Math.sin(roll * 4);
    // R = Rz(roll) · Rx(pitch) · Ry(yaw)
    const rot = ([x, y, zz]: readonly [number, number, number]) => {
      const x1 = cy * x + sy * zz;
      const z1 = -sy * x + cy * zz;
      const y2 = cp * y - sp * z1;
      const z2 = sp * y + cp * z1;
      return [cr * x1 - sr * y2, sr * x1 + cr * y2, z2] as const;
    };
    // De atrás hacia delante: los ejes que miran al visor se pintan encima
    const order = els
      .map((el) => ({ el, r: rot(parts[el.id].v as unknown as [number, number, number]) }))
      .sort((a, b) => a.r[2] - b.r[2]);
    for (const { el, r } of order) {
      const [x, y, depth] = r;
      const sx = x * R;
      const sy2 = -y * R;
      el.line?.setAttribute('x2', sx.toFixed(1));
      el.line?.setAttribute('y2', sy2.toFixed(1));
      el.line?.setAttribute('x1', '0');
      el.line?.setAttribute('y1', '0');
      el.pos?.setAttribute('cx', sx.toFixed(1));
      el.pos?.setAttribute('cy', sy2.toFixed(1));
      el.txt?.setAttribute('x', sx.toFixed(1));
      el.txt?.setAttribute('y', sy2.toFixed(1));
      el.neg?.setAttribute('cx', (-sx).toFixed(1));
      el.neg?.setAttribute('cy', (-sy2).toFixed(1));
      el.g?.style.setProperty('opacity', String(0.62 + 0.38 * ((depth + 1) / 2)));
      if (el.g?.parentNode) el.g.parentNode.appendChild(el.g); // orden de dibujo
    }
    if (zText) zText.textContent = `Z ${z.toFixed(2)}`;
  });
}
