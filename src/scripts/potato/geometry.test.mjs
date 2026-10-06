// Tests de la geometría de la patata 3D. Ejecutar con: pnpm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSlab, triangulate } from './geometry.ts';

const data = JSON.parse(readFileSync(new URL('./outlines.json', import.meta.url), 'utf8'));
const area = (p) =>
  p.reduce((a, [x1, y1], i) => {
    const [x2, y2] = p[(i + 1) % p.length];
    return a + (x1 * y2 - x2 * y1) / 2;
  }, 0);

test('triangulate: la suma de áreas de los triángulos es la del polígono (cóncavo)', () => {
  const poly = [
    [0, 0],
    [4, 0],
    [4, 4],
    [2, 1],
    [0, 4],
  ]; // «M» cóncava, antihoraria
  const t = triangulate(poly);
  assert.equal(t.length, (poly.length - 2) * 3);
  let sum = 0;
  for (let i = 0; i < t.length; i += 3) sum += area([poly[t[i]], poly[t[i + 1]], poly[t[i + 2]]]);
  assert.ok(Math.abs(sum - area(poly)) < 1e-9);
});

for (const [name, layer] of Object.entries(data.layers)) {
  test(`buildSlab(${name}): malla cerrada, normales unitarias, índices válidos`, () => {
    const bevel = name === 'body' ? 24 : 11;
    const m = buildSlab({
      outline: layer.points,
      size: data.size,
      pivot: data.pivot,
      scale: 1 / data.size[0],
      depth: name === 'body' ? 70 : 14,
      bevel,
    });
    const n = m.position.length / 3;
    assert.ok(Math.max(...m.index) < n);
    for (let i = 0; i < n; i++) {
      const l = Math.hypot(m.normal[i * 3], m.normal[i * 3 + 1], m.normal[i * 3 + 2]);
      assert.ok(Math.abs(l - 1) < 1e-3, `normal ${i} = ${l}`);
    }
    // Cerrada: cada arista (con posiciones fusionadas) la comparten exactamente dos triángulos
    const key = (i) => [0, 1, 2].map((k) => m.position[i * 3 + k].toFixed(5)).join(',');
    const edges = new Map();
    for (let t = 0; t < m.index.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = key(m.index[t + e]);
        const b = key(m.index[t + ((e + 1) % 3)]);
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        edges.set(k, (edges.get(k) ?? 0) + 1);
      }
    }
    const bad = [...edges.values()].filter((c) => c !== 2).length;
    assert.equal(bad, 0, `${bad} aristas no están compartidas por 2 triángulos`);
  });
}
