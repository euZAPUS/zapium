/** Opción A del hero: orbe orgánico (esfera deformada por ruido) con brillo y borde de luz. */
import { Camera, Mesh, Program, Renderer, Sphere, Transform } from 'ogl';
import { readColor } from '../tokens';
import type { HeroScene } from './types';

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;
  uniform float uTime;
  uniform vec3 uPointer;
  varying vec3 vNormal;
  varying vec3 vPos;

  float field(vec3 p) {
    float t = uTime * 0.55;
    return sin(p.x * 2.3 + t) * cos(p.y * 2.1 - t * 0.8) * 0.6
         + sin(p.z * 2.9 + t * 0.7 + p.x) * 0.4
         + dot(normalize(p), uPointer) * 0.35;
  }

  void main() {
    float amp = 0.17;
    float f = field(position);
    vec3 displaced = position + normal * f * amp;

    // Normal aproximada con el gradiente del campo
    float e = 0.02;
    vec3 grad = vec3(field(position + vec3(e, 0., 0.)) - f,
                     field(position + vec3(0., e, 0.)) - f,
                     field(position + vec3(0., 0., e)) - f) / e;
    vec3 n = normalize(normal - amp * (grad - dot(grad, normal) * normal));

    vNormal = normalize(normalMatrix * n);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform vec3 uA;
  uniform vec3 uB;
  varying vec3 vNormal;
  varying vec3 vPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vPos);
    vec3 L = normalize(vec3(-0.45, 0.75, 0.85));
    float diff = max(dot(N, L), 0.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 36.0);

    vec3 base = mix(uB, uA, smoothstep(-0.9, 0.7, N.y * 0.8 + N.x * 0.35));
    vec3 col = base * (0.55 + 0.6 * diff) + uB * fres * 0.7 + vec3(spec) * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createOrb(): HeroScene {
  const dpr = Math.min(devicePixelRatio || 1, (navigator.hardwareConcurrency ?? 4) <= 2 ? 1 : 1.75);
  const renderer = new Renderer({ alpha: true, antialias: true, dpr });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const camera = new Camera(gl, { fov: 35 });
  camera.position.z = 5;

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: [0, 0, 0] },
      uA: { value: readColor('--accent') },
      uB: { value: readColor('--accent-2') },
    },
  });
  const mesh = new Mesh(gl, {
    geometry: new Sphere(gl, { radius: 1, widthSegments: 96, heightSegments: 96 }),
    program,
  });
  const scene = new Transform();
  mesh.setParent(scene);

  const smooth = { x: 0, y: 0 };
  return {
    canvas: gl.canvas as HTMLCanvasElement,
    resize(w, h) {
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
    },
    frame(t, pointer) {
      smooth.x += (pointer.x - smooth.x) * 0.06;
      smooth.y += (pointer.y - smooth.y) * 0.06;
      program.uniforms.uTime!.value = t;
      program.uniforms.uPointer!.value = [smooth.x, -smooth.y, 0.6];
      mesh.rotation.y = t * 0.12 + smooth.x * 0.4;
      mesh.rotation.x = smooth.y * 0.25;
      renderer.render({ scene, camera });
    },
    colors() {
      program.uniforms.uA!.value = readColor('--accent');
      program.uniforms.uB!.value = readColor('--accent-2');
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
