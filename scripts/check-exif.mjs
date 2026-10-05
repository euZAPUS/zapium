#!/usr/bin/env node
/**
 * Falla (exit 1) si alguna imagen del proyecto contiene metadatos EXIF, XMP o
 * IPTC (donde viaja el GPS, el modelo de cámara, etc.). Se ejecuta en el hook
 * de pre-commit, en `pnpm verify` y en CI.
 *
 * Uso: node scripts/check-exif.mjs [carpeta ...]   (por defecto: src public)
 */
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const ROOTS = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'public'];
const IMAGE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.heic']);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // la carpeta no existe: nada que comprobar
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (IMAGE.has(extname(entry.name).toLowerCase())) yield path;
  }
}

const offenders = [];
let checked = 0;
for (const root of ROOTS) {
  for await (const file of walk(root)) {
    checked++;
    const meta = await sharp(file).metadata();
    const found = ['exif', 'xmp', 'iptc', 'tifftagPhotoshop'].filter((k) => meta[k]);
    if (found.length) offenders.push(`${file}  [${found.join(', ')}]`);
  }
}

if (offenders.length) {
  console.error('✗ Imágenes con metadatos (posible GPS/EXIF). Pasa `pnpm images` o límpialas:\n');
  for (const o of offenders) console.error('  ' + o);
  process.exit(1);
}
console.log(`✓ EXIF: ${checked} imagen(es) revisadas, ninguna con metadatos.`);
