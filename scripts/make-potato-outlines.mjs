#!/usr/bin/env node
/**
 * Traza la SILUETA de cada capa del avatar ORIGINAL (cuerpo y dos brazos, src/assets/avatar/*.png, sin tocar)
 * y la guarda como polígonos en src/scripts/potato/outlines.json. Con ellos, la web extruye la patata en 3D
 * (src/scripts/potato/geometry.ts): la cara frontal lleva el dibujo original como textura, los bordes son
 * el contorno negro. No se redibuja nada: solo se calcula el contorno del alfa.
 *
 * Pasos: alfa ≥ 128 → marching squares (contorno más largo) → Douglas-Peucker → suavizado (Chaikin) →
 * remuestreo a paso uniforme. Las coordenadas son píxeles de la capa (1506×549, y hacia abajo).
 *
 * Uso: node scripts/make-potato-outlines.mjs
 */
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const LAYERS = ['body', 'arm-l', 'arm-r'];
const STEP = { body: 9, 'arm-l': 7, 'arm-r': 7 }; // separación entre puntos (px de la capa)

/** Contornos cerrados de una máscara binaria (marching squares; los segmentos se enlazan por adyacencia). */
function contours(mask, W, H) {
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : mask[y * W + x]);
  const key = (px, py) => `${px},${py}`;
  // Cada celda (x,y) toma las esquinas tl=(x,y) tr=(x+1,y) br=(x+1,y+1) bl=(x,y+1); los vértices del contorno son
  // los puntos medios de las aristas (coordenadas ×2 para no usar decimales). Aristas: 0 arriba, 1 derecha, 2 abajo, 3 izquierda.
  const edgePt = (cx, cy, edge) =>
    edge === 0
      ? [cx * 2 + 1, cy * 2]
      : edge === 1
        ? [cx * 2 + 2, cy * 2 + 1]
        : edge === 2
          ? [cx * 2 + 1, cy * 2 + 2]
          : [cx * 2, cy * 2 + 1];
  const T = {
    1: [[3, 2]],
    2: [[2, 1]],
    3: [[3, 1]],
    4: [[0, 1]],
    5: [
      [3, 0],
      [1, 2],
    ],
    6: [[0, 2]],
    7: [[3, 0]],
    8: [[3, 0]],
    9: [[0, 2]],
    10: [
      [0, 1],
      [2, 3],
    ],
    11: [[0, 1]],
    12: [[3, 1]],
    13: [[1, 2]],
    14: [[2, 3]],
  };
  const adj = new Map();
  const link = (a, b) => {
    const ka = key(a[0], a[1]);
    const kb = key(b[0], b[1]);
    (adj.get(ka) ?? adj.set(ka, []).get(ka)).push(kb);
    (adj.get(kb) ?? adj.set(kb, []).get(kb)).push(ka);
  };
  for (let y = -1; y < H; y++) {
    for (let x = -1; x < W; x++) {
      const c = at(x, y) * 8 + at(x + 1, y) * 4 + at(x + 1, y + 1) * 2 + at(x, y + 1);
      const segs = T[c];
      if (!segs) continue;
      for (const [a, b] of segs) link(edgePt(x, y, a), edgePt(x, y, b));
    }
  }
  const seen = new Set();
  const out = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let cur = start;
    let prev = null;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const [px, py] = cur.split(',').map(Number);
      loop.push([px / 2, py / 2]);
      const nb = adj.get(cur) ?? [];
      const nxt = nb.find((k) => k !== prev && !seen.has(k));
      prev = cur;
      cur = nxt;
    }
    if (loop.length > 20) out.push(loop);
  }
  return out;
}

const area = (p) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

/** Douglas-Peucker sobre un polígono cerrado (se parte por los dos puntos más alejados). */
function simplify(poly, eps) {
  const dp = (pts, lo, hi, keep) => {
    let dmax = 0;
    let idx = -1;
    const [ax, ay] = pts[lo];
    const [bx, by] = pts[hi];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = lo + 1; i < hi; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > dmax) {
        dmax = d;
        idx = i;
      }
    }
    if (dmax > eps && idx > 0) {
      keep[idx] = true;
      dp(pts, lo, idx, keep);
      dp(pts, idx, hi, keep);
    }
  };
  // punto más lejano al primero para dividir el lazo en dos mitades
  let far = 0;
  let fd = 0;
  for (let i = 1; i < poly.length; i++) {
    const d = Math.hypot(poly[i][0] - poly[0][0], poly[i][1] - poly[0][1]);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const keep = new Array(poly.length).fill(false);
  keep[0] = keep[far] = true;
  const a = poly.slice(0, far + 1);
  const b = [...poly.slice(far), poly[0]];
  const ka = new Array(a.length).fill(false);
  const kb = new Array(b.length).fill(false);
  ka[0] = ka[a.length - 1] = true;
  kb[0] = kb[b.length - 1] = true;
  dp(a, 0, a.length - 1, ka);
  dp(b, 0, b.length - 1, kb);
  const res = [];
  a.forEach((p, i) => ka[i] && res.push(p));
  b.forEach((p, i) => i > 0 && i < b.length - 1 && kb[i] && res.push(p));
  return res;
}

/** Chaikin: cada pasada recorta las esquinas (redondea el contorno del trazo a mano). */
function chaikin(poly, passes) {
  let p = poly;
  for (let k = 0; k < passes; k++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = q;
  }
  return p;
}

/** Remuestreo a paso uniforme sobre el perímetro. */
function resample(poly, step) {
  const n = poly.length;
  const L = [0];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = L[n];
  const count = Math.max(24, Math.round(total / step));
  const out = [];
  let seg = 0;
  for (let i = 0; i < count; i++) {
    const d = (i / count) * total;
    while (L[seg + 1] < d) seg++;
    const t = (d - L[seg]) / (L[seg + 1] - L[seg] || 1);
    const a = poly[seg];
    const b = poly[(seg + 1) % n];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

const result = {};
for (const name of LAYERS) {
  const { data, info } = await sharp(`src/assets/avatar/${name}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = (data[i * channels + 3] ?? 0) >= 128 ? 1 : 0;
  const loops = contours(mask, W, H);
  if (!loops.length) throw new Error(`Sin contorno en ${name}`);
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  let poly = loops[0];
  poly = simplify(poly, 0.9);
  poly = chaikin(poly, 2);
  poly = resample(poly, STEP[name]);
  if (area(poly) < 0) poly.reverse(); // sentido fijo (el que dé area > 0 con y hacia abajo)
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  result[name] = {
    points: poly.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]),
    bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) =>
      Math.round(v),
    ),
  };
  console.log(name, `${poly.length} puntos`, result[name].bbox, `(${loops.length} contornos)`);
}
// El pivote del giro: centro del cuerpo
const [bx0, by0, bx1, by1] = result.body.bbox;
const out = { size: [1506, 549], pivot: [(bx0 + bx1) / 2, (by0 + by1) / 2], layers: result };
await writeFile('src/scripts/potato/outlines.json', JSON.stringify(out));
console.log('→ src/scripts/potato/outlines.json', JSON.stringify(out).length, 'bytes');
