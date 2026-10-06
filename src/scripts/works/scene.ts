/**
 * Escena de «pantallas flotantes» (proyectos). Dos capas SEPARADAS, como en las referencias de estudios
 * creativos (implementación propia, solo ideas):
 *  1. FONDO: una pared cilíndrica de baldosas vista desde dentro (un único shader a pantalla completa:
 *     rayo → cilindro → baldosas con huecos, cruces `+` y fundido). Cada baldosa toma el color del
 *     proyecto activo (la captura/vídeo muestreada en mosaico, apagada) y la pared se desplaza más
 *     despacio que las pantallas (paralaje), así que las pantallas NO van pegadas a ella.
 *  2. PANELES: una pantalla 3D suelta por proyecto, flotando delante: ligeramente convexa, con lente
 *     (barril) y aberración cromática, borde de cristal, viñeta, giro hacia el centro (coverflow) y una
 *     onda que la recorre cuando se hace scroll rápido (el «doblez/ola»). Flotan (vaivén suave).
 */
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform, Triangle } from 'ogl';
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

/** Tamaño de cada panel (unidades de escena). Aspecto 16:10 como las capturas. */
const PANEL_W = 5.65;
const PANEL_H = PANEL_W / 1.6;
const SPACING = PANEL_W * 1.3; // distancia entre centros de paneles consecutivos
const FOV = 35;

// ───────────────────────── Fondo: pared cilíndrica de baldosas ─────────────────────────
const wallVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const wallFragment = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uScroll;
  uniform float uVel;
  uniform float uMix;
  uniform float uLight;
  uniform float uArrive;
  uniform vec2 uMouse;
  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform vec3 uBg;
  uniform vec3 uTile;
  uniform vec3 uLine;
  uniform vec3 uAccent;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= aspect;

    // Cámara DENTRO del cilindro y retrasada: el centro queda más lejos que los bordes (las líneas se curvan)
    const float R = 1.0;
    const float F = 1.5;
    vec3 ro = vec3(uMouse.x * 0.06, uMouse.y * 0.04, 0.5);
    vec3 rd = normalize(vec3(p.x, p.y, -F));
    float a = dot(rd.xz, rd.xz);
    float b = dot(ro.xz, rd.xz);
    float c = dot(ro.xz, ro.xz) - R * R;
    float t = (-b + sqrt(max(b * b - a * c, 0.0))) / a;
    vec3 hit = ro + rd * t;
    float ang = atan(hit.x, -hit.z);

    // Coordenadas sobre la pared (arco, altura); se desplaza despacio con el scroll (paralaje)
    float S = 0.088;
    vec2 uv = vec2(ang * R + uScroll + uTime * 0.004, hit.y);
    uv.y += uArrive * 0.3;

    // «Quad-tree» sencillo: algunos bloques 2×2 se funden en una baldosa grande
    vec2 block = floor(uv / (S * 2.0));
    float merge = step(0.62, hash(block + 3.1));
    float sz = mix(S, S * 2.0, merge);
    vec2 cid = floor(uv / sz);
    vec2 f = fract(uv / sz);
    vec2 center = (cid + 0.5) * sz;

    // Color de la baldosa: el proyecto activo, muestreado en el punto de pantalla donde cae su centro
    float angC = (center.x - uScroll - uTime * 0.004) / R;
    vec3 P = vec3(R * sin(angC), center.y, -R * cos(angC));
    vec3 dd = P - ro;
    vec2 suv = vec2(dd.x / (-dd.z) * F / aspect, dd.y / (-dd.z) * F) * 0.5 + 0.5;
    suv = clamp(suv, 0.02, 0.98);
    vec3 mA = texture2D(uTexA, suv).rgb;
    vec3 mB = texture2D(uTexB, suv).rgb;
    vec3 media = mix(mA, mB, uMix);
    float hv = hash(cid + 7.7);
    vec3 col = uTile * mix(0.75 + 0.5 * hv, 0.94 + 0.12 * hv, uLight);
    col = mix(col, media * mix(0.55 + 0.4 * hv, 0.95, uLight), mix(0.62, 0.22, uLight));

    // Huecos oscuros entre baldosas + un filo fino de luz; la distancia al borde se mide en la pared
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * sz;
    float px = t * (2.0 / (F * uRes.y)); // tamaño de un píxel sobre la pared
    float gw = 0.0035;
    float gap = 1.0 - smoothstep(gw, gw + px * 1.6, e);
    float edge = 1.0 - smoothstep(px * 0.5, px * 1.4, abs(e - gw - px * 1.4));
    col = mix(col, uBg * mix(0.55, 0.8, uLight), gap * 0.9);
    col = mix(col, uLine, edge * 0.2);

    // Cruces «+» cada 4 baldosas finas
    vec2 g4 = uv / (S * 4.0);
    vec2 fi = abs(g4 - floor(g4 + 0.5));
    float arm = 0.05;
    float plus = max(step(fi.y, px / (S * 4.0) * 0.9) * step(fi.x, arm), step(fi.x, px / (S * 4.0) * 0.9) * step(fi.y, arm));
    col = mix(col, uLine, plus * 0.6);

    // Fundido: oscuro hacia los lados (el cilindro se aleja), viñeta y respiración con la velocidad
    float side = smoothstep(1.9, 0.55, abs(ang));
    col *= mix(0.25, 1.0, side);
    vec2 sp = vUv - 0.5;
    col *= 1.0 - dot(sp, sp) * 0.9;
    col += uAccent * uVel * 0.04;
    col = mix(uBg, col, 1.0 - uArrive * 0.6);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ───────────────────────── Paneles flotantes ─────────────────────────
const panelVertex = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uO;        // distancia de este panel al activo (en paneles): i − p
  uniform float uSpacing;
  uniform vec2 uShift;     // desplazamiento del conjunto (deja sitio al texto)
  uniform float uTime;
  uniform float uVel;
  uniform float uPhase;
  uniform float uRot;
  uniform float uDepth;
  uniform float uArrive;
  uniform float uHalfW;
  uniform float uBow;
  uniform float uFloat;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying vec3 vN;

  // Forma local del panel (antes de colocarlo): convexo + onda viajera
  vec3 shape(vec2 q) {
    float nx = q.x / uHalfW;
    float z = (1.0 - nx * nx) * uBow;
    float env = 0.3 + 0.7 * abs(nx);
    z += sin(nx * 2.6 + uPhase * 3.2 + uTime * 0.7 + q.y * 0.45) * (0.025 + 0.6 * uVel) * env;
    // doblez: con velocidad, los bordes se curvan hacia atrás
    z -= nx * nx * nx * nx * uVel * 0.9;
    return vec3(q.x, q.y, z);
  }

  vec3 place(vec3 s, float yaw, float pitch) {
    float cy = cos(yaw);
    float sy = sin(yaw);
    vec3 r = vec3(s.x * cy + s.z * sy, s.y, -s.x * sy + s.z * cy);
    float cp = cos(pitch);
    float sp = sin(pitch);
    return vec3(r.x, r.y * cp - r.z * sp, r.y * sp + r.z * cp);
  }

  void main() {
    vUv = uv;
    float yaw = -uO * uRot + uMouse.x * 0.05;
    float pitch = uMouse.y * 0.03 + sin(uTime * 0.5 + uO * 2.3) * 0.012;
    vec3 s = shape(position.xy);
    float e = 0.05;
    vec3 dx = shape(position.xy + vec2(e, 0.0)) - shape(position.xy - vec2(e, 0.0));
    vec3 dy = shape(position.xy + vec2(0.0, e)) - shape(position.xy - vec2(0.0, e));
    vN = place(normalize(cross(dx, dy)), yaw, pitch);
    vec3 w = place(s, yaw, pitch);
    float bob = sin(uTime * 0.6 + uO * 1.9) * uFloat;
    w += vec3(uO * uSpacing + uShift.x + uMouse.x * -0.12 * (1.0 + abs(uO) * 0.4), uShift.y + bob + uMouse.y * -0.08 - uArrive * 2.2, -uDepth * uO * uO - uArrive * 5.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0);
  }
`;

const panelFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTexAspect;
  uniform float uPanelAspect;
  uniform float uFocus;
  uniform float uVel;
  uniform float uTime;
  uniform float uLight;
  uniform vec3 uBg;
  varying vec2 vUv;
  varying vec3 vN;

  vec2 lens(vec2 r, float k) { return r * (1.0 - k * dot(r, r)); }

  vec3 sampleCover(vec2 cuv) {
    vec2 s = uTexAspect > uPanelAspect ? vec2(uPanelAspect / uTexAspect, 1.0) : vec2(1.0, uTexAspect / uPanelAspect);
    return texture2D(uTex, cuv * s + 0.5).rgb;
  }

  void main() {
    vec2 cuv = vUv - 0.5;
    // Lente de barril con aberración cromática (cada canal con su distorsión; crece con la velocidad)
    float k = 0.1 + uVel * 0.16;
    vec3 c;
    c.r = sampleCover(lens(cuv, k)).r;
    c.g = sampleCover(lens(cuv, k + 0.015 + uVel * 0.02)).g;
    c.b = sampleCover(lens(cuv, k + 0.03 + uVel * 0.04)).b;

    // Luz con la normal curvada + viñeta suave hacia las esquinas
    vec3 n = normalize(vN);
    float lit = 0.8 + 0.3 * clamp(dot(n, normalize(vec3(-0.5, 0.45, 0.75))), 0.0, 1.0);
    c *= lit * smoothstep(0.98, 0.45, length(cuv * vec2(1.0, 1.15)));
    c *= mix(0.55, 1.0, uFocus);

    // Borde de cristal: filo claro con un destello iridiscente
    float ex = min(vUv.x, 1.0 - vUv.x) * uPanelAspect;
    float ey = min(vUv.y, 1.0 - vUv.y);
    float e = min(ex, ey);
    float rim = 1.0 - smoothstep(0.0, 0.012, e);
    vec3 irid = 0.55 + 0.45 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + vUv.x * 0.5 + vUv.y * 0.3 + uTime * 0.03));
    vec3 rimCol = mix(vec3(0.85), irid, 0.45) * (0.35 + 0.5 * uFocus);
    c = mix(c, rimCol, rim * 0.75);
    // Reflejo tenue en la parte alta (como un cristal)
    c += (1.0 - vUv.y) * 0.0 + smoothstep(0.55, 1.0, vUv.y) * 0.035 * (1.0 - uLight);
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function createWorksScene(sources: ScreenSource[], lowPower = false): WorksScene {
  const renderer = new Renderer({
    alpha: false,
    antialias: !lowPower,
    dpr: Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.25),
  });
  const gl = renderer.gl;
  gl.disable(gl.DEPTH_TEST);
  const camera = new Camera(gl, { fov: FOV, near: 0.1, far: 200 });
  const root = new Transform();

  // Estado compartido (los programas comparten estos objetos de uniforms)
  const shared = {
    uTime: { value: 0 },
    uVel: { value: 0 },
    uArrive: { value: 0 },
    uMouse: { value: [0, 0] },
    uLight: { value: 0 },
  };

  // Texturas de las pantallas (las usan los paneles y, difuminadas en mosaico, el fondo)
  const tiles = sources.map((src) => {
    const texture = new Texture(gl, {
      image: src.source,
      generateMipmaps: !src.live && renderer.isWebgl2,
      minFilter: !src.live && renderer.isWebgl2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });
    return { texture, live: !!src.live, aspect: src.aspect };
  });
  const N = tiles.length;

  // ── Fondo ──
  const wallProgram = new Program(gl, {
    vertex: wallVertex,
    fragment: wallFragment,
    uniforms: {
      ...shared,
      uRes: { value: [1, 1] },
      uScroll: { value: 0 },
      uMix: { value: 0 },
      uTexA: { value: tiles[0]!.texture },
      uTexB: { value: tiles[Math.min(1, N - 1)]!.texture },
      uBg: { value: [0, 0, 0] },
      uTile: { value: [0.1, 0.1, 0.1] },
      uLine: { value: [1, 1, 1] },
      uAccent: { value: [1, 0.68, 0] },
    },
    depthTest: false,
  });
  const wall = new Mesh(gl, { geometry: new Triangle(gl), program: wallProgram });
  wall.frustumCulled = false;
  wall.setParent(root);

  // ── Paneles ──
  const segs = lowPower ? [40, 24] : [64, 36];
  const panels = tiles.map((t, i) => {
    const program = new Program(gl, {
      vertex: panelVertex,
      fragment: panelFragment,
      uniforms: {
        ...shared,
        uO: { value: i },
        uSpacing: { value: SPACING },
        uShift: { value: [0, 0] },
        uPhase: { value: 0 },
        uRot: { value: 0.3 },
        uDepth: { value: 1.1 },
        uHalfW: { value: PANEL_W / 2 },
        uBow: { value: 0.32 },
        uFloat: { value: 0.07 },
        uTex: { value: t.texture },
        uTexAspect: { value: t.aspect },
        uPanelAspect: { value: PANEL_W / PANEL_H },
        uFocus: { value: 0 },
        uBg: { value: [0, 0, 0] },
      },
      cullFace: null,
      depthTest: false,
    });
    const mesh = new Mesh(gl, {
      geometry: new Plane(gl, {
        width: PANEL_W,
        height: PANEL_H,
        widthSegments: segs[0],
        heightSegments: segs[1],
      }),
      program,
    });
    mesh.frustumCulled = false;
    mesh.setParent(root);
    return { mesh, program };
  });

  const colors = () => {
    const bg = readColor('--bg');
    const ink = readColor('--ink');
    const soft = readColor('--bg-soft');
    const light = document.documentElement.dataset.mode === 'light' ? 1 : 0;
    shared.uLight.value = light;
    const set = (u: { value: unknown }, v: number[]) => (u.value = v);
    set(wallProgram.uniforms.uBg!, bg);
    set(
      wallProgram.uniforms.uTile!,
      soft.map((v, k) => v * 0.8 + bg[k]! * 0.2),
    );
    set(
      wallProgram.uniforms.uLine!,
      ink.map((v, k) => bg[k]! + (v - bg[k]!) * 0.9),
    );
    set(wallProgram.uniforms.uAccent!, readColor('--accent'));
    for (const p of panels) set(p.program.uniforms.uBg!, bg);
  };
  colors();

  let aspect = 1;
  let width = 1;
  let height = 1;
  const layout = () => {
    const portrait = aspect < 1;
    // distancia de cámara: en horizontal el panel ocupa ~50 % del ancho; en vertical, ~88 %
    const frac = portrait ? 0.88 : 0.5;
    const z = PANEL_W / (frac * 2 * Math.tan((FOV * Math.PI) / 360) * aspect);
    camera.perspective({ fov: FOV, aspect, near: 0.1, far: 200 });
    camera.position.set(0, 0, z);
    camera.lookAt([0, 0, 0]);
    const viewW = 2 * Math.tan((FOV * Math.PI) / 360) * z * aspect;
    const viewH = viewW / aspect;
    // el activo queda un poco a la derecha y alto (el texto va abajo a la izquierda); en vertical, arriba
    const shift = portrait ? [0, viewH * 0.2] : [viewW * 0.04, viewH * 0.11];
    for (const p of panels) {
      p.program.uniforms.uShift!.value = shift;
      p.program.uniforms.uRot!.value = portrait ? 0.2 : 0.34;
    }
    wallProgram.uniforms.uRes!.value = [gl.canvas.width || width, gl.canvas.height || height];
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
      const arrive = 1 - input.enter;
      shared.uTime.value = time;
      shared.uVel.value = input.vel;
      shared.uArrive.value = arrive;
      shared.uMouse.value = input.mouse;

      // Fondo: se desplaza más despacio que las pantallas (paralaje) y toma el color del proyecto activo
      const a = Math.max(0, Math.min(N - 1, Math.floor(input.p)));
      const b = Math.min(N - 1, a + 1);
      wallProgram.uniforms.uScroll!.value = input.p * 0.34;
      wallProgram.uniforms.uMix!.value = input.p - a;
      wallProgram.uniforms.uTexA!.value = tiles[a]!.texture;
      wallProgram.uniforms.uTexB!.value = tiles[b]!.texture;

      // Paneles: los más lejanos se pintan primero (sin test de profundidad)
      const order = panels
        .map((pn, i) => ({ pn, i, o: i - input.p }))
        .sort((x, y) => Math.abs(y.o) - Math.abs(x.o));
      root.children = [wall, ...order.map((e) => e.pn.mesh)];
      for (const { pn, i, o } of order) {
        pn.mesh.visible = Math.abs(o) < 2.7;
        pn.program.uniforms.uO!.value = o;
        pn.program.uniforms.uPhase!.value = input.p;
        pn.program.uniforms.uFocus!.value = Math.max(0, 1 - Math.abs(o));
        if (tiles[i]!.live && Math.abs(o) < 1.2) tiles[i]!.texture.needsUpdate = true;
      }
      if (tiles[a]!.live) tiles[a]!.texture.needsUpdate = true;
      if (tiles[b]!.live) tiles[b]!.texture.needsUpdate = true;
      renderer.render({ scene: root, camera, sort: false, frustumCull: false });
    },
    setSource(index, src) {
      const t = tiles[index];
      const pn = panels[index];
      if (!t || !pn) return;
      t.texture.image = src.source;
      t.live = !!src.live;
      t.aspect = src.aspect;
      pn.program.uniforms.uTexAspect!.value = src.aspect;
      t.texture.needsUpdate = true;
    },
    colors,
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
