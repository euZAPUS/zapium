/**
 * Sonido minimalista, sintetizado con Web Audio (sin archivos ni licencias):
 *  - `tick`: rueda antiestrés de clics rápidos y suaves, ligada al scroll.
 *  - `click`: «tock» corto y agradable para pulsaciones.
 *  - `chime` / `boing`: detalles puntuales (fin de la carga, salto de la patata).
 * Es OPT-IN: arranca apagado, el visitante lo activa (aviso en la carga o botón de la
 * cabecera) y la elección se recuerda en localStorage. Los navegadores solo permiten
 * audio tras un gesto, así que el contexto se crea al activarlo o en la primera interacción.
 */
const KEY = 'zapium-sound';

type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let on = false;
let lastTick = 0;
let tickFlip = 0;

function read(): 'on' | 'off' | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}
function write(v: 'on' | 'off') {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* sin almacenamiento: vale solo para esta visita */
  }
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); // por si se juntan muchos clics
  master.connect(comp).connect(ctx.destination);
  // 50 ms de ruido blanco para los transitorios
  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function ready(): AudioContext | null {
  if (!on) return null;
  const c = ensure();
  if (!c || !master) return null;
  if (c.state === 'suspended') void c.resume();
  return c;
}

/** Un golpecito: ruido filtrado + un tono corto con caída rápida. */
function blip(opts: {
  freq: number;
  to?: number;
  gain: number;
  dur: number;
  noiseGain?: number;
  noiseFreq?: number;
  type?: OscillatorType;
  partial?: number;
}) {
  const c = ready();
  if (!c || !master) return;
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(opts.gain, t + 0.003);
  out.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  out.connect(master);

  const osc = c.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur * 0.6);
  osc.connect(out);
  osc.start(t);
  osc.stop(t + opts.dur + 0.02);

  if (opts.partial) {
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.frequency.value = opts.freq * opts.partial;
    g2.gain.value = 0.28;
    o2.connect(g2).connect(out);
    o2.start(t);
    o2.stop(t + opts.dur + 0.02);
  }

  if (opts.noiseGain && noise) {
    const src = c.createBufferSource();
    src.buffer = noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = opts.noiseFreq ?? 2400;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(opts.noiseGain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    src.connect(f).connect(g).connect(out);
    src.start(t);
  }
}

export const sfx = {
  /** Clic de rueda antiestrés. `strength` 0-1 (velocidad del scroll). */
  tick(strength = 0.6) {
    const now = performance.now();
    if (now - lastTick < 28) return; // máx. ~35 clics por segundo
    lastTick = now;
    tickFlip ^= 1;
    const s = 0.55 + 0.45 * Math.min(1, strength);
    blip({
      freq: (tickFlip ? 1750 : 1500) * (0.97 + Math.random() * 0.06),
      to: 900,
      gain: 0.05 * s,
      dur: 0.028,
      noiseGain: 0.5 * s,
      noiseFreq: 3200,
      type: 'triangle',
    });
  },
  /** «Tock» sutil pero notorio y agradable. */
  click() {
    blip({
      freq: 640,
      to: 420,
      gain: 0.13,
      dur: 0.075,
      noiseGain: 0.35,
      noiseFreq: 1800,
      partial: 2.4,
    });
  },
  /** Fin de la carga: dos notas suaves hacia arriba. */
  chime() {
    blip({ freq: 660, gain: 0.09, dur: 0.22, partial: 2 });
    setTimeout(() => blip({ freq: 990, gain: 0.08, dur: 0.32, partial: 2 }), 95);
  },
  /** La patata salta. */
  boing() {
    blip({ freq: 220, to: 520, gain: 0.12, dur: 0.18, type: 'sine', partial: 1.5 });
  },
};

export const sound = {
  get on() {
    return on;
  },
  /** Elección guardada (null = aún no ha elegido). */
  get saved() {
    return read();
  },
  set(value: boolean, persist = true) {
    on = value;
    if (persist) write(value ? 'on' : 'off');
    if (value) {
      ensure();
      if (ctx?.state === 'suspended') void ctx.resume();
    }
    listeners.forEach((l) => l(on));
  },
  onChange(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

// Si ya eligió «con sonido» en otra visita, se reactiva en el primer gesto (política de autoplay)
if (read() === 'on') {
  const arm = () => sound.set(true, false);
  addEventListener('pointerdown', arm, { once: true, capture: true });
  addEventListener('keydown', arm, { once: true, capture: true });
  addEventListener('wheel', arm, { once: true, capture: true, passive: true });
}

// ── Enganches globales: clics y scroll ────────────────────────────────
addEventListener(
  'pointerdown',
  (e) => {
    if (!on) return;
    if ((e.target as Element | null)?.closest('a, button, [data-cursor], summary')) sfx.click();
  },
  { capture: true },
);

let lastY = scrollY;
let lastT = performance.now();
let acc = 0;
addEventListener(
  'scroll',
  () => {
    if (!on) {
      lastY = scrollY;
      return;
    }
    const now = performance.now();
    const dy = Math.abs(scrollY - lastY);
    const speed = dy / Math.max(1, now - lastT); // px/ms
    lastY = scrollY;
    lastT = now;
    acc += dy;
    // un clic cada ~46 px de scroll, como los dientes de una rueda
    if (acc >= 46) {
      acc %= 46;
      sfx.tick(speed / 3);
    }
  },
  { passive: true },
);
