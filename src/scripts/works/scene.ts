/**
 * Escena de «pantallas curvas» (proyectos): una hoja con rejilla y cruces `+` y, pegadas a ella,
 * las pantallas de cada proyecto (captura, vídeo o marcador). TODO se deforma con la MISMA
 * función en el vertex shader (`deform`): la hoja gira (guiñada), se dobla en un pliegue («doblez»)
 * y una onda viaja por ella al hacer scroll («ola»); la hoja y las pantallas se mueven juntas.
 * La luz se calcula con la normal deformada, así que el pliegue y la onda se ven como sombras.
 * Sin modelos ni dependencias de pago: OGL + dos shaders propios. Idea inspirada en referencias
 * de estudios creativos; implementación propia.
 */
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { readColor } from '../tokens';

/** Origen de una pantalla: imagen, canvas (marcador) o vídeo (se refresca mientras se reproduce). */
export interface ScreenSource {
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
  aspect: number;
  live?: boolean;
}

export interface WorksInput {
  /** Posición continua en el carrusel (0 = primera pantalla, N−1 = última). */
  p: number;
  /** Entrada de la sección: 0 = asoma por abajo, 1 = ya fijada. */
  enter: number;
  /** Energía de la ola (0–1), sale de la velocidad del scroll. */
  vel: number;
  /** Cursor normalizado −1…1. */
  mouse: [number, number];
}

export interface WorksScene {
  canvas: HTMLCanvasElement;
  resize(width: number, height: number): void;
  frame(time: number, input: WorksInput): void;
  /** Cambia el origen de una pantalla (p. ej. del póster al vídeo, o un marcador redibujado). */
  setSource(index: number, src: ScreenSource): void;
  colors(): void;
  destroy(): void;
}

/** Tamaño de cada pantalla (unidades de escena) y separación entre centros. */
export const SCREEN_W = 7.4;
export const SCREEN_H = SCREEN_W / 1.6;
export const SPACING = 12.6;
const PAD = 0.7; // margen del plano para dibujar las cruces de las esquinas
const FOV = 30;

// ── GLSL común: la hoja deformada ──
const DEFORM = /* glsl */ `
  uniform float uCam;    // desplazamiento del carrusel (unidades)
  uniform float uShift;  // la pantalla activa se coloca a un lado (deja sitio al texto)
  uniform float uVel;
  uniform float uTime;
  uniform float uPhase;
  uniform float uYaw;
  uniform float uEnter;
  uniform vec2 uMouse;

  float softplus(float x) { return x > 14.0 ? x : log(1.0 + exp(x)); }

  // cx: x relativa al centro de la vista (antes de girar); y: altura; lift: separación de la hoja
  vec3 deform(float cx, float y, float lift) {
    float arrive = 1.0 - uEnter;
    float yaw = uYaw + uMouse.x * 0.07 + arrive * 0.45;
    // doblez: una rodilla suave a la derecha del centro; más allá la hoja se aleja más deprisa
    float knee = softplus((cx - 2.2) / 1.5) * 1.5;
    float z = -knee * (0.46 + arrive * 0.5);
    // ola: viaja con el scroll y respira en reposo; menos intensa en el centro para poder leer
    float env = 0.18 + 0.82 * smoothstep(0.5, 6.0, abs(cx));
    float amp = 0.16 + 1.1 * uVel + 0.7 * arrive;
    z += (sin(cx * 0.85 + uPhase * 2.4 + uTime * 0.5 + y * 0.3)
        + 0.5 * sin(cx * 1.9 - uPhase * 3.2 + y * 0.9 + uTime * 0.3)) * amp * env * 0.5;
    z += lift;
    // la hoja se comba un poco hacia arriba y abajo
    z -= y * y * 0.025;
    float ca = cos(yaw);
    float sa = sin(yaw);
    float x = cx * ca + z * sa;
    float zz = -cx * sa + z * ca;
    return vec3(x, y + uMouse.y * 0.18 - cx * 0.03, zz);
  }

  vec3 deformNormal(float cx, float y, float lift) {
    float e = 0.06;
    vec3 a = deform(cx + e, y, lift) - deform(cx - e, y, lift);
    vec3 b = deform(cx, y + e, lift) - deform(cx, y - e, lift);
    return normalize(cross(a, b));
  }
`;

const sheetVertex = /* glsl */ `
  attribute vec3 position;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  ${DEFORM}
  varying vec2 vWorld;
  varying vec3 vN;
  varying float vCx;
  varying float vDist;
  void main() {
    float cx = position.x;
    vec3 p = deform(cx, position.y, 0.0);
    vN = deformNormal(cx, position.y, 0.0);
    vWorld = vec2(cx + uCam - uShift, position.y);
    vCx = cx;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const sheetFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uBg;
  uniform vec3 uSheet;
  uniform vec3 uLine;
  uniform float uPx;
  uniform vec2 uRes;
  varying vec2 vWorld;
  varying vec3 vN;
  varying float vCx;
  varying float vDist;
  void main() {
    vec3 n = normalize(vN);
    vec3 L = normalize(vec3(-0.55, 0.4, 0.75));
    float lit = clamp(dot(n, L), 0.0, 1.0);
    float shade = 0.22 + 1.35 * lit;
    vec3 col = uSheet * shade;

    // rejilla fina + rejilla mayor (cada 4) + cruces «+» en los cruces mayores
    float C = 0.95;
    vec2 g = vWorld / C;
    vec2 f = abs(fract(g - 0.5) - 0.5);
    float px = vDist * uPx / C;
    float fine = 1.0 - smoothstep(px * 0.5, px * 1.5, min(f.x, f.y));
    vec2 gm = vWorld / (C * 4.0);
    vec2 fm = abs(fract(gm - 0.5) - 0.5);
    float pxm = vDist * uPx / (C * 4.0);
    float major = 1.0 - smoothstep(pxm * 0.5, pxm * 1.6, min(fm.x, fm.y));
    vec2 fi = abs(gm - floor(gm + 0.5));
    float arm = 0.07;
    float plus = max(step(fi.y, pxm * 0.8) * step(fi.x, arm), step(fi.x, pxm * 0.8) * step(fi.y, arm));

    vec3 lineCol = uLine * (0.45 + 0.9 * lit);
    col = mix(col, lineCol, fine * 0.24 + major * 0.42);
    col = mix(col, uLine, plus * 0.9);

    // se funde con el fondo hacia los lados y con una viñeta
    float fade = exp(-abs(vCx) * 0.075);
    col = mix(uBg, col, fade);
    vec2 sp = gl_FragCoord.xy / uRes - 0.5;
    col *= 1.0 - dot(sp, sp) * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const screenVertex = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uX;
  ${DEFORM}
  varying vec2 vUv;
  varying vec3 vN;
  varying float vDist;
  void main() {
    vUv = uv;
    float cx = uX - uCam + uShift + position.x;
    vec3 p = deform(cx, position.y, 0.03);
    vN = deformNormal(cx, position.y, 0.03);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const screenFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTexAspect;
  uniform float uFocus;
  uniform float uVel;
  uniform float uPx;
  uniform vec2 uPlane;   // tamaño del plano (con margen)
  uniform vec2 uInner;   // tamaño de la pantalla
  uniform vec3 uLine;
  uniform vec3 uBg;
  varying vec2 vUv;
  varying vec3 vN;
  varying float vDist;
  void main() {
    vec2 p = (vUv - 0.5) * uPlane;           // posición en unidades de escena
    vec2 q = abs(p);
    vec2 half_ = uInner * 0.5;
    float px = vDist * uPx;
    vec2 inside = half_ - q;                  // >0 dentro de la pantalla
    float edge = min(inside.x, inside.y);

    // cruces «+» fuera de cada esquina y marco fino
    vec2 cc = q - half_;                      // relativo a la esquina
    float arm = 0.34;
    float cross_ = max(step(abs(cc.y), px * 0.9) * step(abs(cc.x), arm), step(abs(cc.x), px * 0.9) * step(abs(cc.y), arm));
    float frame = 1.0 - smoothstep(px * 0.6, px * 1.8, abs(edge));

    if (edge < 0.0) {
      float k = max(cross_, frame);
      if (k < 0.01) discard;
      gl_FragColor = vec4(uLine * 0.7, 1.0);
      return;
    }

    // «cover»: la textura llena la pantalla sin deformarse
    float sa = uInner.x / uInner.y;
    vec2 s = uTexAspect > sa ? vec2(sa / uTexAspect, 1.0) : vec2(1.0, uTexAspect / sa);
    vec2 tuv = ((p / uInner) + 0.5);
    tuv = (tuv - 0.5) * s + 0.5;
    // al moverse, un poco de separación RGB (rastro de la ola)
    vec2 off = vec2(uVel * 0.006, 0.0);
    vec3 c;
    c.r = texture2D(uTex, tuv + off).r;
    c.g = texture2D(uTex, tuv).g;
    c.b = texture2D(uTex, tuv - off).b;

    vec3 n = normalize(vN);
    vec3 L = normalize(vec3(-0.55, 0.4, 0.75));
    float lit = 0.62 + 0.55 * clamp(dot(n, L), 0.0, 1.0);
    c *= lit * (0.32 + 0.68 * uFocus);
    c = mix(uBg * 0.6, c, 0.5 + 0.5 * uFocus);

    c = mix(c, uLine * 0.8, frame * 0.7);
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function createWorksScene(sources: ScreenSource[], lowPower = false): WorksScene {
  const renderer = new Renderer({
    alpha: false,
    antialias: false,
    dpr: Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5),
  });
  const gl = renderer.gl;
  gl.disable(gl.DEPTH_TEST);
  const camera = new Camera(gl, { fov: FOV, near: 0.1, far: 200 });
  const root = new Transform();

  const shared = {
    uCam: { value: 0 },
    uShift: { value: 0 },
    uVel: { value: 0 },
    uTime: { value: 0 },
    uPhase: { value: 0 },
    uYaw: { value: 0.38 },
    uEnter: { value: 1 },
    uMouse: { value: [0, 0] },
    uBg: { value: [0, 0, 0] },
    uLine: { value: [1, 1, 1] },
    uPx: { value: 0.001 },
    uRes: { value: [1, 1] },
  };

  const segs = lowPower ? [110, 30] : [170, 44];
  const sheet = new Mesh(gl, {
    geometry: new Plane(gl, {
      width: 52,
      height: 26,
      widthSegments: segs[0],
      heightSegments: segs[1],
    }),
    program: new Program(gl, {
      vertex: sheetVertex,
      fragment: sheetFragment,
      uniforms: { ...shared, uSheet: { value: [0.1, 0.1, 0.1] } },
      cullFace: null,
      depthTest: false,
    }),
  });
  sheet.setParent(root);

  const tiles = sources.map((src, i) => {
    const texture = new Texture(gl, {
      image: src.source,
      // mipmaps solo con WebGL2 (las texturas no son potencia de 2) y en imágenes fijas
      generateMipmaps: !src.live && renderer.isWebgl2,
      minFilter: !src.live && renderer.isWebgl2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });
    const program = new Program(gl, {
      vertex: screenVertex,
      fragment: screenFragment,
      uniforms: {
        ...shared,
        uX: { value: i * SPACING },
        uTex: { value: texture },
        uTexAspect: { value: src.aspect },
        uFocus: { value: 0 },
        uPlane: { value: [SCREEN_W + PAD * 2, SCREEN_H + PAD * 2] },
        uInner: { value: [SCREEN_W, SCREEN_H] },
      },
      cullFace: null,
      depthTest: false,
    });
    const mesh = new Mesh(gl, {
      geometry: new Plane(gl, {
        width: SCREEN_W + PAD * 2,
        height: SCREEN_H + PAD * 2,
        widthSegments: lowPower ? 44 : 64,
        heightSegments: lowPower ? 30 : 42,
      }),
      program,
    });
    mesh.setParent(root);
    return { mesh, program, texture, live: !!src.live, x: i * SPACING };
  });

  const colors = () => {
    const bg = readColor('--bg');
    const ink = readColor('--ink');
    const soft = readColor('--bg-soft');
    shared.uBg.value = bg;
    shared.uLine.value = ink.map((v, k) => bg[k]! + (v - bg[k]!) * 0.85);
    // la hoja es más clara que el fondo para que el relieve (pliegue y ola) se lea con la luz
    sheet.program.uniforms.uSheet!.value = soft.map(
      (v, k) => v * 0.55 + ink[k]! * 0.1 + bg[k]! * 0.35,
    );
  };
  colors();

  let aspect = 1;
  let width = 1;
  let height = 1;
  const layout = () => {
    const portrait = aspect < 1;
    // distancia de cámara: en horizontal la pantalla ocupa ~58 % del ancho; en vertical, ~86 %
    const fitW = (SCREEN_W + 1.2) / (portrait ? 0.9 : 0.62);
    const z = Math.max(13, fitW / aspect / (2 * Math.tan((FOV * Math.PI) / 360)));
    camera.perspective({ fov: FOV, aspect, near: 0.1, far: 200 });
    camera.position.set(0, 0, z);
    camera.lookAt([0, 0, 0]);
    const viewW = 2 * Math.tan((FOV * Math.PI) / 360) * z * aspect;
    const viewH = viewW / aspect;
    shared.uShift.value = portrait ? 0 : -viewW * 0.135;
    // en vertical la pantalla sube para dejar sitio al texto debajo
    camera.position.y = portrait ? -viewH * 0.19 : 0;
    camera.lookAt([0, camera.position.y, 0]);
    // unidades de escena por píxel (del búfer, no CSS) a distancia 1
    const bufH = gl.canvas.height || height;
    shared.uPx.value = (2 * Math.tan((FOV * Math.PI) / 360)) / bufH;
    shared.uRes.value = [gl.canvas.width || width, bufH];
    shared.uYaw.value = portrait ? 0.22 : 0.38;
  };

  return {
    canvas: gl.canvas as HTMLCanvasElement,
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      aspect = width / height;
      renderer.setSize(width, height);
      layout();
    },
    frame(time, input) {
      shared.uTime.value = time;
      shared.uCam.value = input.p * SPACING;
      shared.uPhase.value = input.p;
      shared.uVel.value = input.vel;
      shared.uEnter.value = input.enter;
      shared.uMouse.value = input.mouse;
      // las pantallas más lejanas se pintan primero (sin test de profundidad)
      const order = tiles
        .map((t) => ({ t, d: Math.abs(t.x - input.p * SPACING) }))
        .sort((a, b) => b.d - a.d);
      root.children = [sheet, ...order.map((o) => o.t.mesh)];
      for (const t of tiles) {
        const dx = Math.abs(t.x - input.p * SPACING);
        t.mesh.visible = dx < SPACING * 2.6;
        t.program.uniforms.uFocus!.value = Math.max(0, 1 - dx / (SPACING * 0.75));
        if (t.live && dx < SPACING * 1.1) t.texture.needsUpdate = true;
      }
      renderer.render({ scene: root, camera, sort: false, frustumCull: false });
    },
    setSource(index, src) {
      const t = tiles[index];
      if (!t) return;
      t.texture.image = src.source;
      t.live = !!src.live;
      t.program.uniforms.uTexAspect!.value = src.aspect;
      t.texture.needsUpdate = true;
    },
    colors,
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
