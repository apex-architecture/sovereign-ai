import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const GOLD = new THREE.Color("#d8b25c");
const PALE = new THREE.Color("#f4d998");
const COOL = new THREE.Color("#3f6f8f");

/** A spiral field: one star per measured registry row. Position is seeded by index so the
 *  shape is identical for every visitor — the constellation is data, not random decoration. */
function galaxyPositions(count) {
  const pos = new Float32Array(count * 3);
  const tint = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const arms = 4;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const arm = i % arms;
    const radius = 1.2 + Math.pow(t, 0.62) * 9.4;
    const twist = t * 5.4 + (arm / arms) * Math.PI * 2;
    const jitter = Math.sin(i * 12.9898) * 43758.5453;
    const j = jitter - Math.floor(jitter);
    const spread = (j - 0.5) * (0.55 + t * 2.1);
    pos[i * 3] = Math.cos(twist) * radius + spread;
    pos[i * 3 + 1] = (Math.sin(i * 78.233) * 0.5) * (0.9 - t * 0.6) * 2.4 + Math.sin(t * 9.0) * 0.25;
    pos[i * 3 + 2] = Math.sin(twist) * radius + (Math.cos(i * 43.17) * 0.5) * (0.6 + t * 1.4);
    const warm = 0.55 + 0.45 * Math.sin(t * 7.1 + arm);
    const c = new THREE.Color().copy(GOLD).lerp(PALE, warm).lerp(COOL, t * 0.32);
    tint[i * 3] = c.r; tint[i * 3 + 1] = c.g; tint[i * 3 + 2] = c.b;
    seed[i] = j;
  }
  return { pos, tint, seed };
}

const STAR_VERT = /* glsl */`
  uniform float uTime; uniform float uScale; uniform float uPixel;
  attribute vec3 aTint; attribute float aSeed;
  varying vec3 vTint; varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.62 + 0.38 * sin(uTime * (0.7 + aSeed * 2.2) + aSeed * 6.28);
    vTw = tw; vTint = aTint;
    gl_PointSize = uScale * (0.7 + aSeed * 1.9) * tw * (uPixel * 26.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */`
  precision mediump float;
  varying vec3 vTint; varying float vTw;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    float core = smoothstep(0.5, 0.0, r);
    float halo = pow(smoothstep(0.5, 0.0, r), 3.0);
    float a = core * 0.35 + halo;
    if (a < 0.002) discard;
    gl_FragColor = vec4(vTint * (0.75 + vTw * 0.85), a * vTw);
  }
`;

/** Obsidian core with a molten gold rim — reads as a lens stopped down, and needs no HDR environment. */
const ORB_VERT = /* glsl */`
  varying vec3 vN; varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const ORB_FRAG = /* glsl */`
  precision mediump float;
  uniform float uTime; uniform vec3 uRim;
  varying vec3 vN; varying vec3 vV;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.6);
    float pulse = 0.82 + 0.18 * sin(uTime * 0.9);
    float grain = 0.5 + 0.5 * sin(vN.x * 34.0 + uTime * 0.25) * sin(vN.y * 27.0 - uTime * 0.2);
    vec3 base = vec3(0.017, 0.014, 0.026) * (0.6 + grain * 0.7);
    gl_FragColor = vec4(base + uRim * f * pulse * 1.45, 1.0);
  }
`;

/** Projector beam: a soft cone of light falling from above through the field. */
const BEAM_FRAG = /* glsl */`
  precision mediump float;
  uniform float uTime; uniform vec3 uTint;
  varying vec2 vUv; varying vec3 vP;
  void main() {
    float h = smoothstep(0.0, 1.0, vUv.y);
    float edge = smoothstep(0.0, 0.34, 1.0 - abs(vP.x) / max(0.001, 0.42 + vUv.y * 1.9));
    float flicker = 0.86 + 0.14 * sin(uTime * 7.3) * sin(uTime * 2.1);
    float a = pow(h, 2.1) * edge * 0.30 * flicker;
    gl_FragColor = vec4(uTint, a);
  }
`;
const BEAM_VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vP;
  void main() {
    vUv = uv; vP = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.055 },
    uVignette: { value: 1.05 },
    uAberration: { value: 0.0016 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVignette; uniform float uAberration;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * r2 * uAberration * 24.0;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + off).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - off).b;
      float vig = smoothstep(0.92, 0.18, r2 * uVignette);
      c *= mix(0.52, 1.0, vig);
      float g = hash(vUv * (900.0 + mod(uTime, 100.0) * 7.0)) - 0.5;
      c += g * uGrain;
      c = pow(c, vec3(0.955));
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function createVerse(canvas, opts) {
  const o = opts || {};
  const count = Math.max(64, (o.count || 1109) | 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#06050a");
  scene.fog = new THREE.FogExp2("#06050a", 0.036);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 220);
  camera.position.set(0, 2.1, 15.5);

  const field = new THREE.Group();
  scene.add(field);

  const { pos, tint, seed } = galaxyPositions(count);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: o.scale || 1.0 }, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  field.add(new THREE.Points(g, starMat));

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.28, 5),
    new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uRim: { value: GOLD.clone() } }, vertexShader: ORB_VERT, fragmentShader: ORB_FRAG }),
  );
  field.add(orb);

  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(2.3, 9.5, 40, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTint: { value: PALE.clone() } },
      vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }),
  );
  beam.position.y = 4.6;
  beam.rotation.x = Math.PI;
  scene.add(beam);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), o.bloom || 0.92, 0.72, 0.06);
  composer.addPass(bloom);
  const grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  const state = { scroll: 0, mx: 0, my: 0, tmx: 0, tmy: 0, reduced: false };
  try { state.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* no media query support */ }

  function onResize() {
    const w = window.innerWidth, h = Math.max(1, window.innerHeight);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    starMat.uniforms.uPixel.value = renderer.getPixelRatio();
  }
  window.addEventListener("resize", onResize);

  function onPointer(e) {
    const p = e.touches ? e.touches[0] : e;
    state.tmx = (p.clientX / window.innerWidth - 0.5) * 2;
    state.tmy = (p.clientY / window.innerHeight - 0.5) * 2;
  }
  window.addEventListener("pointermove", onPointer, { passive: true });

  const clock = new THREE.Clock();
  let raf = 0, running = false;

  function frame() {
    const t = clock.getElapsedTime();
    state.mx += (state.tmx - state.mx) * 0.045;
    state.my += (state.tmy - state.my) * 0.045;
    const s = state.scroll;

    if (!state.reduced) field.rotation.y = t * 0.035 + s * 2.35;
    orb.rotation.y = t * 0.12; orb.rotation.x = t * 0.05;
    starMat.uniforms.uTime.value = t;
    orb.material.uniforms.uTime.value = t;
    beam.material.uniforms.uTime.value = t;
    grade.uniforms.uTime.value = t;

    const s2 = s * s;
    camera.position.x = Math.sin(s * 2.1) * 5.2 + state.mx * 0.9;
    camera.position.z = 15.5 - s * 12.4 + Math.cos(s * 1.6) * 1.1;
    camera.position.y = 2.1 - s2 * 3.4 + state.my * -0.7;
    camera.lookAt(0, s * -0.9, 0);
    bloom.strength = (o.bloom || 0.92) + s * 0.55;
    composer.render();
    if (running) raf = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; clock.start(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (!state.reduced) start(); });

  return {
    start, stop, state,
    setScroll(v) { state.scroll = Math.min(1, Math.max(0, v)); },
    setReduced(v) { state.reduced = !!v; },
    /** Re-renders and grabs the buffer in the same task, so a headless check sees real pixels. */
    capture() { composer.render(); return canvas.toDataURL("image/png"); },
    stats: () => ({ stars: count, tri: renderer.info.render.triangles, calls: renderer.info.render.calls }),
    dispose() { stop(); window.removeEventListener("resize", onResize); window.removeEventListener("pointermove", onPointer); g.dispose(); orb.geometry.dispose(); beam.geometry.dispose(); composer.dispose(); renderer.dispose(); },
  };
}
