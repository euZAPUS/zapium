/**
 * Fondo vivo del hero: malla de manchas de color que se mueven solas y siguen
 * al cursor, con curvas de nivel tipo mapa y grano. Pantalla completa del hero
 * (sin formas «de círculo»), a media resolución: es un degradado suave.
 */
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { readColor } from '../tokens';

export interface MeshScene {
  canvas: HTMLCanvasElement;
  resize(width: number, height: number): void;
  /** `pointer` va de 0 a 1 dentro del hero. */
  frame(time: number, pointer: { x: number; y: number }): void;
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
  uniform float uStrength;
  uniform vec2 uRes;
  uniform vec2 uPointer;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform vec3 uInk;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float blob(vec2 p, vec2 c, float r) {
    float d = length(p - c) / r;
    return exp(-d * d * 2.2);
  }

  void main() {
    float asp = uRes.x / uRes.y;
    vec2 p = vec2(vUv.x * asp, vUv.y);
    float t = uTime * 0.22;
    // Deformación orgánica: los contornos no forman círculos
    p += 0.07 * vec2(sin(p.y * 5.0 + t * 2.0) + sin(p.y * 11.0 - t), cos(p.x * 4.0 - t * 1.6) + cos(p.x * 9.0 + t));

    vec2 c1 = vec2(asp * (0.76 + 0.07 * sin(t * 1.3)), 0.52 + 0.10 * cos(t * 1.1));
    vec2 c2 = vec2(asp * (0.94 + 0.05 * cos(t * 0.9)), 0.92 + 0.06 * sin(t * 1.2));
    vec2 c3 = vec2(asp * (0.64 + 0.08 * sin(t * 0.8 + 2.0)), 0.06 + 0.08 * cos(t));
    vec2 cp = vec2(uPointer.x * asp, 1.0 - uPointer.y);

    float b1 = blob(p, c1, 0.55);
    float b2 = blob(p, c2, 0.36);
    float b3 = blob(p, c3, 0.42);
    float bp = blob(p, cp, 0.24);
    float w = b1 + b2 + b3 + bp;

    vec3 tint = (uA * b1 * 1.1 + uB * b2 + uC * b3 + mix(uA, uB, 0.5) * bp) / max(w, 0.0001);
    float a = clamp(w, 0.0, 1.0) * uStrength;

    // Curvas de nivel finas, como un mapa
    float f = fract(w * 4.0);
    float line = smoothstep(0.0, 0.035, f) * smoothstep(0.09, 0.05, f) * smoothstep(0.06, 0.35, w);
    vec3 col = mix(tint, uInk, line * 0.4);
    a = max(a, line * 0.1);

    // Grano
    a *= 0.93 + 0.14 * hash(gl_FragCoord.xy + floor(uTime * 20.0));

    gl_FragColor = vec4(col * a, a);
  }
`;

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

export function createMesh(): MeshScene {
  const renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    dpr: 0.5,
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: isDark() ? 0.46 : 0.56 },
      uRes: { value: [1, 1] },
      uPointer: { value: [0.75, 0.5] },
      uA: { value: readColor('--accent') },
      uB: { value: readColor('--pink') },
      uC: { value: readColor('--sky') },
      uInk: { value: readColor('--ink') },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const smooth = { x: 0.75, y: 0.5 };
  return {
    canvas: gl.canvas as HTMLCanvasElement,
    resize(w, h) {
      renderer.setSize(w, h);
      program.uniforms.uRes!.value = [w, h];
    },
    frame(t, pointer) {
      smooth.x += (pointer.x - smooth.x) * 0.05;
      smooth.y += (pointer.y - smooth.y) * 0.05;
      program.uniforms.uTime!.value = t;
      program.uniforms.uPointer!.value = [smooth.x, smooth.y];
      renderer.render({ scene: mesh });
    },
    colors() {
      program.uniforms.uStrength!.value = isDark() ? 0.46 : 0.56;
      program.uniforms.uA!.value = readColor('--accent');
      program.uniforms.uB!.value = readColor('--pink');
      program.uniforms.uC!.value = readColor('--sky');
      program.uniforms.uInk!.value = readColor('--ink');
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
