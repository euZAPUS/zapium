/**
 * Escena del hero: la patata en 3D (losa extruida a partir de las capas de SU dibujo original; la cara lleva el
 * dibujo como textura, el canto es negro lacado) y, detrás, la «otra dimensión»: un túnel cebra en espiral que se
 * abre como un iris desde la patata mientras se hace scroll. OGL + shaders propios, sin modelos ni dependencias.
 * Dos pasadas sobre el mismo lienzo: 1) túnel (sin profundidad), 2) patata (con profundidad).
 */
import { Camera, Geometry, Mesh, Program, Renderer, Texture, Transform, Triangle } from 'ogl';
import { readColor } from '../tokens';
import { buildSlab, type Pt } from './geometry';
import outlines from './outlines.json';

export interface PotatoFrame {
  time: number;
  /** Pivote de la patata y ancho de la caja de la imagen (1506 px de la capa), en px CSS del lienzo. */
  x: number;
  y: number;
  size: number;
  /** Escala extra (1 = reposo) y giros en radianes. */
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  /** Radio del iris de la otra dimensión (en alturas de pantalla; 0 = no se ve) y avance del túnel. */
  iris: number;
  flow: number;
  /** 0 = nada, 1 = el túnel se funde con el color del fondo (final de la secuencia). */
  fade: number;
  /** Cuánto del entorno reflejado es la cebra de la otra dimensión (0-1). */
  dim: number;
  /** Cursor (-1..1) y balanceo extra de los brazos (0-1). */
  mouse: [number, number];
  sway: number;
}

export interface PotatoScene {
  canvas: HTMLCanvasElement;
  resize(width: number, height: number): void;
  frame(f: PotatoFrame): void;
  colors(): void;
  destroy(): void;
}

const [W0, H0] = outlines.size as [number, number];
const PIVOT = outlines.pivot as Pt;
const SCALE = 1 / W0; // la caja de la imagen mide 1 de ancho

// ── Shaders ────────────────────────────────────────────────────────────────

const tunnelVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

/** Túnel cebra en espiral con aberración cromática; se ve solo dentro de un iris que crece desde `uCenter`. */
const tunnelFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uRes;
  uniform vec2 uCenter;
  uniform float uIris;
  uniform float uFlow;
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uLight;
  uniform vec3 uDark;
  uniform vec3 uAccent;
  uniform vec3 uBg;

  // Coordenada de la franja: profundidad del túnel + ángulo (espiral) − avance
  float stripe(vec2 p, float r) {
    float z = 0.30 / (r + 0.05);
    float ang = atan(p.y, p.x) / 6.28318;
    // anillos que avanzan hacia fuera (vuelo hacia delante) + espiral de 4 brazos + un poco de ondulación orgánica
    return z * 3.0 + ang * 4.0 + sin(ang * 12.566 + z * 1.4 + uTime * 0.3) * 0.22 + uFlow;
  }
  float zebra(float s, float px) {
    float tri = abs(fract(s) - 0.5) * 2.0;
    float w = px;
    return smoothstep(0.5 - w, 0.5 + w, tri);
  }
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.7, 289.3))) * 43758.5453);
  }

  void main() {
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 p = (vUv - uCenter) * asp;
    float r = length(p);
    float px = 1.0 / uRes.y;
    float d = r - uIris;
    if (d > 0.12) { gl_FragColor = vec4(0.0); return; }

    // Anchura (en unidades de franja) de un píxel, para suavizar el borde de cada franja
    float ds = 0.9 / ((r + 0.05) * (r + 0.05)) + 6.0 / (6.28318 * max(r, 0.03));
    float w = clamp(ds * px * 1.4, 0.002, 0.45);

    float ca = 0.006 * (0.35 + r);
    float sr = stripe(p, r * (1.0 - ca));
    float sg = stripe(p, r);
    float sb = stripe(p, r * (1.0 + ca));
    float zr = zebra(sr, w);
    float zg = zebra(sg, w);
    float zb = zebra(sb, w);
    vec3 lit = uLight * 0.93;
    vec3 col = vec3(mix(uDark.r, lit.r, zr), mix(uDark.g, lit.g, zg), mix(uDark.b, lit.b, zb));

    // Una franja de cada siete se enciende en naranja (el único color vivo)
    float id = floor(sg);
    float acc = step(6.5, mod(id, 8.0)) * zg;
    col = mix(col, uAccent, acc);

    // Hacia el punto de fuga se funde a oscuro (ahí vive la patata) y el borde del iris lleva una línea fina
    col = mix(uDark, col, smoothstep(0.02, 0.28, r));
    float rim = smoothstep(2.4 * px, 0.0, abs(d));
    col = mix(col, uAccent, rim * 0.9);
    col = mix(col, uBg, uFade);
    col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.02;

    float inside = 1.0 - smoothstep(-px, px, d);
    // Fuera del iris: un halo naranja muy tenue (la luz que se escapa de la otra dimensión)
    float glow = d > 0.0 ? exp(-d * 22.0) * 0.16 * (1.0 - uFade) : 0.0;
    gl_FragColor = vec4(col * inside + uAccent * glow * (1.0 - inside), inside + glow * (1.0 - inside));
  }
`;

const potatoVertex = /* glsl */ `
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vObj;
  varying vec2 vUv;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    vObj = normal;
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * Cara = el dibujo original (sin retocar: en reposo sale tal cual) con un brillo que lo recorre al girar;
 * canto y bisel = negro lacado que refleja un «estudio» y, en la otra dimensión, la cebra.
 */
const potatoFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uDim;
  uniform vec3 uLight;
  uniform vec3 uDark;
  uniform vec3 uAccent;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vObj;
  varying vec2 vUv;

  vec3 studio(vec3 R) {
    vec3 c = mix(vec3(0.012), vec3(0.085), R.y * 0.5 + 0.5);
    c += smoothstep(0.78, 0.96, dot(R, normalize(vec3(-0.5, 0.7, 0.55)))) * 1.7;        // caja de luz principal
    c += smoothstep(0.94, 0.995, dot(R, normalize(vec3(0.9, 0.15, -0.25)))) * 1.3;       // tira de contraluz
    c += smoothstep(0.7, 0.97, dot(R, normalize(vec3(0.35, -0.6, 0.7)))) * 0.28;         // relleno
    c += smoothstep(0.88, 0.97, R.y) * 0.55;                                              // techo
    return c;
  }
  vec3 zebraEnv(vec3 R) {
    float s = R.x * 1.7 + R.y * 1.2 + R.z * 0.8 + uTime * 0.08;
    float z = smoothstep(0.4, 0.6, abs(fract(s) - 0.5) * 2.0);
    return mix(uDark, uLight, z) * 0.9;
  }
  vec3 env(vec3 R) {
    return mix(studio(R), zebraEnv(R), uDim * 0.7);
  }

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    vec3 R = reflect(-V, N);
    float cap = smoothstep(0.86, 0.985, abs(normalize(vObj).z));
    vec3 e = env(R);
    float f = pow(1.0 - ndv, 3.0);

    // Cara: el dibujo + brillo de esmalte que se desliza al girar + reflejo en los ángulos rasantes
    vec4 tex = texture2D(uTex, vUv);
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float sheen = pow(max(dot(R, normalize(vec3(-0.35, 0.55, 0.75))), 0.0), 18.0);
    vec3 face = tex.rgb * mix(0.84, 1.0, smoothstep(0.1, 0.8, ndv));
    face += sheen * vec3(1.0, 0.96, 0.88) * 0.34;
    face += e * (0.05 * (1.0 - luma) + 0.3 * f);

    // Canto: negro lacado; casi no refleja de frente y mucho en rasante (barniz)
    vec3 side = vec3(0.012) + e * (0.1 + 0.9 * f) * 0.85;

    vec3 col = mix(side, face, cap);
    gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
  }
`;

// ── Escena ─────────────────────────────────────────────────────────────────

interface Part {
  mesh: Mesh;
  pivot: Transform;
  program: Program;
}

export function createPotatoScene(
  textures: { body: HTMLImageElement; armL: HTMLImageElement; armR: HTMLImageElement },
  lowPower = false,
): PotatoScene {
  const renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    dpr: Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.6),
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const camera = new Camera(gl, { fov: 24, near: 10, far: 20000 });

  // Paleta (tokens): cebra clara/oscura, naranja y fondo
  const pal = () => ({
    light: readColor('--ink'),
    dark: readColor('--bg'),
    accent: readColor('--accent'),
  });
  let colors = pal();

  // — Túnel (pasada 1) —
  const tunnelScene = new Transform();
  const tunnelProgram = new Program(gl, {
    vertex: tunnelVertex,
    fragment: tunnelFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
    uniforms: {
      uRes: { value: [1, 1] },
      uCenter: { value: [0.5, 0.5] },
      uIris: { value: 0 },
      uFlow: { value: 0 },
      uTime: { value: 0 },
      uFade: { value: 0 },
      uLight: { value: colors.light },
      uDark: { value: colors.dark },
      uAccent: { value: colors.accent },
      uBg: { value: colors.dark },
    },
  });
  const tunnel = new Mesh(gl, { geometry: new Triangle(gl), program: tunnelProgram });
  tunnel.frustumCulled = false;
  tunnel.setParent(tunnelScene);

  // — Patata (pasada 2): cuerpo + dos brazos, cada uno extruido de su capa —
  const potatoScene = new Transform();
  const root = new Transform();
  root.rotation.order = 'YXZ';
  root.setParent(potatoScene);

  const layers = outlines.layers as unknown as Record<string, { points: Pt[] }>;
  const makePart = (
    name: 'body' | 'arm-l' | 'arm-r',
    image: HTMLImageElement,
    depth: number,
    bevel: number,
    shoulder: Pt | null,
  ): Part => {
    const slab = buildSlab({
      outline: layers[name]!.points,
      size: [W0, H0],
      pivot: PIVOT,
      scale: SCALE,
      depth,
      bevel,
      steps: lowPower ? 4 : 6,
    });
    const geometry = new Geometry(gl, {
      position: { size: 3, data: slab.position },
      normal: { size: 3, data: slab.normal },
      uv: { size: 2, data: slab.uv },
      index: { data: slab.index },
    });
    const texture = new Texture(gl, {
      image,
      generateMipmaps: renderer.isWebgl2,
      minFilter: renderer.isWebgl2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      anisotropy: 4,
    });
    const program = new Program(gl, {
      vertex: potatoVertex,
      fragment: potatoFragment,
      uniforms: {
        uTex: { value: texture },
        uTime: { value: 0 },
        uDim: { value: 0 },
        uLight: { value: colors.light },
        uDark: { value: colors.dark },
        uAccent: { value: colors.accent },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    mesh.frustumCulled = false;
    // El brazo gira alrededor del hombro: un nudo en el hombro y la malla desplazada en sentido contrario
    const pivot = new Transform();
    if (shoulder) {
      const sx = (shoulder[0] - PIVOT[0]) * SCALE;
      const sy = -(shoulder[1] - PIVOT[1]) * SCALE;
      pivot.position.set(sx, sy, 0);
      mesh.position.set(-sx, -sy, 0);
    }
    mesh.setParent(pivot);
    pivot.setParent(root);
    return { mesh, pivot, program };
  };
  const end = (name: string, pick: 'max' | 'min'): Pt => {
    const pts = layers[name]!.points;
    const xs = pts.map((p) => p[0]);
    const x = pick === 'max' ? Math.max(...xs) : Math.min(...xs);
    const near = pts.filter((p) => Math.abs(p[0] - x) < 18);
    return [x - 6, near.reduce((a, p) => a + p[1], 0) / Math.max(1, near.length)];
  };
  const body = makePart('body', textures.body, 62, 24, null);
  const armL = makePart('arm-l', textures.armL, 15, 12, end('arm-l', 'max'));
  const armR = makePart('arm-r', textures.armR, 15, 12, end('arm-r', 'min'));
  const parts = [body, armL, armR];

  let width = 1;
  let height = 1;
  return {
    canvas: gl.canvas as HTMLCanvasElement,
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height);
      // 1 unidad del mundo = 1 px CSS en el plano z = 0
      const dist = height / 2 / Math.tan((24 * Math.PI) / 360);
      camera.perspective({ aspect: width / height, near: dist * 0.2, far: dist * 4 });
      camera.position.set(0, 0, dist);
      camera.lookAt([0, 0, 0]);
      tunnelProgram.uniforms.uRes!.value = [width * renderer.dpr, height * renderer.dpr];
    },
    frame(f) {
      root.position.set(f.x - width / 2, -(f.y - height / 2), 0);
      const s = Math.max(1e-4, f.size * f.scale);
      root.scale.set(s, s, s);
      root.rotation.set(f.rotX, f.rotY, f.rotZ);
      // Brazos: balanceo suave (más al saludar) con fases distintas
      const sw = 0.1 + 0.2 * f.sway;
      armL.pivot.rotation.z = Math.sin(f.time * 1.9) * sw;
      armR.pivot.rotation.z = Math.sin(f.time * 1.9 + 2.2) * sw;
      for (const p of parts) {
        p.program.uniforms.uTime!.value = f.time;
        p.program.uniforms.uDim!.value = f.dim;
      }
      const u = tunnelProgram.uniforms;
      u.uTime!.value = f.time;
      u.uIris!.value = f.iris;
      u.uFlow!.value = f.flow;
      u.uFade!.value = f.fade;
      u.uCenter!.value = [(f.x + f.mouse[0] * 10) / width, 1 - (f.y + f.mouse[1] * 8) / height];
      renderer.render({ scene: tunnelScene, camera, sort: false, frustumCull: false });
      renderer.render({
        scene: potatoScene,
        camera,
        clear: false,
        sort: false,
        frustumCull: false,
      });
    },
    colors() {
      colors = pal();
      const set = (prog: Program) => {
        const u = prog.uniforms;
        u.uLight!.value = colors.light;
        u.uDark!.value = colors.dark;
        u.uAccent!.value = colors.accent;
      };
      set(tunnelProgram);
      tunnelProgram.uniforms.uBg!.value = colors.dark;
      parts.forEach((p) => set(p.program));
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
