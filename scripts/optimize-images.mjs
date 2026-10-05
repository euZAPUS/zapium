#!/usr/bin/env node
/**
 * Convierte los originales de `_originals/photos/**` (gitignored) en medios
 * optimizados dentro de `src/assets/photos/`:
 *   - AVIF + WebP en varios anchos (responsive/srcset)
 *   - SIN metadatos: sharp descarta EXIF/XMP/IPTC (incluido GPS) salvo que se
 *     pida lo contrario, y aquí NO se pide nunca. La rotación EXIF se aplica
 *     antes (`rotate()`), así que la imagen no sale girada.
 *
 * Uso: pnpm images
 */
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, parse, relative } from 'node:path';
import sharp from 'sharp';

const SRC = '_originals/photos';
const OUT = 'src/assets/photos';
const WIDTHS = [480, 960, 1600];
const INPUT = /\.(jpe?g|png|webp|heic|tiff?)$/i;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (INPUT.test(entry.name)) yield path;
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(SRC))) {
  console.log(`No hay carpeta ${SRC}. Crea la carpeta y deja ahí tus originales.`);
  process.exit(0);
}

let count = 0;
for await (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const { dir, name } = parse(rel);
  const outDir = join(OUT, dir);
  await mkdir(outDir, { recursive: true });

  const base = sharp(file).rotate(); // aplica la orientación y descarta el resto de metadatos
  const { width = 0 } = await base.metadata();

  for (const w of WIDTHS.filter((w) => w <= Math.max(width, WIDTHS[0]))) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 55, effort: 5 })
      .toFile(join(outDir, `${name}-${w}.avif`));
    await resized
      .clone()
      .webp({ quality: 78 })
      .toFile(join(outDir, `${name}-${w}.webp`));
  }
  count++;
  console.log(`✓ ${rel}`);
}
console.log(`\n${count} imagen(es) optimizadas en ${OUT} (sin EXIF).`);
