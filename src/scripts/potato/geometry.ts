/**
 * Geometría de la patata 3D: «losa» extruida con bordes redondeados a partir del contorno de cada capa del
 * dibujo original (outlines.json, lo genera scripts/make-potato-outlines.mjs). La cara frontal y la trasera son
 * planas (llevan el dibujo como textura); el canto y el bisel son lisos y con normales suaves.
 * Código puro (sin OGL ni DOM) para poder probarlo con node --test.
 *
 * Coordenadas del modelo: unidades = px de la capa × `scale`, con el origen en `pivot` y la Y hacia arriba.
 */
export type Pt = [number, number];

export interface SlabOptions {
  /** Capa de la que sale el contorno: puntos en px de la imagen (y hacia abajo). */
  outline: Pt[];
  /** Tamaño de la imagen (para la textura) y pivote del modelo, en px. */
  size: Pt;
  pivot: Pt;
  /** px → unidades del modelo (p. ej. 1/1506: el ancho de la imagen mide 1). */
  scale: number;
  /** Semigrosor (z va de -depth a +depth), en px de la imagen. */
  depth: number;
  /** Radio del bisel, en px (≤ depth). Con bevel = depth el canto es un semicírculo. */
  bevel: number;
  /** Pasos del bisel (más = más suave). */
  steps?: number;
}

export interface SlabMesh {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  index: Uint16Array | Uint32Array;
}

const signedArea = (p: Pt[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i]!;
    const [x2, y2] = p[(i + 1) % p.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

/** Triangula un polígono simple en sentido antihorario (recorte de orejas). Devuelve índices de 3 en 3. */
export function triangulate(poly: Pt[]): number[] {
  const n = poly.length;
  const idx = poly.map((_, i) => i);
  const out: number[] = [];
  const cross = (a: Pt, b: Pt, c: Pt) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p: Pt, a: Pt, b: Pt, c: Pt) =>
    cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  let i = 0;
  while (idx.length > 3 && guard++ < n * n + 10) {
    const m = idx.length;
    i %= m;
    let found = -1;
    for (let k = 0; k < m && found < 0; k++) {
      const j = (i + k) % m;
      const i0 = idx[(j + m - 1) % m]!;
      const i1 = idx[j]!;
      const i2 = idx[(j + 1) % m]!;
      const a = poly[i0]!;
      const b = poly[i1]!;
      const c = poly[i2]!;
      if (cross(a, b, c) <= 1e-9) continue; // cóncavo o degenerado
      let ear = true;
      for (const q of idx) {
        if (q === i0 || q === i1 || q === i2) continue;
        if (inside(poly[q]!, a, b, c)) {
          ear = false;
          break;
        }
      }
      if (ear) found = j;
    }
    if (found < 0) {
      // Contorno casi degenerado: se recorta el vértice más convexo para no atascarse
      let best = -Infinity;
      for (let j = 0; j < m; j++) {
        const c = cross(poly[idx[(j + m - 1) % m]!]!, poly[idx[j]!]!, poly[idx[(j + 1) % m]!]!);
        if (c > best) {
          best = c;
          found = j;
        }
      }
    }
    const m2 = idx.length;
    out.push(idx[(found + m2 - 1) % m2]!, idx[found]!, idx[(found + 1) % m2]!);
    idx.splice(found, 1);
    i = found;
  }
  out.push(idx[0]!, idx[1]!, idx[2]!);
  return out;
}

export function buildSlab(opt: SlabOptions): SlabMesh {
  const { size, pivot, scale, depth, bevel } = opt;
  const steps = opt.steps ?? 6;
  // A espacio del modelo (y hacia arriba) y sentido antihorario visto desde +z
  let pts: Pt[] = opt.outline.map(([x, y]) => [(x - pivot[0]) * scale, -(y - pivot[1]) * scale]);
  if (signedArea(pts) < 0) pts = pts.reverse();
  const N = pts.length;
  const h = depth * scale;
  const b = Math.min(bevel, depth) * scale;

  // Normales 2D: por arista (hacia fuera = a la derecha del sentido de giro) y por vértice (media)
  const edgeN: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % N]!;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1;
    edgeN.push([dy / l, -dx / l]);
  }
  const vertN: Pt[] = [];
  const miter: number[] = []; // factor para que el desplazamiento hacia dentro conserve la distancia a las dos aristas
  for (let i = 0; i < N; i++) {
    const a = edgeN[(i + N - 1) % N]!;
    const c = edgeN[i]!;
    let nx = a[0] + c[0];
    let ny = a[1] + c[1];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    vertN.push([nx, ny]);
    miter.push(1 / Math.max(0.55, nx * c[0] + ny * c[1]));
  }

  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    position.push(x, y, z);
    normal.push(nx, ny, nz);
    // textura: coordenadas de la imagen original (y arriba en v)
    uv.push(x / scale / size[0] + pivot[0] / size[0], 1 - (-y / scale + pivot[1]) / size[1]);
  };

  // Anillos del canto: de la cara trasera a la delantera. Cada anillo = (inset, z, ángulo del bisel, signo)
  type Ring = { inset: number; z: number; cos: number; sin: number };
  const front: Ring[] = [];
  for (let k = 0; k <= steps; k++) {
    const th = (k / steps) * (Math.PI / 2);
    front.push({
      inset: b * (1 - Math.cos(th)),
      z: h - b + b * Math.sin(th),
      cos: Math.cos(th),
      sin: Math.sin(th),
    });
  }
  const back: Ring[] = front.map((r) => ({ ...r, z: -r.z, sin: -r.sin })).reverse();
  const rings = [...back, ...front];
  const ringXY: Pt[][] = [];
  for (const r of rings) {
    const xy: Pt[] = [];
    for (let i = 0; i < N; i++) {
      const p = pts[i]!;
      const n = vertN[i]!;
      const d = r.inset * miter[i]!;
      const px = p[0] - n[0] * d;
      const py = p[1] - n[1] * d;
      xy.push([px, py]);
      push(px, py, r.z, n[0] * r.cos, n[1] * r.cos, r.sin);
    }
    ringXY.push(xy);
  }
  const index: number[] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < N; i++) {
      const a = r * N + i;
      const bb = r * N + ((i + 1) % N);
      const c = (r + 1) * N + i;
      const d = (r + 1) * N + ((i + 1) % N);
      index.push(a, bb, c, bb, d, c);
    }
  }

  // Tapas planas: se triangula el anillo interior y se duplican los vértices (normales ±z)
  const capXY = ringXY[ringXY.length - 1]!;
  const tris = triangulate(capXY);
  const base = position.length / 3;
  for (const [x, y] of capXY) push(x, y, h, 0, 0, 1);
  for (let t = 0; t < tris.length; t++) index.push(base + tris[t]!);
  const base2 = position.length / 3;
  const backXY = ringXY[0]!;
  for (const [x, y] of backXY) push(x, y, -h, 0, 0, -1);
  for (let t = 0; t < tris.length; t += 3)
    index.push(base2 + tris[t]!, base2 + tris[t + 2]!, base2 + tris[t + 1]!);

  const count = position.length / 3;
  return {
    position: new Float32Array(position),
    normal: new Float32Array(normal),
    uv: new Float32Array(uv),
    index: count > 65535 ? new Uint32Array(index) : new Uint16Array(index),
  };
}
