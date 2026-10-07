#!/usr/bin/env node
/**
 * Comprime los vídeos de _originals/videos/ (gitignored) a medios web ligeros en
 * public/videos/: NAME.webm (VP9) + NAME.mp4 (H.264) + NAME.jpg (póster). Sin audio,
 * máx. 1280 px de ancho, 24 fps. Avisa si algún archivo pasa de 3 MB.
 *
 * Tráilers: _originals/trailers/NAME.mp4 → public/trailers/NAME.mp4 (H.264 + AAC) + NAME.webm (VP9 + Opus), 1280 px,
 * CON sonido, + NAME.jpg (portada). Los dos formatos porque algunos Chromium/Firefox sin códecs no reproducen H.264.
 * Solo se descargan al pulsar «Ver el tráiler» (Works.astro → DemoDialog), no van en el carrusel.
 *
 * Uso: pnpm videos            (todos)
 *      pnpm videos -- --max 20  (recorta a 20 s los vídeos del carrusel)
 */
import { execFile } from 'node:child_process';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SRC = '_originals/videos';
const OUT = 'public/videos';
const maxIdx = process.argv.indexOf('--max');
const maxSec = maxIdx > 0 ? Number(process.argv[maxIdx + 1]) : 30;
const LIMIT = 3 * 1024 * 1024;

let files = [];
try {
  files = (await readdir(SRC)).filter((f) => /\.(mp4|mov|mkv|webm|avi)$/i.test(f));
} catch {
  console.log(`No hay carpeta ${SRC}: se omiten los vídeos del carrusel.`);
}
await mkdir(OUT, { recursive: true });

const vf = 'scale=min(1280\\,iw):-2,fps=24';
for (const f of files) {
  const { name } = parse(f);
  const input = join(SRC, f);
  const base = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    input,
    '-t',
    String(maxSec),
    '-an',
    '-vf',
    vf,
  ];
  await run('ffmpeg', [
    ...base,
    '-c:v',
    'libvpx-vp9',
    '-crf',
    '36',
    '-b:v',
    '0',
    '-row-mt',
    '1',
    join(OUT, `${name}.webm`),
  ]);
  await run('ffmpeg', [
    ...base,
    '-c:v',
    'libx264',
    '-crf',
    '30',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    join(OUT, `${name}.mp4`),
  ]);
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    '1',
    '-i',
    input,
    '-frames:v',
    '1',
    '-vf',
    'scale=min(1280\\,iw):-2',
    '-q:v',
    '4',
    join(OUT, `${name}.jpg`),
  ]);
  for (const ext of ['webm', 'mp4', 'jpg']) {
    const size = (await stat(join(OUT, `${name}.${ext}`))).size;
    const warn =
      size > LIMIT ? '  ⚠ pesa más de 3 MB: recorta (--max) o súbelo a alojamiento externo' : '';
    console.log(`✓ ${name}.${ext}  ${(size / 1024).toFixed(0)} KB${warn}`);
  }
}

// ── Tráilers con sonido ──
const TSRC = '_originals/trailers';
const TOUT = 'public/trailers';
let trailers = [];
try {
  trailers = (await readdir(TSRC)).filter((f) => /\.(mp4|mov|mkv|webm|avi)$/i.test(f));
} catch {
  /* sin tráilers */
}
if (trailers.length) await mkdir(TOUT, { recursive: true });
for (const f of trailers) {
  const { name } = parse(f);
  const input = join(TSRC, f);
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    input,
    '-t',
    '120',
    '-vf',
    'scale=min(1280\\,iw):-2,fps=30',
    '-c:v',
    'libx264',
    '-crf',
    '27',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-movflags',
    '+faststart',
    join(TOUT, `${name}.mp4`),
  ]);
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    input,
    '-t',
    '120',
    '-vf',
    'scale=min(1280\\,iw):-2,fps=30',
    '-c:v',
    'libvpx-vp9',
    '-crf',
    '34',
    '-b:v',
    '0',
    '-row-mt',
    '1',
    '-c:a',
    'libopus',
    '-b:a',
    '64k',
    join(TOUT, `${name}.webm`),
  ]);
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    '2',
    '-i',
    input,
    '-frames:v',
    '1',
    '-vf',
    'scale=min(1280\\,iw):-2',
    '-q:v',
    '4',
    join(TOUT, `${name}.jpg`),
  ]);
  for (const ext of ['mp4', 'webm', 'jpg']) {
    const size = (await stat(join(TOUT, `${name}.${ext}`))).size;
    const warn = size > 6 * 1024 * 1024 ? '  ⚠ pesa más de 6 MB' : '';
    console.log(`✓ trailers/${name}.${ext}  ${(size / 1024).toFixed(0)} KB${warn}`);
  }
}
