/**
 * Escena 3D propia (sustituto de una escena de Spline): un nudo toroidal iridiscente con
 * shader a medida, que gira con el cursor y el scroll y reacciona al clic. OGL + geometría
 * paramétrica generada aquí: sin modelos ni dependencias de pago.
 */
import {
  Camera,
  Geometry,
  Mesh,
  Program,
  Renderer,
  Transform,
  type OGLRenderingContext,
} from 'ogl';
import { readColor } from '../tokens';

export interface KnotScene {
  canvas: HTMLCanvasElement;
  resize(width: number, height: number): void;
  /** `look`: cursor relativo al escenario (-1..1); `progress`: 0..1 del scroll; `kick`: impulso de giro. */
  frame(
    time: number,
    input: { lookX: number; lookY: number; progress: number; kick: number },
  ): void;
  colors(): void;
  destroy(): void;
}

/** Nudo toroidal (p, q) con sección circular de radio `tube`. */
function knotGeometry(gl: OGLRenderingContext, p = 2, q = 3, segs = 240, radial = 22, tube = 0.33) {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const P = (u: number): [number, number, number] => {
    const r = 2 + Math.cos(q * u);
    return [r * Math.cos(p * u), r * Math.sin(p * u), Math.sin(q * u)];
  };
  const sub = (a: number[], b: number[]) => [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
  const norm = (a: number[]) => {
    const l = Math.hypot(a[0]!, a[1]!, a[2]!) || 1;
    return [a[0]! / l, a[1]! / l, a[2]! / l];
  };
  const cross = (a: number[], b: number[]) => [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
  const e = 0.001;
  for (let i = 0; i <= segs; i++) {
    const u = (i / segs) * Math.PI * 2;
    const c = P(u);
    const T = norm(sub(P(u + e), P(u - e)));
    const acc = sub(
      [...P(u + e)].map((v, k) => v + P(u - e)[k]!),
      [c[0] * 2, c[1] * 2, c[2] * 2],
    );
    const N = norm(cross(cross(T, norm(acc)), T)); // componente de la curvatura perpendicular a T
    const B = norm(cross(T, N));
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const cx = Math.cos(v) * N[0]! + Math.sin(v) * B[0]!;
      const cy = Math.cos(v) * N[1]! + Math.sin(v) * B[1]!;
      const cz = Math.cos(v) * N[2]! + Math.sin(v) * B[2]!;
      pos.push((c[0] + tube * cx) * 0.55, (c[1] + tube * cy) * 0.55, (c[2] + tube * cz) * 0.55);
      nor.push(cx, cy, cz);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1); // sentido antihorario visto desde fuera
    }
  }
  return new Geometry(gl, {
    position: { size: 3, data: new Float32Array(pos) },
    normal: { size: 3, data: new Float32Array(nor) },
    index: { data: new Uint16Array(idx) },
  });
}

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uLight;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform vec3 uInk;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.2);

    // Iridiscencia: paleta coseno (película fina) desplazada por el ángulo de vista y el tiempo
    vec3 irid = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + ndv * 1.15 + uTime * 0.04));
    vec3 brand = mix(uC, uB, 0.5 + 0.5 * N.y);
    brand = mix(brand, uA, smoothstep(0.1, 0.9, 0.5 + 0.5 * sin(N.x * 2.4 + uTime * 0.5)));
    vec3 col = mix(brand, irid, 0.38 + 0.4 * fres);

    // Luz que sigue al cursor + brillo especular + borde de luz
    vec3 L = normalize(vec3(uLight, 0.9));
    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 48.0);
    col = col * (0.42 + 0.7 * diff) + spec * 0.85 + fres * 0.35 * uA;
    // Contorno oscuro grueso en el borde, como el resto del estilo (pegatina)
    col = mix(col, uInk, smoothstep(0.32, 0.0, ndv) * 0.8);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createKnot(lowPower = false): KnotScene {
  const renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    dpr: Math.min(devicePixelRatio || 1, lowPower ? 1.2 : 1.8),
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const camera = new Camera(gl, { fov: 32 });
  camera.position.set(0, 0, 7.4);
  const scene = new Transform();
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uLight: { value: [0.3, 0.5] },
      uA: { value: readColor('--accent') },
      uB: { value: readColor('--pink') },
      uC: { value: readColor('--sky') },
      uInk: { value: readColor('--potato-line') },
    },
  });
  const mesh = new Mesh(gl, {
    geometry: knotGeometry(gl, 2, 3, lowPower ? 150 : 240, lowPower ? 14 : 22),
    program,
  });
  mesh.setParent(scene);

  let spin = 0; // giro extra por el clic, se amortigua solo
  let rx = 0;
  let ry = 0;
  return {
    canvas: gl.canvas as HTMLCanvasElement,
    resize(w, h) {
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
    },
    frame(t, input) {
      spin += input.kick;
      spin *= 0.96;
      rx += (input.lookY * 0.5 + 0.35 - rx) * 0.05;
      ry += (input.lookX * 0.7 + input.progress * Math.PI * 2 - ry) * 0.05;
      mesh.rotation.x = rx + t * 0.07;
      mesh.rotation.y = ry + t * 0.13 + spin;
      mesh.rotation.z = Math.sin(t * 0.3) * 0.15;
      program.uniforms.uTime!.value = t;
      program.uniforms.uLight!.value = [input.lookX * 0.9, -input.lookY * 0.9];
      renderer.render({ scene, camera });
    },
    colors() {
      program.uniforms.uA!.value = readColor('--accent');
      program.uniforms.uB!.value = readColor('--pink');
      program.uniforms.uC!.value = readColor('--sky');
      program.uniforms.uInk!.value = readColor('--potato-line');
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
