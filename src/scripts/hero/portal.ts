/** Opción B del hero: portal (túnel de anillos) que reacciona al cursor. */
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { readColor } from '../tokens';
import type { HeroScene } from './types';

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
  uniform vec2 uPointer;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uDeep;
  varying vec2 vUv;

  void main() {
    vec2 q = (vUv - 0.5) * 2.0;
    float disc = smoothstep(1.0, 0.975, length(q));
    vec2 p = q - uPointer * 0.16;
    float r = length(p);
    float a = atan(p.y, p.x);

    // Túnel: la profundidad crece hacia el centro (perspectiva)
    float depth = 0.55 / (r + 0.10);
    float wob = sin(a * 3.0 + uTime * 0.8) * 0.5 + sin(a * 5.0 - uTime * 0.5) * 0.25;
    float k = depth * 1.15 - uTime * 0.55 + wob * 0.12;
    float f = fract(k);

    float ring  = smoothstep(0.00, 0.06, f) * smoothstep(0.34, 0.26, f);   // anillo principal
    float ring2 = smoothstep(0.50, 0.56, f) * smoothstep(0.70, 0.64, f);   // anillo secundario

    vec3 col = mix(uDeep, uB, smoothstep(0.0, 1.0, r) * 0.55);
    col = mix(col, uA, ring);
    col = mix(col, uB, ring2 * 0.9);
    col = mix(uDeep, col, smoothstep(0.04, 0.5, r));                        // niebla al fondo
    col += uA * pow(max(1.0 - r * 1.8, 0.0), 2.5) * 0.4;                    // luz del fondo
    col = mix(col, uA, smoothstep(0.88, 1.0, length(q)) * 0.9);             // borde luminoso

    gl_FragColor = vec4(col * disc, disc);
  }
`;

export function createPortal(): HeroScene {
  const dpr = Math.min(devicePixelRatio || 1, (navigator.hardwareConcurrency ?? 4) <= 2 ? 1 : 1.75);
  const renderer = new Renderer({ alpha: true, antialias: false, dpr });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: [0, 0] },
      uA: { value: readColor('--accent') },
      uB: { value: readColor('--accent-2') },
      uDeep: { value: readColor('--potato-line') },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const smooth = { x: 0, y: 0 };
  return {
    canvas: gl.canvas as HTMLCanvasElement,
    resize(w, h) {
      renderer.setSize(w, h);
    },
    frame(t, pointer) {
      smooth.x += (pointer.x - smooth.x) * 0.06;
      smooth.y += (pointer.y - smooth.y) * 0.06;
      program.uniforms.uTime!.value = t;
      program.uniforms.uPointer!.value = [smooth.x, -smooth.y];
      renderer.render({ scene: mesh });
    },
    colors() {
      program.uniforms.uA!.value = readColor('--accent');
      program.uniforms.uB!.value = readColor('--accent-2');
      program.uniforms.uDeep!.value = readColor('--potato-line');
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
