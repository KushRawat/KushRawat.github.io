// WebGL background — 16k particles that morph between four formations as you
// scroll: wave terrain (hero) → galaxy spiral (projects) → sphere (experience)
// → ring vortex (contact). Mouse parallax, palette shifts, soft additive glow.
// Falls back to a static CSS gradient on reduced-motion / no-WebGL.
import * as THREE from 'three';

const canvas = document.getElementById('bg');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const smallScreen = window.matchMedia('(max-width: 700px)').matches;

function bail() { document.body.classList.add('no-webgl'); }

if (reducedMotion) bail();
else {
  try { init(); }
  catch (err) { console.warn('WebGL scene disabled:', err); bail(); }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  // Points don't need retina density — fill rate is the bottleneck here.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.045);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 2.2, 7.5);

  // ---------- formations ----------
  const COLS = smallScreen ? 70 : 120;
  const ROWS = smallScreen ? 50 : 80;
  const count = COLS * ROWS;

  const terrain = new Float32Array(count * 3);
  const galaxy = new Float32Array(count * 3);
  const sphere = new Float32Array(count * 3);
  const ring = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  let i = 0;
  for (let x = 0; x < COLS; x++) {
    for (let z = 0; z < ROWS; z++) {
      const idx = i * 3;
      const rnd = Math.random();
      seeds[i] = rnd;

      // 1 — flat grid (waves added in shader)
      terrain[idx] = (x / (COLS - 1) - 0.5) * 34;
      terrain[idx + 1] = -1.4;
      terrain[idx + 2] = (z / (ROWS - 1) - 0.5) * 22;

      // 2 — galaxy spiral (3 arms)
      const frac = i / count;
      const arm = i % 3;
      const angle = frac * Math.PI * 7 + (arm * Math.PI * 2) / 3;
      const radius = 0.6 + Math.sqrt(frac) * 8.2 + (rnd - 0.5) * 0.9;
      galaxy[idx] = Math.cos(angle) * radius;
      galaxy[idx + 1] = (rnd - 0.5) * (1.6 - frac) - 0.4;
      galaxy[idx + 2] = Math.sin(angle) * radius - 2.0;

      // 3 — fibonacci sphere
      const t = i / (count - 1);
      const inc = Math.acos(1 - 2 * t);
      const az = GOLDEN * i;
      const r3 = 3.4 + (rnd - 0.5) * 0.22;
      sphere[idx] = r3 * Math.sin(inc) * Math.cos(az);
      sphere[idx + 1] = r3 * Math.cos(inc) * 0.92;
      sphere[idx + 2] = r3 * Math.sin(inc) * Math.sin(az) - 1.0;

      // 4 — ring vortex
      const a4 = frac * Math.PI * 2 * 3 + rnd * 0.35;
      const r4 = 4.6 + (rnd - 0.5) * 1.3;
      ring[idx] = Math.cos(a4) * r4;
      ring[idx + 1] = Math.sin(a4 * 2.0) * 0.55 + (rnd - 0.5) * 0.35;
      ring[idx + 2] = Math.sin(a4) * r4 - 1.2;

      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(terrain, 3));
  geometry.setAttribute('aGalaxy', new THREE.BufferAttribute(galaxy, 3));
  geometry.setAttribute('aSphere', new THREE.BufferAttribute(sphere, 3));
  geometry.setAttribute('aRing', new THREE.BufferAttribute(ring, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uWarp: { value: 0 }, // 0→1 hyperspace surge when entering the 3D room
    uColorA: { value: new THREE.Color(0x8b5cf6) },
    uColorB: { value: new THREE.Color(0x22d3ee) },
    uPixelRatio: { value: renderer.getPixelRatio() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uProgress;
      uniform float uWarp;
      uniform float uPixelRatio;
      attribute vec3 aGalaxy;
      attribute vec3 aSphere;
      attribute vec3 aRing;
      attribute float aSeed;
      varying float vElev;
      varying float vSeed;

      vec3 rotY(vec3 p, float a) {
        float c = cos(a), s = sin(a);
        return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
      }

      void main() {
        float t = uTime;
        float p = uProgress;

        // formation blend weights
        float w1 = smoothstep(0.06, 0.32, p);   // terrain -> galaxy
        float w2 = smoothstep(0.40, 0.62, p);   // galaxy  -> sphere
        float w3 = smoothstep(0.72, 0.92, p);   // sphere  -> ring

        // terrain with waves
        vec3 pos1 = position;
        float wave =
            sin(pos1.x * 0.55 + t * 0.55) * 0.45
          + sin(pos1.z * 0.75 + t * 0.7) * 0.35
          + sin((pos1.x + pos1.z) * 0.32 + t * 0.4) * 0.5;
        pos1.y += wave;

        // galaxy slowly rotating
        vec3 pos2 = rotY(aGalaxy, t * 0.05);
        // sphere breathing + rotating
        vec3 pos3 = rotY(aSphere * (1.0 + sin(t * 0.6 + aSeed * 6.28) * 0.02), t * 0.08);
        // ring vortex spinning
        vec3 pos4 = rotY(aRing, t * 0.12 + aSeed * 0.1);

        vec3 pos = mix(pos1, pos2, w1);
        pos = mix(pos, pos3, w2);
        pos = mix(pos, pos4, w3);

        // hyperspace surge toward (and past) the camera
        if (uWarp > 0.0) {
          pos.x *= 1.0 - uWarp * 0.55;
          pos.y = mix(pos.y, pos.y * 0.35 + 1.2, uWarp);
          pos.z += uWarp * uWarp * 62.0 * (0.35 + aSeed);
        }

        vElev = clamp(wave * 0.5 + 0.5, 0.0, 1.0) * (1.0 - w1)
              + (0.35 + 0.65 * aSeed) * w1;
        vSeed = aSeed;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (1.1 + aSeed * 1.7) * uPixelRatio * (1.0 + uWarp * 2.5);
        gl_PointSize = size * (7.5 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vElev;
      varying float vSeed;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.05, d);
        vec3 base = mix(uColorA, uColorB, vElev);
        float fade = 0.35 + 0.65 * vElev;
        gl_FragColor = vec4(base, alpha * fade * 0.8);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // ---------- far stars ----------
  const starCount = 350;
  const starPos = new Float32Array(starCount * 3);
  for (let s = 0; s < starCount; s++) {
    starPos[s * 3] = (Math.random() - 0.5) * 70;
    starPos[s * 3 + 1] = Math.random() * 22 - 4;
    starPos[s * 3 + 2] = -Math.random() * 45 - 6;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0x9aa1b5, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false })
  );
  scene.add(stars);

  // ---------- palette stops (per scroll phase) ----------
  const PALETTES = [
    [new THREE.Color(0x8b5cf6), new THREE.Color(0x22d3ee)], // hero: violet/cyan
    [new THREE.Color(0x22d3ee), new THREE.Color(0xf472b6)], // projects: cyan/pink
    [new THREE.Color(0xf472b6), new THREE.Color(0x8b5cf6)], // experience: pink/violet
    [new THREE.Color(0x34d399), new THREE.Color(0x22d3ee)], // contact: emerald/cyan
  ];
  const colA = new THREE.Color(), colB = new THREE.Color();
  function paletteAt(p) {
    const seg = Math.min(2.999, Math.max(0, p * 3));
    const idx = Math.floor(seg);
    const f = THREE.MathUtils.smoothstep(seg - idx, 0, 1);
    colA.lerpColors(PALETTES[idx][0], PALETTES[idx + 1 >= 4 ? 3 : idx + 1][0], f);
    colB.lerpColors(PALETTES[idx][1], PALETTES[idx + 1 >= 4 ? 3 : idx + 1][1], f);
    uniforms.uColorA.value.copy(colA);
    uniforms.uColorB.value.copy(colB);
  }

  // ---------- interaction ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // scroll progress — window.__scrollProgress is set by main.js (Lenis) when
  // available; fall back to native scroll position otherwise.
  function scrollProgress() {
    if (typeof window.__scrollProgress === 'number') return window.__scrollProgress;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); tick(); }
  });

  // adaptive quality: if frames run slow, step density/resolution down
  let frameCount = 0;
  let slowFrames = 0;
  let lastNow = performance.now();
  let qualityTier = 0; // 0 full, 1 reduced, 2 minimal
  function degrade() {
    qualityTier++;
    if (qualityTier === 1) {
      renderer.setPixelRatio(1);
      uniforms.uPixelRatio.value = 1;
      geometry.setDrawRange(0, Math.floor(count * 0.6));
    } else {
      geometry.setDrawRange(0, Math.floor(count * 0.35));
      stars.visible = false;
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // hyperspace warp — main.js calls window.__warp(done) when entering the room
  let warpT = null;
  let warpDone = null;
  window.__warp = (done) => {
    if (warpT !== null) return;
    warpT = 0;
    warpDone = done;
  };
  window.__warpReset = () => {
    warpT = null;
    warpDone = null;
    uniforms.uWarp.value = 0;
    camera.fov = 60;
    camera.updateProjectionMatrix();
  };

  let smooth = 0;
  let lastT = 0;
  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    const wdt = Math.min(0.05, t - lastT);
    lastT = t;
    uniforms.uTime.value = t;

    if (warpT !== null) {
      warpT += wdt;
      const u = Math.min(1, warpT / 1.2);
      uniforms.uWarp.value = u * u;
      camera.fov = 60 + 38 * u * u;
      camera.updateProjectionMatrix();
      if (u >= 1 && warpDone) { const cb = warpDone; warpDone = null; cb(); }
    }

    const now = performance.now();
    const dt = now - lastNow;
    lastNow = now;
    if (frameCount++ > 30 && qualityTier < 2) { // skip warm-up frames
      if (dt > 26) slowFrames++;                 // < ~38 fps
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 20) { slowFrames = 0; degrade(); }
    }

    smooth += (scrollProgress() - smooth) * 0.08;
    uniforms.uProgress.value = smooth;
    paletteAt(smooth);

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // camera choreography: pull back through galaxy, settle level for ring
    const camY = 2.2 - smooth * 2.1 - mouse.y * 0.5;
    const camZ = 7.5 + Math.sin(smooth * Math.PI) * 2.2;
    camera.position.set(mouse.x * 1.2, camY, camZ);
    camera.lookAt(0, -0.4 * smooth, 0);

    stars.rotation.y = -t * 0.004;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
