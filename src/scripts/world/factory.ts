/**
 * El «mundo»: un pasillo de paneles en perspectiva (rejilla de fábrica) dibujado en
 * un único shader a pantalla completa y media resolución. La cámara avanza con el
 * scroll, se inclina con el ratón y se alabea con la velocidad. Celdas que se iluminan
 * con los colores de la marca, cruces `+`, niebla y viñeta. Sin geometría: barato.
 * Idea inspirada en referencias de estudios creativos; implementación propia.
 */
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { readColor } from '../tokens';

export interface WorldInput {
  /** Posición de la cámara a lo largo del pasillo. */
  z: number;
  /** Mirada: guiñada y cabeceo (radianes). */
  yaw: number;
  pitch: number;
  roll: number;
  /** 0 = oscurecido (leer texto), 1 = pleno. */
  dim: number;
  /** Estela del cursor sobre el pasillo: puntos [lado, u, v, edad(s)] (ver `cast`). */
  trail?: number[][];
  /** Onda de clic: [lado, u, v, edad(s)] o null. */
  ripple?: number[] | null;
}

/** Cuántos puntos de la estela entran en el shader. */
export const TRAIL_MAX = 10;

export interface WorldScene {
  canvas: HTMLCanvasElement;
  /** Lanza un rayo desde la posición del cursor (-1..1) y devuelve dónde toca el pasillo. */
  cast(nx: number, ny: number, input: WorldInput): [number, number, number];
  resize(width: number, height: number): void;
  frame(time: number, input: WorldInput): void;
  colors(): void;
  destroy(): void;
}

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uZ;
  uniform float uRoll;
  uniform float uDim;
  uniform float uGlow;
  uniform vec2 uRes;
  uniform vec2 uLook;
  uniform vec3 uBg;
  uniform vec3 uPanel;
  uniform vec3 uLine;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform vec3 uD;
  uniform vec4 uT0, uT1, uT2, uT3, uT4, uT5, uT6, uT7, uT8, uT9;
  uniform vec4 uRipple;
  varying vec2 vUv;

  // Brillo de un punto de la estela sobre la loseta actual (solo si está en la misma pared/suelo)
  float trailAt(vec4 tp, float side, vec2 uv, float S) {
    if (tp.x != side || tp.w >= 1.5) return 0.0;
    vec2 dd = (uv - tp.yz) / S;
    return exp(-dot(dd, dd) * 0.9) * (1.0 - tp.w / 1.5);
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 pick(float h) { return h < 0.25 ? uA : h < 0.5 ? uB : h < 0.75 ? uC : uD; }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= uRes.x / uRes.y;

    // Rayo de cámara: roll → pitch → yaw
    vec3 d = normalize(vec3(p, 1.3));
    float cr = cos(uRoll), sr = sin(uRoll);
    d.xy = mat2(cr, -sr, sr, cr) * d.xy;
    float cp = cos(uLook.y), sp = sin(uLook.y);
    d.yz = mat2(cp, -sp, sp, cp) * d.yz;
    float cy = cos(uLook.x), sy = sin(uLook.x);
    d.xz = mat2(cy, -sy, sy, cy) * d.xz;

    // Pasillo: dos paredes (x = ±W) y suelo/techo (y = ±H)
    const float W = 1.15;
    const float H = 0.72;
    float tx = W / max(abs(d.x), 1e-4);
    float ty = H / max(abs(d.y), 1e-4);
    float t = min(tx, ty);
    bool wall = tx < ty;
    vec3 h = vec3(0.0, 0.0, uZ) + d * t;
    vec2 uv = wall ? vec2(h.z, h.y) : vec2(h.z, h.x);
    float side = wall ? (d.x > 0.0 ? 1.0 : 2.0) : (d.y > 0.0 ? 3.0 : 4.0);

    const float S = 0.56;
    vec2 cell = floor(uv / S);
    vec2 f = fract(uv / S);
    float hs = hash(cell + side * 17.3);

    // Panel base con variación por celda
    vec3 col = uPanel * (0.72 + 0.5 * hs);

    // Celdas «encendidas» con los colores de la marca, que respiran
    float lit = step(0.9, hash(cell * 1.37 + side * 5.1));
    float pulse = 0.5 + 0.5 * sin(uTime * 1.3 + hs * 40.0 + cell.x * 0.7);
    col = mix(col, pick(hash(cell + 9.1)) * (0.4 + 0.55 * pulse), lit * 0.75);
    col *= 0.95 + 0.05 * sin(uv.y / S * 46.0 + uTime * 2.0 * lit); // scanlines de pantalla

    // El cursor ilumina las losetas por donde pasa (estela que se apaga) y una onda al hacer clic
    float glow = trailAt(uT0, side, uv, S) + trailAt(uT1, side, uv, S) + trailAt(uT2, side, uv, S)
      + trailAt(uT3, side, uv, S) + trailAt(uT4, side, uv, S) + trailAt(uT5, side, uv, S)
      + trailAt(uT6, side, uv, S) + trailAt(uT7, side, uv, S) + trailAt(uT8, side, uv, S)
      + trailAt(uT9, side, uv, S);
    if (uRipple.x == side && uRipple.w < 1.4) {
      float rd = length((uv - uRipple.yz) / S);
      float ring = exp(-pow((rd - uRipple.w * 3.2) * 2.4, 2.0)) * (1.0 - uRipple.w / 1.4);
      glow += ring * 1.4;
    }
    vec3 cursorCol = mix(uA, mix(uB, uC, 0.5 + 0.5 * sin(uTime * 0.7)), 0.5 + 0.5 * sin(uTime * 1.3 + uv.x));
    col = mix(col, col * 1.6 + cursorCol * 0.55, clamp(glow, 0.0, 1.0));
    col += cursorCol * glow * 0.12;

    // Biselado y líneas de rejilla (más gruesas con la distancia para no centellear)
    vec2 q = min(f, 1.0 - f) * S;
    float e = min(q.x, q.y);
    float lw = 0.011 + t * 0.0045;
    col *= 0.86 + 0.14 * smoothstep(0.0, 0.07, e);
    col = mix(col, uLine, (1.0 - smoothstep(lw * 0.5, lw, e)) * 0.9);

    // Cruces «+» en el centro de cada celda
    vec2 dc = abs(f - 0.5) * S;
    float thick = lw * 0.55;
    float plus = max(step(dc.x, thick) * step(dc.y, 0.05), step(dc.y, thick) * step(dc.x, 0.05));
    col = mix(col, uLine, plus * 0.55 * (1.0 - lit));

    // Niebla hacia el fondo + brillo cálido en el punto de fuga + viñeta
    float fog = exp(-t * 0.3);
    col = mix(uBg, col, fog);
    col += uA * uGlow * exp(-length(p) * 2.2);
    col *= 1.0 - 0.3 * dot(p, p) * 0.22;
    col = mix(uBg, col, uDim);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createWorld(lowPower = false): WorldScene {
  const renderer = new Renderer({ alpha: false, antialias: false, dpr: lowPower ? 0.42 : 0.6 });
  const gl = renderer.gl;

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uZ: { value: 0 },
      uRoll: { value: 0 },
      uDim: { value: 1 },
      uGlow: { value: 0.12 },
      uRes: { value: [1, 1] },
      uLook: { value: [0, 0] },
      uBg: { value: [0, 0, 0] },
      uPanel: { value: [0, 0, 0] },
      uLine: { value: [1, 1, 1] },
      uA: { value: [1, 0.68, 0] },
      uB: { value: [1, 0.55, 0.72] },
      uC: { value: [0.3, 0.7, 1] },
      uD: { value: [0.22, 0.83, 0.62] },
      uT0: { value: [-1, 0, 0, 99] },
      uT1: { value: [-1, 0, 0, 99] },
      uT2: { value: [-1, 0, 0, 99] },
      uT3: { value: [-1, 0, 0, 99] },
      uT4: { value: [-1, 0, 0, 99] },
      uT5: { value: [-1, 0, 0, 99] },
      uT6: { value: [-1, 0, 0, 99] },
      uT7: { value: [-1, 0, 0, 99] },
      uT8: { value: [-1, 0, 0, 99] },
      uT9: { value: [-1, 0, 0, 99] },
      uRipple: { value: [-1, 0, 0, 99] },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const mix3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + ((b[i] ?? 0) - v) * k);
  const colors = () => {
    const bg = readColor('--bg');
    const ink = readColor('--ink');
    program.uniforms.uBg!.value = bg;
    program.uniforms.uPanel!.value = readColor('--bg-soft');
    // En claro, líneas más marcadas y menos resplandor para que la rejilla no se lave
    const light = document.documentElement.dataset.mode === 'light';
    program.uniforms.uLine!.value = mix3(bg, ink, light ? 0.55 : 0.32);
    program.uniforms.uGlow!.value = light ? 0.03 : 0.12;
    program.uniforms.uA!.value = readColor('--accent');
    program.uniforms.uB!.value = readColor('--pink');
    program.uniforms.uC!.value = readColor('--sky');
    program.uniforms.uD!.value = readColor('--mint');
  };
  colors();

  let aspect = 1;
  return {
    canvas: gl.canvas as HTMLCanvasElement,
    // Mismo cálculo que el shader (roll → pitch → yaw, pasillo W×H), para saber qué losetas toca el cursor
    cast(nx, ny, input) {
      const len = Math.hypot(nx * aspect, ny, 1.3);
      let x = (nx * aspect) / len;
      let y = ny / len;
      let z = 1.3 / len;
      const cr = Math.cos(input.roll);
      const sr = Math.sin(input.roll);
      [x, y] = [cr * x + sr * y, -sr * x + cr * y];
      const cp = Math.cos(input.pitch);
      const sp = Math.sin(input.pitch);
      [y, z] = [cp * y + sp * z, -sp * y + cp * z];
      const cy = Math.cos(input.yaw);
      const sy = Math.sin(input.yaw);
      [x, z] = [cy * x + sy * z, -sy * x + cy * z];
      const tx = 1.15 / Math.max(Math.abs(x), 1e-4);
      const ty = 0.72 / Math.max(Math.abs(y), 1e-4);
      const t = Math.min(tx, ty);
      const wall = tx < ty;
      return [wall ? (x > 0 ? 1 : 2) : y > 0 ? 3 : 4, input.z + z * t, wall ? y * t : x * t];
    },
    resize(w, h) {
      renderer.setSize(w, h);
      program.uniforms.uRes!.value = [w, h];
      aspect = w / h;
    },
    frame(t, input) {
      program.uniforms.uTime!.value = t;
      program.uniforms.uZ!.value = input.z;
      program.uniforms.uLook!.value = [input.yaw, input.pitch];
      program.uniforms.uRoll!.value = input.roll;
      program.uniforms.uDim!.value = input.dim;
      const none = [-1, 0, 0, 99];
      for (let i = 0; i < TRAIL_MAX; i++)
        program.uniforms[`uT${i}`]!.value = input.trail?.[i] ?? none;
      program.uniforms.uRipple!.value = input.ripple ?? [-1, 0, 0, 99];
      renderer.render({ scene: mesh });
    },
    colors,
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
