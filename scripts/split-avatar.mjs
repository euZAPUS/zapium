#!/usr/bin/env node
/**
 * Corta el avatar ORIGINAL (src/assets/avatar-original.png, sin tocar) en tres capas
 * —cuerpo y dos brazos— para poder animar los brazos (saludo, choca esos cinco).
 * Los píxeles se copian tal cual: no se redibuja ni se retoca nada. Al superponer
 * las capas en reposo sale exactamente el original (lo comprueba al final).
 *
 * Uso: node scripts/split-avatar.mjs
 */
import sharp from 'sharp';

const SRC = 'src/assets/avatar-original.png';
const OUT = 'src/assets/avatar';
// Recuadro que contiene el dibujo (el resto del lienzo original es transparente)
const BOX = { left: 100, top: 369, width: 1506, height: 549 };
// Donde los brazos salen del cuerpo (coordenadas del lienzo original)
const CUT_L = 592;
const CUT_R = 1312;
const OVERLAP = 14; // los brazos se meten un poco bajo el contorno del cuerpo para que no se vea costura al girar
const BAND_L = [570, 668];
const BAND_R = [640, 748];

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;

function layer(keep) {
  const out = Buffer.alloc(BOX.width * BOX.height * 4);
  for (let y = 0; y < BOX.height; y++) {
    for (let x = 0; x < BOX.width; x++) {
      const ax = x + BOX.left;
      const ay = y + BOX.top;
      const s = (ay * W + ax) * C;
      if (!keep(ax, ay, data[s + 3] ?? 0)) continue;
      const d = (y * BOX.width + x) * 4;
      out[d] = data[s];
      out[d + 1] = data[s + 1];
      out[d + 2] = data[s + 2];
      out[d + 3] = data[s + 3];
    }
  }
  return out;
}

const layers = {
  'arm-l': layer(
    (x, y, a) =>
      x < CUT_L || (a === 255 && x < CUT_L + OVERLAP && y >= BAND_L[0] && y <= BAND_L[1]),
  ),
  'arm-r': layer(
    (x, y, a) =>
      x > CUT_R || (a === 255 && x > CUT_R - OVERLAP && y >= BAND_R[0] && y <= BAND_R[1]),
  ),
  body: layer((x) => x >= CUT_L && x <= CUT_R),
};

const raw = { raw: { width: BOX.width, height: BOX.height, channels: 4 } };
for (const [name, buf] of Object.entries(layers)) {
  await sharp(buf, raw).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`);
}

// Logo de la cabecera y favicon: recorte del CUERPO (mismos píxeles, sin brazos)
const logo = sharp(layers.body, raw).extract({
  left: CUT_L - BOX.left,
  top: 0,
  width: CUT_R - CUT_L + 1,
  height: BOX.height,
});
await logo.clone().png({ compressionLevel: 9 }).toFile(`${OUT}/logo.png`);
await logo
  .clone()
  .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile('public/favicon.png');

// Verificación: capas superpuestas en reposo == recorte del original
const original = await sharp(SRC).extract(BOX).ensureAlpha().raw().toBuffer();
const composed = await sharp(layers['arm-l'], raw)
  .composite([
    { input: layers['arm-r'], raw: raw.raw, blend: 'over' },
    { input: layers.body, raw: raw.raw, blend: 'over' },
  ])
  .raw()
  .toBuffer();
let maxDiff = 0;
let differing = 0;
for (let i = 0; i < original.length; i += 4) {
  const a = original[i + 3] ?? 0;
  const b = composed[i + 3] ?? 0;
  const d = Math.abs(a - b);
  if (d > 0) differing++;
  if (d > maxDiff) maxDiff = d;
}
console.log(
  `Capas en ${OUT}/ (${BOX.width}x${BOX.height}). Diferencia con el original: máx ${maxDiff}/255 en ${differing} px de alfa.`,
);
if (maxDiff > 0) process.exit(1);
