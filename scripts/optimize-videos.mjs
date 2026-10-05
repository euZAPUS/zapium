#!/usr/bin/env node
/**
 * Comprime los vídeos de _originals/videos/ (gitignored) a medios web ligeros en
 * public/videos/: NAME.webm (VP9) + NAME.mp4 (H.264) + NAME.jpg (póster). Sin audio,
 * máx. 1280 px de ancho, 24 fps. Avisa si algún archivo pasa de 3 MB.
 *
 * Uso: pnpm videos            (todos)
 *      pnpm videos -- --max 20  (recorta a 20 s)
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
  console.log(`No hay carpeta ${SRC}. Crea la carpeta y deja ahí tus vídeos originales.`);
  process.exit(0);
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
