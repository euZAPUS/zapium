#!/usr/bin/env node
/**
 * Convierte capturas de las apps (_originals/screens/NAME.png, gitignored) en las «imágenes de reserva» de las
 * pantallas de Proyectos: public/works/NAME.webp (1280×800, 16:10, sin metadatos). Se usan cuando el proyecto aún
 * no tiene vídeo (p. ej. Zapped) y como imagen de la lista apilada sin WebGL.
 * (Las capturas de la demo del huerto y del laboratorio las genera scripts/capture-works.mjs.)
 *
 * Uso: node scripts/make-works-stills.mjs
 */
import { mkdir, readdir } from 'node:fs/promises';
import { parse } from 'node:path';
import sharp from 'sharp';

const SRC = '_originals/screens';
const OUT = 'public/works';
let files = [];
try {
  files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
} catch {
  console.log(`No hay carpeta ${SRC}.`);
  process.exit(0);
}
await mkdir(OUT, { recursive: true });
for (const f of files) {
  const { name } = parse(f);
  const info = await sharp(`${SRC}/${f}`)
    .resize(1280, 800, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(`${OUT}/${name}.webp`);
  console.log(`✓ ${name}.webp  ${(info.size / 1024).toFixed(0)} KB`);
}
