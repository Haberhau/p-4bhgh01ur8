// Walk the line: the 3D side of the journey. A fixed stage canvas behind the page shows one composition per moment of the story,
// built on a soft ground, while a small figure walks the orange line down the page (journey/line.js draws the line and the captions).
// ?still previews reduced motion, ?nogl is the text version. Plan and rules: STORY-APPROACHES/08-walk-the-line.md.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('still');   // ?still previews reduced motion
// Phones and tablets get a lighter renderer: smaller shadow map, coarser ground, fewer pixels.
const LIGHT = matchMedia('(max-width: 800px), (pointer: coarse)').matches;
const clamp = v => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const backOut = t => t <= 0 ? 0 : 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RB = (w, h, d, r = .08) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));

// The look: every surface near-white with only a whisper of its colour, Florian the one accent.
const PAGE = new THREE.Color(0xf3f3f1), BG = 0xf3f3f1, ACCENT = 0xff5a1f, HEMI = 1.55, SUN = 1.9, WHITE = new THREE.Color(0xffffff);
const soft = c => new THREE.Color(c).lerp(WHITE, .84);

// The page's sections, in order. Each one owns one or more moments (see MOMENTS near the driver).
const STEPS = ['hi', 'court', 'knee', 'fork', 'spark', 'engine', 'double', 'trusted', 'next', 'end'];

// Renderer, scene and camera on the page's canvas. Returns null without WebGL (or with ?nogl), and the text version takes over.
function stage() {
  const canvas = document.querySelector('#stage canvas');
  let renderer;
  try { if (!new URLSearchParams(location.search).has('nogl')) renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch {}   // alpha: the page's own background shows through, so the fade at the stage's edge has no visible steps
  if (!renderer) return null;
  renderer.setPixelRatio(Math.min(devicePixelRatio, LIGHT ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, .1, 500);
  const s = { renderer, scene, cam };
  s.resize = () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); };
  s.resize();
  s.draw = () => renderer.render(scene, cam);
  return s;
}

// Florian: short dark brown hair, glasses, hoodie, trousers; in this look all of it in the accent.
function avatar(m, scale = 1) {
  const g = new THREE.Group();
  const part = (w, h, d, r = .06) => new THREE.Mesh(RB(w, h, d, r), m);
  const limb = (w, h, d, x, y) => { const p = new THREE.Group(), l = part(w, h, d, Math.min(w, d) * .45); p.position.set(x, y, 0); l.position.y = -h / 2; p.add(l); g.add(p); return p; };
  const legs = [-.13, .13].map(x => limb(.2, .56, .24, x, .6));
  legs.forEach(l => { const s = part(.22, .1, .3, .04); s.position.set(0, -.55, .03); l.add(s); });
  const arms = [-.36, .36].map(x => limb(.15, .52, .17, x, 1.18));
  arms.forEach(a => { const h = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), m); h.position.y = -.56; a.add(h); });
  const torso = part(.58, .64, .34, .12); torso.position.y = .9;
  const hood = part(.46, .2, .16, .07); hood.position.set(0, 1.2, -.17);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 24, 18), m); head.position.y = 1.52;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.315, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.15), m); hair.position.set(0, 1.57, -.03); hair.rotation.x = -.15;
  g.add(torso, hood, head, hair);
  [-.11, .11].forEach(x => { const f = part(.16, .11, .03, .025); f.position.set(x, 1.53, .285); g.add(f); });
  const bridge = part(.07, .02, .02, .008); bridge.position.set(0, 1.55, .3); g.add(bridge);
  g.scale.setScalar(scale);
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  let phase = 0;
  const last = V(0, 0, 0);
  // Walk to `pos`, swinging limbs by the distance moved; at rest, turn toward `face`.
  const place = (pos, face = Math.PI / 4) => {
    const moved = pos.distanceTo(last), walking = moved > 1e-3 && moved < 3;
    if (walking) { phase += moved * 5; g.rotation.y = Math.atan2(pos.x - last.x, pos.z - last.z); }
    else g.rotation.y += ((((face - g.rotation.y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * .2;
    const sw = walking ? Math.sin(phase) * .6 : 0;
    legs[0].rotation.x = sw; legs[1].rotation.x = -sw; arms[0].rotation.x = -sw; arms[1].rotation.x = sw;
    g.rotation.x = 0;
    g.position.copy(pos);
    last.copy(pos);
  };
  return { g, arms, legs, place };
}

// A label pinned to a point in the world.
function tag(html) {
  const e = document.createElement('div');
  e.className = 'tag'; e.hidden = true; e.innerHTML = html;
  document.querySelector('#journey .tags').append(e);
  const p = V(0, 0, 0);
  return {
    show(world, cam, op = 1, text) {
      e.hidden = op < .02;
      if (e.hidden) return;
      if (text !== undefined && text !== e._t) { e._t = text; e.innerHTML = text; }
      p.copy(world).project(cam);
      e.style.opacity = op;
      e.style.transform = `translate(${(p.x + 1) / 2 * innerWidth}px, ${(1 - p.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
    },
  };
}

const R = 7;
const fade = (x, z) => { const r = Math.hypot(x, z); return r > R - 1.2 ? Math.max(0, (R - r) / 1.2) : 1; };
const g2 = (x, z, cx, cz, s) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / s);
// Distance from a point to the segment a→b (the river).
const dseg = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const inCourt = (x, z) => Math.abs(x) < 3.5 && Math.abs(z) < 1.75, inFree = (x, z) => Math.abs(x) < 4.4 && Math.abs(z) < 2.6;
// Ground per scene: height and a colour key for every point of the plinth.
// Water (the Inn, the Baltic, the Mediterranean) is a shallow basin with a soft shore; the water surface sits at -.14.
const shore = (d, w) => smooth(clamp(d / w));
const forkH = (x, z) => (2.9 * g2(x, z, 2.4, -4.6, 3) + 2.4 * g2(x, z, -.6, -5.3, 2.4) + 1.6 * g2(x, z, 4.9, -2.6, 2) + 1.05 * g2(x, z, .9, -1.6, .7)
  - .4 * shore(.42 - dseg(x, z, 5.6, -1.2, 2.9, 2.4), .22) - .45 * shore(2.25 - Math.hypot(x - 3.9, z - 3.7), .45)) * fade(x, z);
const kufH = (x, z) => (2.4 * g2(x, z, -1.5, -4.8, 3.4) + 2.0 * g2(x, z, 2.4, -5.0, 2.8) + .6 * g2(x, z, .5, -3.4, 2)) * fade(x, z);
const nextH = (x, z) => 1.3 * g2(x, z, 0, -1.6, 9) * fade(x, z);
const TERRAIN = {
  hi: { h: () => 0, c: (x, z) => Math.abs(z + .6) < .42 ? 'asphalt' : Math.abs(z + .6) < .75 ? 'paving' : z < -1.35 ? 'grass' : Math.hypot(x, z - 2.2) < 2.5 ? 'paving' : 'grass' },
  court: { h: () => 0, c: (x, z) => inCourt(x, z) ? 'court' : inFree(x, z) ? 'freezone' : 'floor' },
  team: { h: () => 0, c: (x, z) => inCourt(x, z) ? 'court' : inFree(x, z) ? 'freezone' : 'floor' },
  down: { h: () => 0, c: (x, z) => inCourt(x, z) ? 'court' : inFree(x, z) ? 'freezone' : 'floor' },
  up: { h: () => 0, c: () => 'ground' },
  dealer: { h: () => 0, c: (x, z) => z > -2.2 && z < 2.6 && Math.abs(x) < 4.2 ? 'asphalt' : 'grass' },
  kufstein: { h: kufH, c: (x, z, y) => y > 2.0 ? 'snow' : y > 1.2 ? 'rock' : y > .5 ? 'grass2' : 'grass' },
  fork: { h: forkH, c: (x, z, y) => y < -.08 ? 'sand' : y > 2.1 ? 'snow' : y > 1.25 ? 'rock' : x < -1.6 && z > -2.8 && z < 2 ? 'asphalt' : y > .5 ? 'grass2' : 'grass' },
  doors: { h: () => 0, c: (x, z) => z < -1.2 ? 'ground' : z < 3.2 && Math.abs(x) < 4.6 ? 'carpet' : 'ground' },
  pile: { h: () => 0, c: (x, z) => z > -.6 && z < 1.8 && Math.abs(x) < 2.0 ? 'carpet2' : 'ground' },
  byhand: { h: () => 0, c: (x, z) => z < 3.2 && Math.abs(x) < 3.8 ? 'carpet' : 'ground' },
  auto: { h: () => 0, c: (x, z) => z < 3.2 && Math.abs(x) < 3.8 ? 'carpet' : 'ground' },
  day: { h: () => 0, c: (x, z) => z > 3.2 ? 'sand' : z > 1.0 ? 'paving' : 'terra' },
  night: { h: () => 0, c: (x, z) => z > 3.2 ? 'sand' : z > 1.0 ? 'paving' : 'terra' },
  hub: { h: () => 0, c: (x, z) => z > -3.8 && z < 3.6 && Math.abs(x) < 4.8 ? 'carpet' : 'ground' },
  evenings: { h: nextH, c: (x, z, y) => y > 1 ? 'grass2' : 'grass' },
  tower: { h: nextH, c: (x, z, y) => Math.abs(x) < 1.9 && Math.abs(z + 1.6) < 1.9 ? 'gravel' : y > 1 ? 'grass2' : 'grass' },
  end: { h: () => 0, c: () => 'ground' },
};
// Where I stand in each scene.
// How the camera frames each scene: distance factor, the point it looks at, and (optional) how much higher it stands. 1 and [0,1.2,0] is the stage view.
// The knee and the engine come closer from higher up, so the hall's and the office's back walls stay under the title.
const FRAME = {
  hi: [.85, [0, 1.2, 0]],
  court: [.3, [0, .7, 0], 1.25, Math.PI / 2],
  team: [.62, [0, 1.5, -.5], 1.2],
  down: [.2, [1.5, .3, .55], 1.9],
  up: [.5, [2.2, 1.3, -1.2], 1.25],
  dealer: [.5, [-.3, 1.0, .4], 1.15],
  kufstein: [.4, [0, 1.2, -.9], 1.2],
  doors: [.58, [0, 1.2, -.3], 1.2],
  pile: [.26, [0, 1.0, .6], 1.5],
  byhand: [.4, [.5, .9, .8], 1.4],
  auto: [.42, [.6, 1.0, .5], 1.3],
  day: [.54, [0, 2.1, -.4], 1.15],
  night: [.54, [0, 2.1, -.4], 1.15],
  hub: [.38, [0, .6, -.2], 1.5],
  evenings: [.16, [0, 1.15, 1.1], 1.25],
  tower: [.62, [0, 1.9, -.6], 1.2],
  fork: [1.05, [0, 1.3, 0]], end: [1, [0, 1.2, 0]] };
const SPOT = { doors: [0, 2.0], pile: [0, 2.4], byhand: [-.9, 2.1], auto: [-.9, 2.1], day: [-1.6, 2.8], night: [-1.6, 2.8], hub: [0, .4], evenings: [0, 1.42], tower: [1.4, 1.2], hi: [0, 2.6], court: [.8, .3], team: [1.55, .55], down: [1.55, .55], up: [2.2, .6], dealer: [-1.2, 2.0], kufstein: [1.2, 1.6], fork: [.2, 2.4], spark: [2.4, -2], engine: [-.9, 1.42], double: [-2.2, 2.6], trusted: [0, -.4], end: [0, 1.4], next: [.9, 1.7] };
// Every colour key the scenes use. Each is softened towards white (soft) before it is drawn.
const PALETTE = { ground: 0xe8e2d4, floor: 0xc99b6a, court: 0xd8805c, freezone: 0x5f8a6e, line: 0xf7f4ec, metal: 0x8d929c, net: 0x2c3142, stand: 0xb9b2a4, seat: 0xc0563b, ink: 0x2c3142, score: 0xe05a4a,
  wood: 0x9b6b43, bottle: 0x5f9ec7, lamp: 0xfff2c8, team1: 0x3d5a8a, team2: 0xb2463b, accent: 0xd38c6c, leaf: 0x7fa36a, leaf2: 0x6b9058, spruce: 0x4f6e52, flag: 0xd6403a, gold: 0xe0b04a,
  glass: 0xdfe8ee, wall: 0xf4efe6, wall2: 0xe6ddcc, wall3: 0xe9c99a, wall4: 0xc9d6c2, brand: 0x3f63a0, car1: 0xd6d8dc, car2: 0x2d3550, car3: 0xa8343a, road: 0xa8a49b, asphalt: 0x8f8e8a, roof: 0x4b546a, tile: 0xb0583e,
  boat: 0xc0563b, sail: 0xfaf6ee, trunk: 0x8d6e53, sand: 0xe8d6a8, snow: 0xf7f8fb, rock: 0x9aa0ab, grass: 0x9cbb84, grass2: 0x8db177, paving: 0xd9d2c4, gravel: 0xc4bcae, carpet: 0xb7b9bd, carpet2: 0xc9c6c0,
  terra: 0xd9b48c, win: 0xffc860, machine: 0x4b546a, box: 0xe7d2a8, screen: 0x9fd0ee, stone: 0xd9c19a, moon: 0xf4efe0, tool: 0xe0b04a, crane: 0xe0b04a, sun: 0xffc86a, skin: 0xe9c7a4, hair: 0x4a3426,
  vest: 0xf08a24, t0: 0x9fd0ee, t1: 0x9fd0ee, t2: 0x9fd0ee, t3: 0x9fd0ee, train: 0xc8323a, led: 0x7fe0a0, plinth: 0xeeeeec, water: 0xd6e6ee };

function run() {
  const s = stage();
  const beats = STEPS.map(id => ({ id }));
  if (!s) return journey({ beats, s: null });
  const { scene } = s;
  scene.background = null; s.renderer.setClearColor(0x000000, 0);
  const col = key => PALETTE[key] ?? PALETTE.ground;
  // Materials: one per colour key, each near-white with only a whisper of its colour. Keys starting with * glow (in the accent unless GLOW says otherwise); the render loop sets how much.
  const mats = {}, glows = {};
  // Floodlights, the scoreboard and the moon glow warm white: only what he builds glows in his colour (The Light Rule in DESIGN.md).
  const GLOW = { '*lamp': 0xfff2c8, '*score': 0xfff2c8, '*moon': 0xf4efe0, '*door': 0xfff2c8, '*nwin': 0xfff2c8 };
  const mat = key => key[0] === '*' ? glows[key] ||= new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: GLOW[key] ?? ACCENT, emissiveIntensity: 0, roughness: .8 })
    : mats[key] ||= key === 'glass' ? new THREE.MeshStandardMaterial({ color: soft(col(key)), roughness: .2, transparent: true, opacity: .45 })
    : key === 'water' ? new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: .25 })
    : new THREE.MeshStandardMaterial({ color: soft(col(key)), roughness: .9 });
  const geos = {};   // detailed scenes repeat the same few sizes thousands of times; share them
  const geo = (kind, ...a) => geos[kind + a.join()] ||= ({
    box: () => RB(a[0], a[1], a[2], Math.min(Math.min(a[0], a[1], a[2]) * .3, .06)), cyl: () => new THREE.CylinderGeometry(a[0], a[0] * (a[3] ?? 1), a[1], a[2] ?? 16), cone: () => new THREE.ConeGeometry(a[0], a[1], a[2] ?? 8),
    sphere: () => new THREE.SphereGeometry(a[0], 32, 20), torus: () => new THREE.TorusGeometry(a[0], a[1], 10, 28),
    // A gable roof: a triangle (base d along z, height h) run along x for w.
    prism: () => new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-a[2] / 2, 0), new THREE.Vector2(a[2] / 2, 0), new THREE.Vector2(0, a[1])]), { depth: a[0], bevelEnabled: false }).translate(0, 0, -a[0] / 2).rotateY(Math.PI / 2) })[kind]();
  // Tiny parts (windows, lines, leaves) don't cast shadows: thousands of them would cost more than they show.
  const mesh = (g, key, small) => { const m = new THREE.Mesh(g, mat(key)); m.castShadow = !small; m.receiveShadow = true; return m; };

  // Lights.
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d9d4, HEMI);
  const sun = new THREE.DirectionalLight(0xffffff, SUN);
  sun.position.set(-7, 14, 9); sun.castShadow = true; sun.shadow.mapSize.setScalar(LIGHT ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
  scene.add(hemi, sun);

  // The plinth and the water level inside it. Open on top, so dips in the ground (the river, the sea) show the water.
  const plinth = mesh(new THREE.CylinderGeometry(R, R + .3, 1.4, 128, 1, true), 'plinth');
  plinth.visible = false;   // the soft ground: no plinth
  const water = new THREE.Mesh(new THREE.CircleGeometry(R - .02, 128), mat('water')); water.visible = false;

  // The ground: a heightfield that morphs between scenes, one colour per triangle.
  const N = LIGHT ? 72 : 110, terrain = {};
  {
    const pg = new THREE.PlaneGeometry(14, 14, N, N).rotateX(-Math.PI / 2).toNonIndexed();
    const pos = pg.attributes.position, base = [];
    for (let v = 0; v < pos.count; v++) { let x = pos.getX(v), z = pos.getZ(v); const r = Math.hypot(x, z); if (r > R) { x *= R / r; z *= R / r; } base.push([x, z]); pos.setX(v, x); pos.setZ(v, z); }
    pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.count * 4), 4));
    const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true });   // the soft ground: the edge dissolves by vertex alpha
    const ground = new THREE.Mesh(pg, tm); ground.receiveShadow = true; scene.add(ground);
    const c = new THREE.Color(), c2 = new THREE.Color(), cc = pg.attributes.color;
    // The change travels outward from the centre as a wave, with a soft swell at its front.
    const T = (x, z, k) => smooth(seg(k, Math.hypot(x, z) / R * .32, Math.hypot(x, z) / R * .32 + .16));
    terrain.update = (a, b, k = 1) => {
      for (let v = 0; v < pos.count; v++) { const [x, z] = base[v], tv = T(x, z, k); pos.setY(v, lerp(TERRAIN[a].h(x, z), TERRAIN[b].h(x, z), tv) + Math.sin(tv * Math.PI) * .35); }
      for (let f = 0; f < pos.count; f += 3) { const x = (base[f][0] + base[f + 1][0] + base[f + 2][0]) / 3, z = (base[f][1] + base[f + 1][1] + base[f + 2][1]) / 3;
        c.set(col(TERRAIN[a].c(x, z, TERRAIN[a].h(x, z)))).lerp(c2.set(col(TERRAIN[b].c(x, z, TERRAIN[b].h(x, z)))), T(x, z, k)); c.lerp(WHITE, .82); const al = 1 - smooth(seg(Math.hypot(x, z), 4.4, 6.8));
        for (let q = 0; q < 3; q++) cc.setXYZW(f + q, c.r, c.g, c.b, al); }
      pos.needsUpdate = true; cc.needsUpdate = true; pg.computeVertexNormals();
    };
  }
  const heightAt = (x, z, a, b, t) => lerp(TERRAIN[a].h(x, z), TERRAIN[b].h(x, z), t);

  // Props: each belongs to some scenes. Entering scenes it rises into place, leaving them it sinks away.
  const stageG = new THREE.Group(); scene.add(stageG);
  const props = [];
  // Static parts of a prop are merged into one mesh per material, so a scene can hold thousands of parts.
  // Anything that moves is marked userData.live and stays a separate object.
  function bake(g) {
    g.updateMatrixWorld(true);
    const inv = g.matrixWorld.clone().invert(), groups = new Map(), done = [];
    g.traverse(o => { if (!o.isMesh) return; for (let p = o; p && p !== g; p = p.parent) if (p.userData.live) return;
      const id = o.material.uuid + o.castShadow;
      let gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const n of Object.keys(gg.attributes)) if (n !== 'position' && n !== 'normal') gg.deleteAttribute(n);
      gg.clearGroups(); gg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (!groups.has(id)) groups.set(id, { m: o.material, cast: o.castShadow, list: [] }); groups.get(id).list.push(gg); done.push(o); });
    done.forEach(o => o.removeFromParent());
    groups.forEach(({ m, cast, list }) => { const mm = new THREE.Mesh(mergeGeometries(list), m); mm.castShadow = cast; mm.receiveShadow = true; g.add(mm); list.forEach(x => x.dispose()); });
  }
  // A prop is only registered here; its parts are built when its scene comes near (ensure), or earlier in idle time (buildRest).
  // Building everything at load would block the page for over half a second on a laptop, and seconds on a phone.
  const prop = (scenes, build, merge = true) => { const g = new THREE.Group(); if (scenes.includes('_old')) return g; g.visible = false; stageG.add(g); props.push(g);
    g.userData = { scenes, make() { build(kit(g), g); g.updateMatrixWorld(true); const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
      g.userData.r = Math.min(R, Math.hypot(c.x, c.z)); if (merge) bake(g); g.userData.built = true; } };
    return g; };
  const ensure = ids => props.forEach(g => { if (!g.userData.built && g.userData.scenes.some(id => ids.includes(id))) g.userData.make(); });
  const idle = window.requestIdleCallback || (f => setTimeout(f, 60));
  const buildRest = () => { const g = props.find(g => !g.userData.built); if (g) { g.userData.make(); idle(buildRest); } };
  const live = o => { o.userData.live = true; return o; };
  function kit(g) {
    const put = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
    const sub = (x, y, z, ry = 0, sc = 1) => { const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry; p.scale.setScalar(sc); g.add(p); return [kit(p), p]; };
    const k = {
      box: (w, h, d, key, x, y, z, small) => put(mesh(geo('box', w, h, d), key, small), x, y + h / 2, z),
      cyl: (r, h, key, x, y, z, n, taper, small) => put(mesh(geo('cyl', r, h, n, taper), key, small), x, y + h / 2, z),
      cone: (r, h, key, x, y, z, n) => put(mesh(geo('cone', r, h, n), key), x, y + h / 2, z),
      ball: (r, key, x, y, z) => put(mesh(geo('sphere', r), key), x, y, z),
      ring: (r, t, key, x, y, z, small) => put(mesh(geo('torus', r, t), key, small), x, y, z),
      prism: (w, h, d, key, x, y, z) => put(mesh(geo('prism', w, h, d), key), x, y, z),
      group: (x, y, z, ry, sc) => sub(x, y, z, ry, sc),
      // Words on a sign: dark letters on a light plate, facing +z. Never baked (merging drops the texture coordinates).
      label: (text, w, h, x, y, z, { bg = '#f6f4ee', ink = '#2c3142', weight = 700 } = {}) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
        const g2d = c.getContext('2d'); g2d.fillStyle = bg; g2d.fillRect(0, 0, c.width, c.height); g2d.fillStyle = ink; g2d.textAlign = 'center'; g2d.textBaseline = 'middle';
        let fs = c.height * .62; g2d.font = `${weight} ${fs}px Inter, Helvetica, Arial, sans-serif`; while (g2d.measureText(text).width > c.width * .9) { fs *= .92; g2d.font = `${weight} ${fs}px Inter, Helvetica, Arial, sans-serif`; }
        g2d.fillText(text, c.width / 2, c.height / 2 + fs * .04); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .8 })); m.receiveShadow = true; return live(put(m, x, y, z)); },
      // A thin rod from a to b (cables, wires, bracing). Only on a prop's top level, where local = world.
      rod: (a, b, key = 'ink', t = .015) => { const m = mesh(geo('box', t, t, a.distanceTo(b)), key, true); m.position.copy(a).add(b).multiplyScalar(.5); g.add(m); m.lookAt(b); return m; },
      // A person. pose: stand, walk, ready (volleyball), cheer (arms up), sit, kneel. hat: a helmet in that colour.
      person: (key, x, z, sc = .8, { pose = 'stand', legs = 'ink', ry = 0, y = 0, hair = 'hair', hat } = {}) => {
        const [p, pg] = sub(x, y, z, ry, sc), sit = pose === 'sit', kneel = pose === 'kneel', bend = pose === 'ready' ? .12 : 0;
        if (sit) [-.1, .1].forEach(lx => { p.box(.16, .14, .5, legs, lx, .38, .2); p.box(.15, .4, .15, legs, lx, 0, .42); });
        else if (kneel) { p.box(.16, .14, .5, legs, -.1, 0, -.15); p.box(.16, .3, .16, legs, .1, 0, .2); p.box(.16, .14, .4, legs, .1, .3, .05); }
        else [-.1, .1].forEach((lx, n) => { const l = p.box(.16, .52 - bend, .18, legs, lx, 0, 0); if (pose === 'walk') l.rotation.x = n ? .35 : -.35; });
        const ty = sit ? .42 : kneel ? .3 : .5 - bend;
        p.box(.44, .52, .26, key, 0, ty, 0); p.box(.14, .08, .14, 'skin', 0, ty + .52, 0, true); p.ball(.17, 'skin', 0, ty + .74, 0);
        if (hat) { const h = p.ball(.2, hat, 0, ty + .8, 0); h.scale.y = .6; p.box(.3, .02, .14, hat, 0, ty + .76, .16, true); }
        else { const hr = p.ball(.175, hair, 0, ty + .8, -.03); hr.scale.y = .62; }
        // Arms hang from a shoulder pivot, so posed arms stay attached to the body.
        [-.28, .28].forEach((ax, n) => { const [ak, ag] = p.group(ax, ty + .5, 0); ak.box(.12, .46, .14, key, 0, -.46, 0);
          if (pose === 'ready') ag.rotation.x = -1.0;
          if (pose === 'walk') ag.rotation.x = n ? -.35 : .35;
          if (pose === 'cheer') ag.rotation.z = n ? 2.7 : -2.7; });
        return pg; },
      dog: (x, z, ry = 0) => { const [d] = sub(x, 0, z, ry); d.box(.34, .13, .13, 'wood', 0, .12, 0); [[-.12, -.04], [-.12, .04], [.12, -.04], [.12, .04]].forEach(([lx, lz]) => d.box(.04, .12, .04, 'wood', lx, 0, lz, true));
        d.box(.13, .12, .11, 'wood', .2, .2, 0); d.box(.08, .05, .07, 'wood', .29, .22, 0, true); d.box(.12, .03, .03, 'wood', -.22, .24, 0, true); },
      spruce: (x, z, sc = 1, y = 0) => { const [p] = sub(x, y, z, 0, sc); p.cyl(.07, .4, 'trunk', 0, 0, 0, 6); [[.55, .8, .25], [.44, .7, .65], [.32, .6, 1.02], [.2, .5, 1.36]].forEach(([r, h, yy]) => p.cone(r, h, 'spruce', 0, yy, 0, 9)); },
      leafy: (x, z, sc = 1, y = 0) => { const [p] = sub(x, y, z, 0, sc); p.cyl(.08, .8, 'trunk', 0, 0, 0, 6); p.cyl(.03, .4, 'trunk', .1, .6, 0, 5).rotation.z = -.6;
        p.ball(.48, 'leaf', 0, 1.15, 0); p.ball(.36, 'leaf2', .3, 1.0, .16); p.ball(.34, 'leaf', -.24, 1.38, -.1); p.ball(.3, 'leaf2', -.1, .98, .3); p.ball(.26, 'leaf', .14, 1.45, .22); },
      bush: (x, z, sc = 1) => { const [p] = sub(x, 0, z, 0, sc); p.ball(.22, 'leaf2', 0, .14, 0).scale.y = .8; p.ball(.17, 'leaf', .16, .12, .06).scale.y = .8; },
      palm: (x, z, sc = 1) => { const [p] = sub(x, 0, z, 0, sc); for (let i = 0; i < 6; i++) p.cyl(.07 - i * .006, .38, 'trunk', i * i * .012, i * .36, 0, 6);
        for (let i = 0; i < 9; i++) { const [f, fg] = p.group(.36, 2.16, 0); fg.rotation.set(0, i * .7, -.45 - (i % 2) * .25); f.box(.9, .03, .18, 'leaf', .42, 0, 0, true); }
        p.ball(.08, 'trunk', .4, 2.1, .04); p.ball(.08, 'trunk', .32, 2.1, -.06); },
      car: (key, x, z, ry = 0, sc = 1) => { const [c] = sub(x, 0, z, ry, sc); c.box(1, .24, .46, key, 0, .09, 0); c.box(.56, .2, .42, 'glass', -.06, .33, 0); c.box(.5, .03, .4, key, -.06, .53, 0, true);
        c.box(.05, .1, .46, 'ink', .52, .08, 0, true); c.box(.05, .1, .46, 'ink', -.52, .08, 0, true); c.box(.04, .04, .06, key, .16, .38, .25, true); c.box(.04, .04, .06, key, .16, .38, -.25, true);
        [[-.32, .23], [.32, .23], [-.32, -.23], [.32, -.23]].forEach(([wx, wz]) => { const w = c.cyl(.11, .08, 'ink', wx, .11, wz, 12); w.rotation.x = Math.PI / 2; w.position.y = .11; });
        [-.14, .14].forEach(lz => { c.box(.02, .06, .1, '*lamp', .51, .22, lz, true); c.box(.02, .05, .09, 'flag', -.51, .23, lz, true); }); },
      van: (key, x, z, ry = 0, sc = 1) => { const [c] = sub(x, 0, z, ry, sc); c.box(1.3, .56, .52, key, -.1, .09, 0); c.box(.3, .3, .5, key, .62, .09, 0); c.box(.04, .2, .46, 'glass', .78, .38, 0, true);
        [[-.5, .25], [.5, .25], [-.5, -.25], [.5, -.25]].forEach(([wx, wz]) => { const w = c.cyl(.12, .08, 'ink', wx, .12, wz, 12); w.rotation.x = Math.PI / 2; w.position.y = .12; }); },
      bike: (x, z, ry = 0, sc = 1) => { const [b] = sub(x, 0, z, ry, sc); [-.22, .22].forEach(wx => b.ring(.13, .022, 'ink', wx, .14, 0, true));
        const f1 = b.box(.36, .025, .025, 'metal', 0, .22, 0, true); f1.rotation.z = .1; b.box(.025, .2, .025, 'metal', -.06, .16, 0, true); b.box(.1, .02, .05, 'ink', -.06, .37, 0, true);
        b.box(.025, .22, .025, 'metal', .2, .16, 0, true); b.box(.025, .02, .22, 'ink', .2, .38, 0, true); },
      // A window on a facade facing +z: frame, pane, sill. y is the bottom of the pane.
      win: (x, y, z, w = .16, h = .22, key = '*win') => { k.box(w + .05, h + .05, .02, 'line', x, y - .025, z, true); k.box(w, h, .03, key, x, y, z + .006, true); k.box(w + .09, .025, .07, 'line', x, y - .045, z + .02, true); },
      // A grid of plain panes on a facade facing +z (or +x when side is set).
      windows: (x, y, z, cols, rows, dx, dy, w, h, key = '*win', side) => { for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (side) k.box(.04, h, w, key, x, y + j * dy, z + i * dx, true); else k.box(w, h, .04, key, x + i * dx, y + j * dy, z, true); } },
      // A house facing +z: base, walls with framed windows on two sides, a door, cornice, gable roof with eaves, chimney, optional balcony and shop front.
      house: (x, z, ry = 0, { w = 1.3, h = 1.3, d = 1.1, wall = 'wall', roof = 'tile', rh = .55, floors = 2, y = 0, shop = false, balcony = false, chimney = true } = {}) => {
        const [hk] = sub(x, y, z, ry);
        hk.box(w + .04, .1, d + .04, 'stone', 0, -.02, 0); hk.box(w, h, d, wall, 0, 0, 0); hk.box(w + .07, .05, d + .07, 'line', 0, h - .05, 0, true);
        hk.prism(w + .2, rh, d + .2, roof, 0, h, 0); if (chimney) { hk.box(.14, rh * .8, .14, 'stone', w * .25, h + rh * .35, -d * .18); hk.box(.18, .04, .18, 'stone', w * .25, h + rh * 1.15, -d * .18, true); }
        const cols = Math.max(2, Math.round(w / .36)), fh = (h - .15) / floors, mid = Math.floor(cols / 2);
        for (let j = 0; j < floors; j++) for (let i = 0; i < cols; i++) { const wx = -w / 2 + (i + .5) * w / cols, wy = .12 + j * fh + fh * .22;
          if (j === 0 && shop) continue;
          if (j === 0 && i === mid) { hk.box(.2, .38, .03, 'wood', wx, 0, d / 2 + .01); hk.box(.26, .03, .1, 'line', wx, .4, d / 2 + .04, true); hk.box(.24, .04, .14, 'stone', wx, 0, d / 2 + .06, true); continue; }
          hk.win(wx, wy, d / 2 + .005, Math.min(.18, w / cols * .5), fh * .5); }
        if (shop) { hk.box(w * .8, .38, .03, 'glass', 0, .02, d / 2 + .01, true); const a = hk.box(w * .86, .03, .26, 'flag', 0, .46, d / 2 + .12); a.rotation.x = .3; }
        if (balcony && floors > 1) { hk.box(w * .5, .03, .22, 'stone', 0, .12 + fh, d / 2 + .11, true); for (let i = 0; i < 7; i++) hk.box(.015, .16, .015, 'metal', -w * .23 + i * w * .077, .14 + fh, d / 2 + .2, true); hk.box(w * .5, .015, .015, 'metal', 0, .3 + fh, d / 2 + .2, true); }
        const sc = Math.max(1, Math.round(d / .4));
        for (let j = 0; j < floors; j++) for (let i = 0; i < sc; i++) { const [sk] = hk.group(w / 2 + .005, 0, -d / 2 + (i + .5) * d / sc, Math.PI / 2); sk.win(0, .12 + j * fh + fh * .22, 0, .15, fh * .5); }
        return hk; },
      fence: (x1, z1, x2, z2, h = .26, key = 'line') => { const L = Math.hypot(x2 - x1, z2 - z1), [f] = sub(x1, 0, z1, Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2), n = Math.round(L / .14);
        for (let i = 0; i <= n; i++) f.box(.03, h, .02, key, i * L / n, 0, 0, true); [.3, .75].forEach(r => f.box(L, .025, .02, key, L / 2, h * r, -.015, true)); },
      lamp: (x, z, h = 1.6) => { k.cyl(.03, h, 'metal', x, 0, z, 6, 1, true); k.cyl(.05, .08, 'metal', x, 0, z, 8, 1, true); k.box(.26, .03, .03, 'metal', x + .1, h - .02, z, true); k.box(.18, .05, .1, '*lamp', x + .2, h - .06, z, true); },
      bench: (x, z, ry = 0) => { const [b] = sub(x, 0, z, ry); [0, .08, .16].forEach(dz => b.box(.8, .03, .06, 'wood', 0, .24, -.08 + dz, true)); [.3, .4].forEach(yy => b.box(.8, .05, .03, 'wood', 0, yy, -.12, true)); [-.34, .34].forEach(lx => { b.box(.04, .24, .2, 'metal', lx, 0, 0, true); b.box(.04, .22, .03, 'metal', lx, .24, -.12, true); }); },
      bin: (x, z) => { k.cyl(.08, .26, 'metal', x, 0, z, 10); k.cyl(.085, .03, 'ink', x, .26, z, 10, 1, true); },
      sign: (x, z, ry, key = 'line', h = 1.1, w = .4) => { const [sg] = sub(x, 0, z, ry); sg.cyl(.02, h, 'metal', 0, 0, 0, 6, 1, true); sg.box(w, .26, .03, key, 0, h - .1, .02); },
      desk: (x, z, ry = 0, screen = '*screen') => { const [d] = sub(x, 0, z, ry); d.box(1, .04, .5, 'wood', 0, .5, 0); [[-.46, -.2], [.46, -.2], [-.46, .2], [.46, .2]].forEach(([lx, lz]) => d.box(.03, .5, .03, 'metal', lx, 0, lz, true));
        d.box(.3, .4, .42, 'wall2', .3, 0, 0); d.box(.42, .26, .03, 'ink', 0, .62, -.14); d.box(.38, .22, .01, screen, 0, .64, -.12, true); d.box(.04, .1, .04, 'ink', 0, .54, -.16, true); d.box(.3, .015, .1, 'ink', 0, .54, .04, true);
        d.box(.05, .02, .07, 'ink', .24, .54, .05, true); d.cyl(.03, .07, 'line', -.36, .54, .02, 8, 1, true); d.box(.18, .03, .24, 'line', -.3, .54, -.12, true); d.box(.18, .03, .24, 'line', -.29, .57, -.11, true);
        d.box(.34, .06, .32, 'ink', 0, .3, .42); d.box(.34, .34, .05, 'ink', 0, .36, .58); d.cyl(.03, .3, 'metal', 0, 0, .42, 6, 1, true); [0, 1.26, 2.5, 3.77, 5.03].forEach(a => d.box(.02, .02, .18, 'ink', Math.sin(a) * .08, .02, .42 + Math.cos(a) * .08, true)); },
      plant: (x, z, sc = 1) => { const [p] = sub(x, 0, z, 0, sc); p.cyl(.16, .3, 'terra', 0, 0, 0, 10); p.ball(.24, 'leaf', 0, .48, 0); p.ball(.18, 'leaf2', .1, .64, .06); p.ball(.15, 'leaf', -.1, .62, -.06); },
      umbrella: (x, z, key) => { k.cyl(.02, .78, 'metal', x, 0, z, 6, 1, true); k.cone(.38, .18, key, x, .78, z, 10); k.cyl(.38, .02, key, x, .76, z, 10, 1, true); },
      table: (x, z, chairs = 2, people) => { k.cyl(.2, .03, 'line', x, .42, z, 14); k.cyl(.025, .42, 'metal', x, 0, z, 6, 1, true);
        for (let i = 0; i < chairs; i++) { const a = i / chairs * Math.PI * 2, cx = x + Math.sin(a) * .34, cz = z + Math.cos(a) * .34; k.box(.16, .02, .16, 'metal', cx, .26, cz, true); k.box(.02, .26, .02, 'metal', cx, 0, cz, true);
          if (people && i < people.length) k.person(people[i], cx, cz, .42, { pose: 'sit', ry: a + Math.PI, y: -.05 }); } },
    };
    return k;
  }
  const ON = (...ids) => ids;
  const fy = forkH, ny = nextH;

  // --- Hello: the edge of my hometown. A street of houses with gardens, a little square with a fountain ---
  prop(ON('hi'), k => {
    // Houses across the street, each with its garden, a tree, a mailbox; one has a trampoline.
    [[-4.2, -3.2, 1.7, 'wall', 1.3], [-1.7, -3.6, 1.9, 'wall3', 1.55], [.9, -3.6, 1.7, 'wall', 1.35], [3.4, -3.2, 1.8, 'wall4', 1.5]].forEach(([x, z, w, c, h], n) => {
      k.house(x, z, 0, { w, h, d: 1.2, wall: c, balcony: n % 2 === 1 }); k.box(.06, .3, .06, 'metal', x + .55, 0, -1.6, true); k.box(.16, .12, .1, 'line', x + .55, .3, -1.6, true);
      k.box(.26, .01, .7, 'paving', x, .005, -2.2, true); if (n % 2 === 0) k.leafy(x - .8, -2.2, .7); else { k.bush(x - .7, -2.0); k.bush(x + .7, -2.1, .8); } });
    // The trampoline: frame and legs, the dark jumping mat, six enclosure poles with a top ring and a see-through net.
    k.ring(.32, .03, 'ink', 1.9, .3, -2.3).rotation.x = Math.PI / 2; [0, 1, 2, 3].forEach(i => k.box(.02, .3, .02, 'metal', 1.9 + Math.cos(i * 1.57) * .3, 0, -2.3 + Math.sin(i * 1.57) * .3, true));
    k.cyl(.29, .015, 'roof', 1.9, .3, -2.3, 24, 1, true); for (let i = 0; i < 6; i++) k.box(.018, .48, .018, 'metal', 1.9 + Math.cos(i * 1.047) * .32, .3, -2.3 + Math.sin(i * 1.047) * .32, true);
    k.ring(.32, .012, 'metal', 1.9, .78, -2.3, true).rotation.x = Math.PI / 2; k.cyl(.315, .46, 'glass', 1.9, .31, -2.3, 24, 1, true);
    [[-5.5, -.35], [-2.95, .8], [-.45, 3.35], [2.15, 5.4]].forEach(([a, b]) => k.fence(a, -1.7, b, -1.7));
    // The street: kerbs, a dashed centre line, a zebra crossing, parked cars, a bus stop, streetlights.
    [-1.02, -.18].forEach(z => k.box(11.6, .05, .06, 'stone', 0, 0, z, true));
    for (let i = 0; i < 18; i++) { const x = -5.4 + i * .64; if (Math.abs(x) > .6) k.box(.32, .01, .04, 'line', x, .01, -.6, true); }
    for (let i = 0; i < 6; i++) k.box(.1, .012, .74, 'line', -.42 + i * .17, .01, -.6, true);
    k.car('car1', -3.2, -.86, 0, .72); k.car('car3', 2.4, -.34, Math.PI, .72); k.car('car2', -1.6, -.36, Math.PI, .72);
    k.box(.9, .04, .4, 'glass', 4.4, .8, -1.36); k.box(.04, .8, .36, 'glass', 4.0, 0, -1.36, true); k.box(.9, .8, .03, 'glass', 4.4, 0, -1.55, true); k.bench(4.4, -1.4); k.sign(3.8, -1.1, 0, 'gold', 1.2, .22);
    [-3.6, -.6, 2.4, 5.2].forEach(x => k.lamp(x, -1.15, 1.9));
    // The square: a fountain, benches, flower beds, bikes, a bin, the yellow town sign, people.
    k.cyl(.95, .3, 'stone', -2.2, 0, 2.1, 24); k.cyl(.8, .32, 'water', -2.2, .01, 2.1, 24); k.cyl(.1, .7, 'stone', -2.2, .3, 2.1, 10); k.cyl(.32, .08, 'stone', -2.2, .9, 2.1, 16); k.ball(.07, 'stone', -2.2, 1.04, 2.1);
    k.bench(-.9, 3.6, 0); k.bench(-3.9, .7, .8); k.bin(-.3, 3.6);
    [[2.3, 3.4], [-3.6, 3.6]].forEach(([x, z]) => { k.box(1, .18, .42, 'stone', x, 0, z); for (let i = 0; i < 6; i++) k.ball(.08, i % 2 ? 'flag' : 'leaf', x - .38 + i * .15, .22, z + (i % 2 ? .08 : -.08)); });
    [0, 1, 2].forEach(i => k.bike(2.6 + i * .32, 1.4, Math.PI / 2, .9)); k.box(1, .02, .02, 'metal', 2.9, .2, 1.4, true);
    { const [sg] = k.group(-5.0, 0, -1.2, .3); sg.cyl(.02, 1.1, 'metal', 0, 0, 0, 6, 1, true); sg.box(.56, .26, .03, 'gold', 0, 1.0, .02); sg.label('AMSTETTEN', .5, .2, 0, 1.13, .04, { bg: '#f7efcf' }); }
    k.lamp(-1.4, .5); k.lamp(1.6, 3.5);
    k.leafy(3.8, 2.4, .9); k.leafy(-4.6, 2.4, .85); k.leafy(1.1, 4.6, .75);
    k.person('team1', 4.35, .45, .55, { pose: 'walk', ry: -1.3 }); k.dog(3.9, .6, -1.3); k.person('accent', -.9, 3.6, .55, { pose: 'sit', y: .02 });
    k.person('leaf', -1.3, 1.6, .38, { ry: -.6 }); k.person('roof', -1.0, 1.9, .55, { ry: -.6 }); k.person('wall2', 4.4, -1.3, .55, { pose: 'sit', y: .02 });
  });

  // --- The court: an indoor hall in Amstetten, a real match on, and I'm on the court ---
  // --- Discipline, moment 1a: the court as a floor patch, the net, a ball cart, a coach and four teammates. No hall yet ---
  prop(ON('court', 'team', 'down'), k => {
    // Lines: boundary, centre, attack lines; the centre circle with the club crest.
    [[0, -1.75, 7, .05], [0, 1.75, 7, .05], [-3.5, 0, .05, 3.55], [3.5, 0, .05, 3.55], [-1.17, 0, .04, 3.5], [1.17, 0, .04, 3.5], [0, 0, .04, 3.5]].forEach(([x, z, w, d]) => k.box(w, .02, d, 'line', x, .01, z, true));
    // Net: posts with padding, white tapes, a real mesh, red-white antennas, the referee's stand.
    // Net height is to scale: its top sits at ~1.3x a player's height, as on a real court.
    [-2.15, 2.15].forEach(z => { k.cyl(.05, 1.3, 'metal', 0, 0, z, 10); k.cyl(.09, .9, 'seat', 0, 0, z, 10); k.box(.24, .05, .24, 'ink', 0, 0, z); });
    k.box(.02, .06, 4.3, 'line', 0, 1.12, 0, true); k.box(.02, .03, 4.3, 'line', 0, .76, 0, true);
    for (let i = 0; i < 40; i++) k.box(.008, .36, .008, 'net', 0, .78, -2.05 + i * .105, true); for (let j = 1; j < 5; j++) k.box(.008, .008, 4.2, 'net', 0, .76 + j * .075, 0, true);
    [-1.77, 1.77].forEach(z => { for (let i = 0; i < 6; i++) k.box(.025, .12, .025, i % 2 ? 'line' : 'flag', 0, .76 + i * .12, z, true); });
    k.box(.44, .5, .36, 'metal', 0, 0, -2.6); k.box(.52, .05, .44, 'ink', 0, .5, -2.6); for (let i = 0; i < 3; i++) k.box(.36, .025, .05, 'metal', 0, .12 + i * .14, -2.38, true); k.box(.44, .3, .04, 'metal', 0, .55, -2.8, true);
  });
  prop(ON('court', 'team'), k => {
    k.box(.5, .04, .5, 'metal', -2.9, .1, 2.2); [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]].forEach(([lx, lz]) => k.box(.02, .7, .02, 'metal', -2.9 + lx, 0, 2.2 + lz, true));
    for (let i = 0; i < 9; i++) k.ball(.1, i % 2 ? 'gold' : 'team1', -3.04 + (i % 3) * .14, .24 + Math.floor(i / 3) * .17, 2.12 + (i % 2) * .14);
    k.person('roof', 2.9, 2.3, .58, { ry: -2.4 });   // the coach
    // Six a side, as in volleyball: three at the net, three at the back. I am the sixth on the right-hand side, so five stand here for that team.
    [[-.6, -1.1], [-.6, 0], [-.6, 1.1], [-2.5, -1.1], [-2.6, 0], [-2.5, 1.1]].forEach(([x, z], n) => k.person(n === 4 ? 'gold' : 'team1', x, z, .62, { pose: 'ready', ry: Math.PI / 2 }));
    [[.6, -1.1], [.6, 1.1], [2.5, -1.1], [2.6, 0], [2.5, 1.1]].forEach(([x, z]) => k.person('team2', x, z, .62, { pose: 'ready', ry: -Math.PI / 2, legs: 'line' }));
  });
  // --- Discipline, moment 1b: the hall arrives round the same court: stands, back wall, scoreboard, flag, ad boards, benches ---
  prop(ON('team'), k => {
    // The hall: back wall with high windows, a red-white-red flag, banners, the scoreboard, a clock; side walls with folded basketball boards and exits.
    k.box(8.8, 3.8, .3, 'wall', 0, 0, -5.4); k.box(8.8, .12, .34, 'wall2', 0, 3.8, -5.4); k.windows(-3.6, 2.7, -5.24, 9, 1, .9, 0, .7, .7, 'glass');
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) k.box(.7, .02, .02, 'line', -3.6 + i * .9, 2.9 + j * .18, -5.2, true);
    [0, 1, 2].forEach(i => k.box(1.6, .16, .03, i === 1 ? 'line' : 'flag', 0, 2.36 - i * .16, -5.23));
    [[-3.3, 'flag'], [-2.2, 'team1'], [2.2, 'team1'], [3.3, 'flag']].forEach(([x, c]) => { k.box(.7, 1.1, .03, c, x, 1.15, -5.23); k.box(.5, .1, .02, 'line', x, 1.62, -5.21, true); k.box(.3, .3, .02, 'line', x, 1.25, -5.21, true); });
    k.box(2.1, .9, .12, 'ink', 0, 1.2, -5.2); [-.55, .55].forEach(x => k.box(.7, .45, .04, '*score', x, 1.4, -5.13, true)); k.box(.5, .2, .04, '*lamp', 0, 1.6, -5.13, true); k.box(1.8, .1, .04, '*lamp', 0, 1.26, -5.13, true);
    k.cyl(.18, .04, 'line', 3.9, 3.1, -5.22, 20).rotation.x = Math.PI / 2;
    // Side walls run right into the back wall's ends (the back wall spans x ±4.4, the side walls 4.2–4.4).
    [-1, 1].forEach(sd => { k.box(.2, 3.8, 2.5, 'wall', sd * 4.3, 0, -4.15); k.windows(sd * 4.18, 2.7, -4.9, 3, 1, .7, 0, .5, .7, 'glass', true);
      k.box(.04, .5, .8, 'line', sd * 4.17, 2.0, -4.0); k.ring(.1, .015, 'flag', sd * 4.1, 1.98, -4.0, true).rotation.y = Math.PI / 2;
      k.box(.04, .9, .5, 'wood', sd * 4.17, 0, -3.2); k.box(.04, .12, .3, '*led', sd * 4.17, .98, -3.2, true); });
    // Bleachers: three tiers with seats, a railing, a stair in the middle.
    [0, 1, 2].forEach(r => { k.box(8.4, .3 * (r + 1), .62, 'stand', 0, 0, -3.35 - r * .62); for (let i = 0; i < 20; i++) if (i !== 10) k.box(.3, .1, .26, 'seat', -4.0 + i * .4, .3 * (r + 1), -3.25 - r * .62, true); });
    for (let i = 0; i < 3; i++) k.box(.3, .15, .62, 'stand', 0, .3 * (i + 1), -3.35 - i * .62, true);
    for (let i = 0; i < 22; i++) k.box(.02, .3, .02, 'metal', -4.1 + i * .39, .3, -3.06, true); k.box(8.4, .025, .025, 'metal', 0, .6, -3.06, true);
    for (let i = 0; i < 8; i++) { k.box(.98, .32, .06, i % 3 ? 'wall2' : 'brand', -3.5 + i * 1, 0, -2.85); k.box(.6, .1, .02, 'line', -3.5 + i * 1, .12, -2.81, true); }
    k.box(1.4, .5, .45, 'wall', 0, 0, 3.2); k.box(1.5, .04, .55, 'wood', 0, .5, 3.2); k.box(.3, .02, .2, 'ink', -.3, .54, 3.2, true); k.box(.28, .18, .02, '*screen', -.3, .56, 3.1, true); k.box(.3, .3, .04, 'ink', .4, .54, 3.0);
    [-2.6, 2.6].forEach(x => { k.box(1.6, .06, .34, 'wood', x, .32, 3.15); k.box(1.6, .3, .04, 'wood', x, .38, 3.32, true); [-.7, .7].forEach(lx => k.box(.05, .32, .3, 'metal', x + lx, 0, 3.15, true));
      for (let i = 0; i < 3; i++) k.box(.3, .16, .18, i % 2 ? 'team1' : 'ink', x - .5 + i * .5, 0, 3.15, true); for (let i = 0; i < 4; i++) k.cyl(.035, .18, 'bottle', x - .6 + i * .12, .38, 3.05, 8, 1, true); });
    [0, 2.1, 4.2].forEach(a => k.rod(V(4.3 + Math.cos(a) * .2, 0, 2.6 + Math.sin(a) * .2), V(4.3, .62, 2.6), 'metal', .02)); k.box(.06, .06, .06, 'ink', 4.3, .6, 2.6, true); k.box(.26, .16, .14, 'ink', 4.3, .66, 2.6); k.cyl(.05, .12, 'ink', 4.3, .74, 2.47, 10).rotation.x = Math.PI / 2;
  });
  // Floodlights on the top of the back wall and on two masts at the front: on for the match, out at the knee.
  prop(ON('team'), k => { [-3.6, -1.2, 1.2, 3.6].forEach(x => { const l = k.box(.7, .26, .3, '*lamp', x, 3.8, -5.2); l.rotation.x = .5; k.box(.74, .3, .06, 'metal', x, 3.8, -5.36); }); });
  const mast = (k, x, z) => { k.cyl(.05, 3.4, 'metal', x, 0, z, 8); k.box(.04, .04, .6, 'metal', x, 3.2, z, true); [-1, 1].forEach(s2 => { const l = k.box(.34, .26, .2, '*lamp', x, 3.3, z + s2 * .2); l.rotation.y = x < 0 ? -.6 : .6; }); };
  prop(ON('court', 'team'), k => mast(k, -5.2, 2.4));
  prop(ON('court', 'team', 'down'), k => mast(k, 5.2, 2.4));   // the one light left at the knee
  prop(ON('team'), k => {
    // Spectators in the stands, some cheering.
    [0, 1, 2].forEach(r => { for (let i = 0; i < 20; i++) if (i !== 10 && (i * 7 + r * 3) % 5 < 4) k.person(['team1', 'team2', 'accent', 'leaf', 'wall2', 'roof'][(i + r) % 6], -4.0 + i * .4, -3.25 - r * .62, .42,
      (i + r) % 4 ? { pose: 'sit', y: .3 * (r + 1) - .14, legs: 'roof' } : { pose: 'cheer', y: .3 * (r + 1) }); });
    // Both referees, line judges with flags, the coaches, the substitutes on the benches (the six a side are in the court prop above).
    k.person('ink', 0, -2.6, .55, { y: .55 }); k.person('ink', .2, 2.5, .55, { ry: Math.PI });
    [[-3.75, -1.95, .8], [3.75, 1.95, -2.3]].forEach(([x, z, ry]) => { k.person('ink', x, z, .5, { ry }); k.box(.015, .42, .015, 'metal', x + .17, .2, z, true); k.box(.17, .12, .02, 'flag', x + .25, .5, z); });
    [[-3.1, 3.15], [-2.6, 3.15], [-2.1, 3.15], [2.3, 3.15], [2.8, 3.15]].forEach(([x, z], n) => k.person(n > 2 ? 'team2' : 'team1', x, z, .55, { pose: 'sit', ry: Math.PI, y: .22, legs: n > 2 ? 'line' : 'ink' }));
    k.person('roof', -1.4, 2.8, .58, { ry: Math.PI * .9 }); k.person('roof', 1.6, 2.9, .58, { ry: -Math.PI * .9 });
    [[-.3, 3.6], [.3, 3.6]].forEach(([x, z]) => k.person('wall2', x, z, .5, { pose: 'sit', ry: Math.PI, y: .1 }));
    k.person('accent', 4.6, 2.9, .55, { ry: -2.4 });
  });
  // The ball is the one thing on court drawn darker than the white world, so it can be followed.
  const ball = prop(ON('team'), k => { k.ball(.13, 'gold', 1.2, 1.4, .3).material = new THREE.MeshStandardMaterial({ color: 0xa9a9a4, roughness: .6 }); }, false);
  // At the knee: the hall goes dark. I lie on my back holding my knee; the physio kneels at it with her bag, teammates and the coach stand round;
  // crutches lean against the bench.
  prop(ON('down'), k => { [2.0, 2.13].forEach(x => { const c = k.box(.035, .7, .035, 'metal', x, 0, 2.98); c.rotation.x = .35; });
    k.box(.4, .22, .26, 'flag', 2.45, 0, .9); k.box(.08, .03, .28, 'line', 2.45, .22, .9, true);
    k.person('wall', 2.0, .2, .6, { pose: 'kneel', ry: -Math.PI / 2 }); k.person('team2', .9, -.75, .62, { ry: .6, legs: 'line' }); k.person('team2', 2.5, -.55, .62, { ry: -.7, legs: 'line' }); k.person('roof', .6, .75, .62, { ry: 1.4 }); });
  // Moment 2b, "something next": the hall is dark. A wall across the back has one wide gate, and through it a sunrise. A path of light runs from the gate to my feet,
  // and once I am up I walk along it, towards the light. Big, simple and warm against the dark, so it reads at a glance.
  const doorGlow = [];
  const paint = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const sunriseTex = paint(256, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * .68); sky.addColorStop(0, '#fff7e4'); sky.addColorStop(1, '#ffd8a6'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const halo = g.createRadialGradient(w / 2, h * .68, 0, w / 2, h * .68, w * .55); halo.addColorStop(0, 'rgba(255,140,60,.75)'); halo.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = halo; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff7a2e'; g.beginPath(); g.arc(w / 2, h * .68, w * .15, Math.PI, 0); g.fill();   // the sun, half up
    g.fillStyle = '#f2cfa0'; g.beginPath(); g.moveTo(0, h * .72); g.bezierCurveTo(w * .25, h * .6, w * .4, h * .66, w * .55, h * .7); g.bezierCurveTo(w * .75, h * .62, w * .9, h * .66, w, h * .68); g.lineTo(w, h); g.lineTo(0, h); g.fill();   // the far hills
    g.fillStyle = '#ecc08a'; g.fillRect(0, h * .78, w, h * .22); });
  const pathTex = paint(128, 256, (g, w, h) => {
    const f = g.createLinearGradient(0, 0, 0, h); f.addColorStop(0, 'rgba(255,184,100,1)'); f.addColorStop(.6, 'rgba(255,200,130,.55)'); f.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = f;
    g.beginPath(); g.moveTo(w * .3, 0); g.lineTo(w * .7, 0); g.lineTo(w, h); g.lineTo(0, h); g.fill(); });
  prop(ON('up'), k => {
    k.box(3.6, 3.4, .3, 'wall', -1.4, 0, -3.3); k.box(1.2, 3.4, .3, 'wall', 4.6, 0, -3.3); k.box(3.6, .5, .3, 'wall', 2.2, 2.9, -3.3);   // the wall and its gate (x .4 to 4.0, 2.9 high)
    [.4, 4.0].forEach(x => k.box(.12, 2.9, .36, 'wall2', x, 0, -3.3));
    const mk = (w, h, x, y, z, rx, tex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); m.position.set(x, y, z); m.rotation.x = rx; m.userData.live = true; m.renderOrder = 4; k.group(0, 0, 0)[1].add(m); doorGlow.push(m.material); };
    mk(3.6, 2.9, 2.2, 1.45, -3.42, 0, sunriseTex);             // the sunrise, seen through the gate
    mk(4.4, 5.6, 2.2, .08, -.4, -Math.PI / 2, pathTex); }, false);   // the path of light, narrow at the gate and wide at my feet
  const kneeStar = prop(ON('down'), k => { k.ball(.1, '*gold', 1.55, .5, .3); }, false);   // the pain, on my knee (placed each frame)

  // --- The fork: Amstetten's dealership on the left, the road to Kufstein, its fortress, old town and the Inn, the Kaiser mountains with a cable car and a summit cross; a ferry for Riga ---
  let gondola; const cableA = V(3.0, fy(3.0, -1.15) + .55, -1.15), cableB = V(2.5, fy(2.5, -4.0) + .5, -4.0);
  // --- The fork, moment 3a: the dealership, centred, and the key at large scale lying on the forecourt ---
  prop(ON('dealer'), k => {
    const [d] = k.group(3.3, 0, -.5);
    // The dealership: glass showroom with mullions and a white canopy, the brand band, workshop with roller doors, the brand pylon, a car lot and flags.
    d.box(2.6, 1.2, .04, 'glass', -3.9, 0, .4); [-5.18, -2.62].forEach(x => d.box(.04, 1.2, 1.56, 'glass', x, 0, -.4)); d.box(2.6, 1.2, .04, 'wall2', -3.9, 0, -1.18);
    d.box(2.9, .16, 1.8, 'wall', -3.9, 1.2, -.35); d.box(2.9, .1, .04, 'brand', -3.9, 1.22, .56, true);
    for (let i = 0; i < 7; i++) d.box(.04, 1.2, .04, 'metal', -5.2 + i * .43, 0, .42, true); d.box(.5, .7, .03, 'metal', -3.9, 0, .44, true); d.box(.9, .04, .5, 'wall', -3.9, .8, .7, true);
    d.box(2.4, 1.55, 1.4, 'wall2', -4.1, 0, -2.1); d.box(2.5, .08, 1.5, 'wall', -4.1, 1.55, -2.1, true); [-4.8, -4.1, -3.4].forEach(x => { d.box(.5, .8, .04, 'metal', x, 0, -1.38); for (let j = 0; j < 5; j++) d.box(.5, .012, .045, 'ink', x, .12 + j * .15, -1.37, true); });
    d.car('car1', -4.4, -.4, .3, .8); d.car('car3', -3.4, -.5, -.2, .8);
    d.box(.3, 3, .3, 'brand', -1.9, 0, -.8); d.cyl(.42, .08, 'line', -1.9, 2.35, -.62, 24).rotation.x = Math.PI / 2; d.box(.5, .4, .04, 'line', -1.9, .8, -.64, true); d.box(.5, .1, .5, 'stone', -1.9, 0, -.8);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) d.car(['car1', 'car2', 'car3', 'wall', 'brand'][(i + r * 2) % 5], -5 + i * .8, .9 + r * .8, Math.PI / 2, .72);
    for (let i = 0; i < 5; i++) { d.box(.03, .02, .62, 'line', -5.4 + i * .8, .01, .9, true); d.box(.03, .02, .62, 'line', -5.4 + i * .8, .01, 1.7, true); }
    [-5.6, -5.3, -5].forEach((x, n) => { d.cyl(.025, 1.8, 'metal', x, 0, -2.9 + n * .02, 6, 1, true); d.box(.04, .6, .3, n === 1 ? 'flag' : 'brand', x, 1.2, -2.75); });
    for (let i = 0; i < 4; i++) d.ring(.12, .05, 'ink', -2.6, .05 + i * .1, -2.6).rotation.x = Math.PI / 2; for (let i = 0; i < 3; i++) d.ring(.12, .05, 'ink', -2.85, .05 + i * .1, -2.4).rotation.x = Math.PI / 2;
    d.van('wall', -2.6, -1.9, .2, .8); [[-5.6, 2.3], [-2.2, 1.3]].forEach(([x, z]) => d.lamp(x, z, 1.7));
    d.person('roof', -3.6, 1.3, .5, { ry: 1.4 }); d.person('ink', -3.25, 1.3, .5, { ry: -1.6 }); d.person('accent', -3.9, .7, .5, { pose: 'walk', ry: Math.PI });
    // The key: ring, shaft, two teeth; white card, 1.6× a car, lying flat on the forecourt with the ring towards the front.
    const [key, kg] = k.group(-.6, 0, 3.0, .45, 1.6); kg.rotation.x = 0;
    key.ring(.34, .09, 'wall', 0, .09, 0).rotation.x = Math.PI / 2; key.box(.1, .18, .9, 'wall', 0, 0, -.74); key.box(.16, .18, .12, 'wall', .13, 0, -1.05); key.box(.16, .18, .12, 'wall', .13, 0, -.82);
    key.box(.06, .2, .06, 'brand', 0, 0, .0, true);
  });
  // --- The fork, moment 3b: FH Kufstein under the ridge: the campus, students, bikes, spruce on the slopes, a summit cross ---
  prop(ON('kufstein'), k => {
    const [c] = k.group(-2.4, 0, .5);
    c.box(2, .9, .9, 'wall', 2.6, 0, .2); c.box(2.04, .3, .94, 'glass', 2.6, .9, .2); c.box(2.1, .05, 1, 'wall', 2.6, 1.2, .2, true); c.windows(1.75, .25, .66, 7, 2, .28, .32, .2, .2, 'glass');
    for (let i = 0; i < 8; i++) c.box(.03, .3, .03, 'metal', 1.62 + i * .28, .9, .68, true); c.box(.6, .04, .3, 'wall', 2.6, .5, .8, true);
    c.box(.5, 2.0, .5, 'wall2', 3.3, 0, .0); c.windows(3.12, 1.3, .26, 3, 2, .18, .3, .1, .16, 'glass');
    [[2.75, 1.2], [3.0, 1.3], [3.2, 1.0]].forEach(([x, z], n) => c.person(['team1', 'leaf', 'accent'][n], x, z, .45, { pose: n === 2 ? 'walk' : 'stand', ry: n }));
    [0, 1, 2].forEach(i => c.bike(2.75 + i * .2, .8, Math.PI / 2, .7));
    for (let n = 0; n < 44; n++) { const a = n * 2.39996, rr = 1.6 + (n % 11) * .4, x = Math.cos(a) * rr * 1.1, z = -Math.abs(Math.sin(a)) * rr * .7 - 3.0, y = kufH(x, z);
      if (Math.hypot(x, z) < 6.3 && y > .25 && y < 1.7) k.spruce(x, z, .35 + (n % 4) * .08, y - .05); }
    { const cx = -1.5, cz = -4.8, cy = kufH(cx, cz); k.box(.03, .5, .03, 'wood', cx, cy - .05, cz, true); k.box(.24, .03, .03, 'wood', cx, cy + .3, cz, true); }
  });
  prop(ON('_old'), k => {
    // The dealership: glass showroom with mullions and a white canopy, the brand band, workshop with roller doors, the brand pylon, a car lot and flags.
    k.box(2.6, 1.2, .04, 'glass', -3.9, 0, .4); [-5.18, -2.62].forEach(x => k.box(.04, 1.2, 1.56, 'glass', x, 0, -.4)); k.box(2.6, 1.2, .04, 'wall2', -3.9, 0, -1.18);
    k.box(2.9, .16, 1.8, 'wall', -3.9, 1.2, -.35); k.box(2.9, .1, .04, 'brand', -3.9, 1.22, .56, true);
    for (let i = 0; i < 7; i++) k.box(.04, 1.2, .04, 'metal', -5.2 + i * .43, 0, .42, true); k.box(.5, .7, .03, 'metal', -3.9, 0, .44, true); k.box(.9, .04, .5, 'wall', -3.9, .8, .7, true);
    k.box(2.4, 1.55, 1.4, 'wall2', -4.1, 0, -2.1); k.box(2.5, .08, 1.5, 'wall', -4.1, 1.55, -2.1, true); [-4.8, -4.1, -3.4].forEach(x => { k.box(.5, .8, .04, 'metal', x, 0, -1.38); for (let j = 0; j < 5; j++) k.box(.5, .012, .045, 'ink', x, .12 + j * .15, -1.37, true); });
    k.car('car1', -4.4, -.4, .3, .8); k.car('car3', -3.4, -.5, -.2, .8);
    k.box(.3, 3, .3, 'brand', -1.9, 0, -.8); k.cyl(.42, .08, 'line', -1.9, 2.35, -.62, 24).rotation.x = Math.PI / 2; k.box(.5, .4, .04, 'line', -1.9, .8, -.64, true); k.box(.5, .1, .5, 'stone', -1.9, 0, -.8);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) k.car(['car1', 'car2', 'car3', 'wall', 'brand'][(i + r * 2) % 5], -5 + i * .8, .9 + r * .8, Math.PI / 2, .72);
    for (let i = 0; i < 5; i++) { k.box(.03, .02, .62, 'line', -5.4 + i * .8, .01, .9, true); k.box(.03, .02, .62, 'line', -5.4 + i * .8, .01, 1.7, true); }
    [-5.6, -5.3, -5].forEach((x, n) => { k.cyl(.025, 1.8, 'metal', x, 0, -2.9 + n * .02, 6, 1, true); k.box(.04, .6, .3, n === 1 ? 'flag' : 'brand', x, 1.2, -2.75); });
    for (let i = 0; i < 4; i++) k.ring(.12, .05, 'ink', -2.6, .05 + i * .1, -2.6).rotation.x = Math.PI / 2; for (let i = 0; i < 3; i++) k.ring(.12, .05, 'ink', -2.85, .05 + i * .1, -2.4).rotation.x = Math.PI / 2;
    k.van('wall', -2.6, -1.9, .2, .8); [[-5.6, 2.3], [-2.2, 1.3]].forEach(([x, z]) => k.lamp(x, z, 1.7));
    k.person('roof', -3.6, 1.3, .5, { ry: 1.4 }); k.person('ink', -3.25, 1.3, .5, { ry: -1.6 }); k.person('accent', -3.9, .7, .5, { pose: 'walk', ry: Math.PI });
    // The road out of town: grey back to the dealership, gold on to Kufstein. A signpost where they split.
    k.box(5.9, .03, .6, 'road', -3.09, .01, 2.4).rotation.y = .3; for (let i = 0; i < 9; i++) { const x = -5.6 + i * .6; k.box(.25, .01, .04, 'line', x, .045, 2.4 - (x + 3.09) * .31, true).rotation.y = .3; }
    k.car('car2', -2.4, 2.19, .3, .62); k.box(3, .04, .55, '*gold', 1.2, .01, 1.5).rotation.y = .42;
    k.cyl(.02, .9, 'metal', -.6, 0, 1.4, 6, 1, true); const s1 = k.box(.42, .1, .02, 'line', -.42, .76, 1.4); s1.rotation.y = .3; const s2 = k.box(.42, .1, .02, 'gold', -.78, .62, 1.4); s2.rotation.y = -.3;
    // Kufstein: the fortress on its rock, with walls, the round Kaiserturm, gate and battlements; the old town and the church under it.
    const fx = .9, fz = -1.6, fh = fy(fx, fz);
    k.cyl(.95, .5, 'stone', fx, fh - .15, fz, 14); for (let i = 0; i < 14; i++) k.box(.12, .1, .1, 'stone', fx + Math.cos(i * .45) * .9, fh + .35, fz + Math.sin(i * .45) * .9, true);
    k.cyl(.36, 1.3, 'wall', fx + .2, fh, fz - .1, 16); k.cyl(.39, .08, 'stone', fx + .2, fh + .9, fz - .1, 16, 1, true); k.cone(.42, .5, 'roof', fx + .2, fh + 1.3, fz - .1, 16); k.cyl(.015, .25, 'metal', fx + .2, fh + 1.8, fz - .1, 4, 1, true);
    for (let i = 0; i < 3; i++) k.box(.06, .12, .02, 'ink', fx + .1 + i * .1, fh + .6, fz + .25, true);
    k.box(.7, .55, .5, 'wall2', fx - .4, fh + .2, fz + .2); k.prism(.76, .3, .56, 'roof', fx - .4, fh + .75, fz + .2); k.box(.2, .26, .04, 'wood', fx - .4, fh + .2, fz + .46, true);
    k.windows(fx - .6, fh + .45, fz + .46, 3, 1, .2, 0, .06, .1, 'ink');
    [[-.5, -.5, .2], [.45, -.2, -.1], [-.55, -1.45, .5], [2.45, -1.0, -.5]].forEach(([x, z, ry], n) => k.house(x, z, ry, { w: .55, h: .5, d: .5, rh: .32, floors: 1, wall: n % 2 ? 'wall3' : 'wall', y: fy(x, z) - .03, chimney: false }));
    { const cx = 1.7, cz = -.75, cy = fy(cx, cz); k.box(.24, 1.1, .24, 'wall', cx, cy, cz); k.cone(.17, .45, 'roof', cx, cy + 1.1, cz, 8); k.cyl(.06, .02, 'line', cx, cy + .85, cz + .13, 12).rotation.x = Math.PI / 2; }
    // FH Kufstein: the campus, a long modern building with a glass front, a tower, students, bikes.
    k.box(2, .9, .9, 'wall', 2.6, 0, .2); k.box(2.04, .3, .94, 'glass', 2.6, .9, .2); k.box(2.1, .05, 1, 'wall', 2.6, 1.2, .2, true); k.windows(1.75, .25, .66, 7, 2, .28, .32, .2, .2, 'glass');
    for (let i = 0; i < 8; i++) k.box(.03, .3, .03, 'metal', 1.62 + i * .28, .9, .68, true); k.box(.6, .04, .3, 'wall', 2.6, .5, .8, true);
    k.box(.5, 2.0, .5, 'wall2', 3.3, 0, .0); k.windows(3.12, 1.3, .26, 3, 2, .18, .3, .1, .16, 'glass');
    [[2.75, 1.2], [3.0, 1.3], [3.2, 1.0]].forEach(([x, z], n) => k.person(['team1', 'leaf', 'accent'][n], x, z, .45, { pose: n === 2 ? 'walk' : 'stand', ry: n }));
    [0, 1, 2].forEach(i => k.bike(2.75 + i * .2, .8, Math.PI / 2, .7));
    // Tyrolean houses: white walls, wooden balconies, wide roofs.
    [[1.6, -3.1], [3.8, -1.6], [-.6, -2.4], [-1.4, -3.3]].forEach(([x, z], n) => { const y = fy(x, z), hk = k.house(x, z, n * .4, { w: .7, h: .55, d: .6, rh: .3, floors: 2, wall: 'wall', roof: 'wood', y: y - .05, chimney: false });
      hk.box(.76, .04, .14, 'wood', 0, .3, .37, true); for (let i = 0; i < 8; i++) hk.box(.012, .12, .012, 'wood', -.35 + i * .1, .33, .43, true); });
    // The cable car up the Wilder Kaiser: two stations, pylons, the cable, a cabin on its way. A mountain hut and the summit cross.
    k.box(.4, .3, .3, 'wall', cableA.x, cableA.y - .55, cableA.z); k.box(.36, .26, .3, 'wall', cableB.x, cableB.y - .5, cableB.z);
    [.33, .66].forEach(t => { const p = cableA.clone().lerp(cableB, t), y0 = fy(p.x, p.z); k.box(.04, p.y - y0 + .04, .04, 'metal', p.x, y0 - .02, p.z, true); k.box(.04, .04, .24, 'metal', p.x, p.y, p.z, true); });
    [-.05, .05].forEach(dx => k.rod(cableA.clone().add(V(dx, 0, 0)), cableB.clone().add(V(dx, 0, 0)), 'ink', .01));
    { const [gk, gg] = k.group(0, 0, 0); gk.box(.12, .12, .1, 'flag', 0, -.16, 0); gk.box(.01, .1, .01, 'metal', 0, -.06, 0, true); gondola = live(gg); }
    const cx2 = 2.4, cz2 = -4.6, cy2 = fy(cx2, cz2); k.box(.03, .4, .03, 'wood', cx2, cy2 - .05, cz2, true); k.box(.2, .03, .03, 'wood', cx2, cy2 + .22, cz2, true);
    k.house(-.5, -4.6, .3, { w: .5, h: .3, d: .4, rh: .22, floors: 1, wall: 'wood', roof: 'roof', y: fy(-.5, -4.6) - .05, chimney: true });
    // Spruce forest on the slopes; trees in Amstetten.
    for (let n = 0; n < 60; n++) { const a = n * 2.39996, rr = 1.8 + (n % 13) * .36, x = Math.cos(a) * rr * .95 + 1.3, z = -Math.abs(Math.sin(a)) * rr * .85 - 1.4, y = fy(x, z);
      if (Math.hypot(x, z) < 6.4 && y > .2 && y < 1.8 && Math.hypot(x - fx, z - fz) > 1.1 && dseg(x, z, cableA.x, cableA.z, cableB.x, cableB.z) > .5) k.spruce(x, z, .35 + (n % 4) * .08, y - .05); }
    [[-5.6, -1.4], [-2.8, -3.4], [-1.3, 3.4], [-4.6, 3.6], [2.2, 1.9]].forEach(([x, z], n) => k.leafy(x, z, .7 + (n % 2) * .2));
    // The Inn: a stone bridge with arches; the pier, a lighthouse on its rock, a sailboat.
    // The bridge sits halfway down the river, at right angles to it (the river runs along (-.6, .8), the deck along (.8, .6)).
    { const [bk] = k.group(4.25, 0, .6, -.6435); bk.box(1.25, .08, .4, 'stone', 0, .03, 0); bk.box(1.25, .1, .03, 'stone', 0, .11, .19, true); bk.box(1.25, .1, .03, 'stone', 0, .11, -.19, true); [-.28, .28].forEach(x => bk.box(.12, .46, .4, 'stone', x, -.42, 0)); }
    { const [pk] = k.group(2.6, 0, 3.2, -.5); pk.box(2, .06, .5, 'wood', 0, -.04, 0); [0, .5, .95].forEach(x => [-.2, .2].forEach(z => pk.cyl(.04, .47, 'wood', x, -.47, z, 6, 1, true))); }
    k.cyl(.3, .4, 'rock', 5.0, -.45, 2.3, 8); for (let i = 0; i < 4; i++) k.cyl(.12 - i * .01, .2, i % 2 ? 'line' : 'flag', 5.0, -.05 + i * .2, 2.3, 10); k.cyl(.09, .12, '*lamp', 5.0, .75, 2.3, 8); k.cone(.11, .12, 'roof', 5.0, .87, 2.3, 8);
    { const [sk] = k.group(2.8, -.14, 4.7, .4); sk.box(.5, .1, .16, 'line', 0, 0, 0); sk.cyl(.015, .7, 'metal', 0, .1, 0, 4, 1, true); const sl = sk.cone(.25, .6, 'sail', .12, .15, 0, 3); sl.scale.z = .15; }
    // The Baltic ferry, which sails out across the bay at the end of the scene (staying inside the stage).
    const [b, bg] = k.group(3.6, -.14, 3.0, -.4); b.box(1.6, .3, .5, 'boat', 0, 0, 0); b.box(1.5, .06, .48, 'line', 0, .3, 0, true); b.box(1, .3, .42, 'wall', -.1, .34, 0); b.box(.6, .2, .38, 'wall', -.2, .64, 0);
    b.windows(-.55, .44, .22, 6, 1, .18, 0, .1, .08, '*win'); b.windows(-.4, .7, .2, 4, 1, .14, 0, .08, .06, 'glass'); b.cyl(.08, .3, 'flag', .2, .64, 0, 10); b.box(.04, .12, .5, 'line', .7, .3, 0, true); live(bg).userData.boat = true;
  });

  // --- The spark: Silhouette's office. The eyewear in the vitrine, the desks, a kitchen, three doors; a pile that sorts itself ---
  prop(ON('_old'), k => {
    // The far wall is the partition with the three doors: marketing, e-commerce, data (the gold one). Side walls with windows frame the open-plan floor.
    k.box(8.4, 2.4, .12, 'wall2', 0, 0, -3.6); k.box(8.6, .14, .5, 'wall', 0, 2.4, -3.6); [-2.4, 0, 2.4].forEach(x => k.box(1.2, 2.2, .16, 'carpet', x, 0, -3.6));
    [-2.4, 0, 2.4].forEach((x, i) => { const key = i === 2 ? '*gold' : 'ink'; k.box(.1, 2.24, .2, key, x - .62, 0, -3.6); k.box(.1, 2.24, .2, key, x + .62, 0, -3.6); k.box(1.34, .1, .22, key, x, 2.2, -3.6);
      k.box(.5, .12, .02, 'line', x, 1.92, -3.5, true);
      const [d, dg] = k.group(x - .56, 0, -3.5); d.box(1.1, 2.18, .05, 'wall', .55, 0, 0); d.ball(.04, 'metal', 1, 1, .05); d.box(.3, .8, .02, 'glass', .55, 1.1, .03, true); doors.push(live(dg)); });
    k.box(1.6, .3, .03, 'brand', -1.2, 2.5, -3.32, true); k.label('DIGITAL BUSINESS', 1.5, .22, -1.2, 2.65, -3.3);
    [-4.4, 4.4].forEach(x => { k.box(.16, 2.4, 3.4, 'wall', x, 0, -1.9); k.windows(x * .97, .8, -3.2, 3, 1, 1, 0, .7, 1.1, 'glass', true); for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) k.box(.02, .02, .7, 'line', x * .965, .9 + j * .18, -3.2 + i, true); });
    // The eyewear vitrine along the left wall: lit shelves with frames on them; a display table of frames at the front.
    k.box(.3, 2, 2.2, 'wall2', -4.15, 0, -2); for (let j = 0; j < 4; j++) { k.box(.28, .03, 2.1, '*lamp', -4.0, .42 + j * .42, -2, true);
      for (let i = 0; i < 6; i++) [-.05, .05].forEach(d => { const f = k.ring(.035, .008, 'ink', -3.96, .48 + j * .42, -2.85 + i * .34 + d, true); f.rotation.y = Math.PI / 2; }); }
    k.box(1.4, .55, .6, 'wall', .4, 0, 1.1); k.box(1.5, .04, .7, 'line', .4, .55, 1.1);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { k.box(.02, .1, .02, 'metal', -.1 + i * .25, .59, .95 + j * .3, true); [-.035, .035].forEach(d => k.ring(.03, .007, 'ink', -.1 + i * .25 + d, .72, .95 + j * .3, true)); }
    // Open-plan desks with colleagues, desk lamps, a printer, a shelf of binders.
    [[-2.6, -2.5], [-1.3, -2.5], [0, -2.5], [-2.6, -1.5], [-1.3, -1.5], [0, -1.5]].forEach(([x, z], n) => { k.desk(x, z, n < 3 ? 0 : Math.PI); if (n !== 2) k.person(['team1', 'accent', 'leaf', 'team2', 'roof'][n % 5], x, z + (n < 3 ? .45 : -.45), .5, { pose: 'sit', ry: n < 3 ? Math.PI : 0, y: .04 }); });
    k.box(.6, .5, .45, 'wall2', 1.1, 0, -2.0); k.box(.5, .2, .4, 'metal', 1.1, .5, -2.0); k.box(.3, .02, .2, 'line', 1.1, .7, -2.0, true);
    k.box(1.2, 1.4, .32, 'wood', 4.15, 0, -1.0); for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) k.box(.03, .3, .14, ['brand', 'flag', 'gold', 'leaf'][(i + j) % 4], 4.1, .08 + j * .45, -1.5 + i * .16, true);
    k.person('ink', 1.75, -.8, .52, { ry: -2.6 }); k.person('wall2', 1.45, -.45, .52, { ry: 2.4 });
    // A glass meeting room, front left: table, chairs, a screen, two colleagues. A whiteboard on wheels.
    k.box(2, 1.2, .04, 'glass', -3.2, 0, .4); k.box(.04, 1.2, 2, 'glass', -2.2, 0, 1.4); k.box(1.3, .05, .6, 'wood', -3.3, .5, 1.4); k.box(1, .55, .04, '*screen', -3.2, .55, .45, true);
    [[-3.7, 1], [-2.9, 1], [-3.7, 1.8], [-2.9, 1.8]].forEach(([x, z]) => k.box(.26, .36, .26, 'ink', x, 0, z)); k.person('team2', -3.7, 1.0, .5, { pose: 'sit', y: .02 }); k.person('leaf', -2.9, 1.8, .5, { pose: 'sit', ry: Math.PI, y: .02 });
    k.box(1, .7, .04, 'line', -1.4, .5, .5); [-1.85, -.95].forEach(x => k.box(.04, 1.2, .04, 'metal', x, 0, .5, true)); for (let i = 0; i < 3; i++) k.box(.5 - i * .1, .02, .01, 'ink', -1.5, .95 - i * .12, .53, true);
    // The kitchen on the right: counter, sink, fridge, coffee machine, stools.
    k.box(1.4, .9, .5, 'wall2', 3.6, 0, -2.6); k.box(1.5, .05, .55, 'line', 3.6, .9, -2.6); k.box(.3, .36, .3, 'ink', 3.3, .95, -2.6); k.box(.36, .02, .3, 'metal', 3.9, .95, -2.6, true); k.box(.5, 1.6, .5, 'metal', 4.1, 0, -3.2);
    [3.2, 3.7].forEach(x => { k.cyl(.12, .04, 'ink', x, .5, -2.1, 10); k.cyl(.02, .5, 'metal', x, 0, -2.1, 6, 1, true); });
    [-3.9, .85, 4, -1.8].forEach((x, n) => k.plant(x, n === 3 ? -.4 : -.6 - (n % 2) * .3));
    // The lounge at the front: a rug, a sofa and armchairs round a coffee table with magazines, a floor lamp; the reception desk with a colleague.
    k.box(2.2, .01, 1.5, 'wall2', -1.6, 0, 3.3, true); k.box(1.6, .28, .55, 'roof', -1.6, 0, 3.95); k.box(1.6, .34, .14, 'roof', -1.6, .28, 4.18);
    [-2.6, -.6].forEach(x => { k.box(.55, .28, .55, 'roof', x, 0, 3.1); k.box(.55, .3, .12, 'roof', x, .28, x < -1 ? 2.85 : 2.85); }); k.box(.8, .28, .45, 'wood', -1.6, 0, 3.15);
    for (let i = 0; i < 3; i++) k.box(.18, .015, .24, i % 2 ? 'flag' : 'line', -1.85 + i * .25, .28 + i * .015, 3.15, true); k.cyl(.02, 1.3, 'metal', -3.2, 0, 4.0, 6, 1, true); k.cone(.15, .2, '*lamp', -3.2, 1.2, 4.0, 12);
    k.person('accent', -2.6, 3.1, .5, { pose: 'sit', y: .0, ry: .7 }); k.person('team1', -1.3, 3.95, .5, { pose: 'sit', y: .0, ry: Math.PI });
    k.box(1.8, .62, .5, 'wall', 1.0, 0, 4.2); k.box(1.9, .05, .6, 'wood', 1.0, .62, 4.2); k.box(.6, .1, .02, 'brand', 1.0, .4, 4.46, true); k.person('wall2', 1.0, 3.75, .55); k.plant(2.3, 4.2, 1.1);
  });
  // A messy pile of numbers sorts itself into one neat block, and one cube lands on top and glows: the recommendation.
  prop(ON('_old'), k => { for (let n = 0; n < 17; n++) { const top = n === 16, m = k.box(.3, .3, .3, top ? '*rec' : 'wall2', 0, 0, 0);
    m.userData = { a: V(4 + Math.cos(n * 2.4) * .6, .2 + (n % 3) * .3, 1.8 + Math.sin(n * 2.4) * .45), r: n,
      b: top ? V(2.78, .79, 2.61) : V(2.3 + (n % 4) * .32, .15 + Math.floor(n / 8) * .32, 2.45 + (Math.floor(n / 4) % 2) * .32) }; pile.push(m); } }, false);

  // --- The engine: my desk in the analytics corner. A printer and a growing pile of reports, then a server rack and a wall screen take over ---
  prop(ON('_old'), k => {
    k.box(9.4, 2.6, .2, 'wall', 0, 0, -4.9); k.windows(-4, .6, -4.78, 4, 1, 1, 0, .78, 1.6, 'glass'); for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) k.box(.78, .02, .02, 'line', -4 + i, 1.0 + j * .12, -4.76, true);
    [-4.6, 4.6].forEach(x => { k.box(.2, 2.6, 3, 'wall', x, 0, -3.4); k.windows(x * .97, .8, -4.3, 2, 1, 1.2, 0, .8, 1.1, 'glass', true); });
    // Whiteboard with sticky notes, the wall calendar with the weeks of manual reports crossed off, a colleague explaining something.
    k.box(2.6, 1.2, .04, 'line', 2.2, .9, -4.78); for (let i = 0; i < 4; i++) k.box(1.6 - i * .3, .02, .02, 'ink', 1.9, 1.85 - i * .2, -4.75, true);
    for (let i = 0; i < 12; i++) k.box(.14, .14, .01, ['gold', 'flag', 'leaf', 'screen'][i % 4], 2.9 + (i % 4) * .18, 1.1 + Math.floor(i / 4) * .2, -4.75, true);
    { const [ck] = k.group(-4.48, 0, -2.3, Math.PI / 2); ck.box(.72, .66, .02, 'line', 0, .95, 0); ck.label('SALES REPORTS · 2023', .66, .09, 0, 1.53, .015); for (let i = 0; i < 26; i++) ck.box(.08, .08, .01, i < 20 ? 'flag' : 'wall2', -.27 + (i % 7) * .09, 1.38 - Math.floor(i / 7) * .1, .015, true); }
    k.person('roof', 1.2, -4.2, .55, { ry: .4 });
    // Colleagues' desks at the back, a coffee machine, a water cooler, shelves of binders, filing cabinets, plants.
    [[-3, -3.6], [-1.7, -3.6], [-3, -2.7], [-.4, -3.6]].forEach(([x, z], n) => { k.desk(x, z, n === 2 ? Math.PI : 0); if (n % 2) k.person(['accent', 'team1'][n % 2], x, z + .45, .5, { pose: 'sit', ry: Math.PI, y: .04 }); });
    k.box(.5, .85, 1.2, 'wall2', -4.15, 0, -1.65); k.box(.55, .04, 1.25, 'line', -4.15, .85, -1.65); k.box(.28, .32, .26, 'ink', -4.15, .89, -2.05); [-1.55, -1.4].forEach(z => k.cyl(.04, .09, 'line', -4.1, .89, z, 8, 1, true));
    k.box(.26, .72, .26, 'wall', -4.2, 0, -.65); k.cyl(.1, .3, 'bottle', -4.2, .72, -.65, 12);
    k.box(.35, 1.8, 1.6, 'wood', -4.3, 0, .4); for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) k.box(.24, .34, .2, ['brand', 'flag', 'gold', 'leaf'][(i + j) % 4], -4.2, .08 + j * .44, -.25 + i * .26, true);
    [3.2, 3.7].forEach(x => { k.box(.45, 1, .5, 'metal', x, 0, -4.4); for (let j = 0; j < 3; j++) k.box(.3, .02, .02, 'ink', x, .2 + j * .32, -4.14, true); }); [-.9, 4.1].forEach(x => k.plant(x, x > 0 ? 1.2 : -2.2, 1.2));
    // My desk: two monitors, keyboard, mouse, a notebook, a mug, a lamp, my glasses case, a photo; crumpled drafts in and around the bin.
    k.box(1.8, .05, .8, 'wood', -.9, .55, .9); [[-1.7, .55], [-.1, .55], [-1.7, 1.25], [-.1, 1.25]].forEach(([x, z]) => k.box(.04, .55, .04, 'metal', x, 0, z, true)); k.box(.4, .45, .7, 'wall2', -1.5, 0, .9);
    [-1.3, -.5].forEach(x => { k.box(.62, .36, .04, 'ink', x, .76, .6); k.box(.56, .3, .01, '*screen', x, .79, .63, true); k.box(.05, .16, .05, 'ink', x, .6, .58, true); k.box(.2, .02, .14, 'ink', x, .6, .56, true); });
    k.box(.4, .02, .14, 'ink', -.9, .6, 1.05, true); k.box(.05, .02, .08, 'ink', -.6, .6, 1.05, true); k.cyl(.04, .1, 'flag', -.2, .6, 1.1, 10); k.box(.2, .02, .28, 'line', -1.55, .6, 1.05, true);
    k.cyl(.05, .02, 'metal', -1.65, .6, .7, 10, 1, true); k.box(.015, .3, .015, 'metal', -1.65, .62, .7, true); k.box(.12, .05, .08, '*lamp', -1.58, .9, .74, true); k.box(.12, .03, .05, 'ink', -1.2, .6, 1.15, true); k.box(.1, .12, .02, 'line', -1.75, .6, .9, true);
    k.cyl(.12, .3, 'metal', .25, 0, 1.6, 12); [[.1, 1.85], [.45, 1.5], [.35, 1.95], [-.3, 2.1]].forEach(([x, z]) => balls.push(k.ball(.05, 'line', x, .05, z)));
    k.box(2.6, .01, 1.8, 'wall2', -.9, 0, 1.2, true);
    // The front of the room: a sofa corner, a standing table where two colleagues talk, a floor lamp, a bike against the wall.
    k.box(1.6, .3, .6, 'roof', -3.2, 0, 2.8); k.box(1.6, .36, .16, 'roof', -3.2, .3, 3.04); [-4.0, -2.4].forEach(x => k.box(.14, .4, .6, 'roof', x, 0, 2.8)); k.box(.9, .3, .45, 'wood', -3.2, 0, 2.05);
    k.box(.2, .02, .26, 'line', -3.4, .3, 2.05, true); k.cyl(.04, .1, 'flag', -2.9, .3, 2.05, 8, 1, true); k.person('team2', -3.5, 2.75, .5, { pose: 'sit', y: .02, ry: Math.PI * .9 });
    k.cyl(.02, 1.4, 'metal', -4.3, 0, 3.2, 6, 1, true); k.cone(.16, .2, '*lamp', -4.3, 1.3, 3.2, 12);
    k.cyl(.3, .03, 'wood', 2.6, .95, 2.7, 16); k.cyl(.03, .95, 'metal', 2.6, 0, 2.7, 6, 1, true); k.cyl(.04, .1, 'line', 2.5, .98, 2.7, 8, 1, true);
    k.person('leaf', 2.2, 2.9, .55, { ry: 1.8 }); k.person('wall2', 3.0, 2.6, .55, { ry: -1.6 }); k.plant(3.8, 1.8, 1.1); k.plant(-1.9, 3.6, .9);
    { const [pk, pg] = k.group(.3, .6, .9); for (let i = 0; i < 16; i++) pk.box(.42, .022, .3, 'line', Math.sin(i * 2.1) * .02, i * .026, Math.cos(i * 1.7) * .015, true).rotation.y = Math.sin(i * 1.3) * .06; paper = live(pg); }   // the weekly reports, by hand
    k.box(2, 1.1, .05, '*wall', -1.6, 1.2, -4.76); k.box(2.1, 1.2, .04, 'ink', -1.6, 1.15, -4.79);   // the wall screen that ends up running the numbers, live
  });
  prop(ON('_old'), k => { const [c, cg] = k.group(1.6, 0, 1.4); c.box(.8, .45, .6, 'metal', 0, 0, 0); c.box(.76, .05, .56, 'ink', 0, .45, 0); c.box(.2, .05, .08, '*lamp', .26, .38, .31, true);
    c.box(.5, .02, .3, 'line', 0, .24, .42, true); cg.userData.sheet = c.box(.4, .012, .28, 'line', 0, .27, .3, true); printer = cg; }, false);
  prop(ON('_old'), k => { const [b, bg] = k.group(3.3, 0, -.6); b.box(.9, 2.1, .8, 'ink', 0, 0, 0); for (let j = 0; j < 8; j++) { b.box(.8, .02, .02, 'metal', 0, .2 + j * .24, .41, true); [0, 1, 2].forEach(i => b.box(.04, .04, .02, '*led', -.3 + i * .08, .28 + j * .24, .42, true)); }
    b.box(.08, .1, .08, 'metal', 0, 2.1, -.3); b.box(.12, .04, 4.0, 'metal', 0, 2.2, -2.1); for (let n = 0; n < 5; n++) packets.push(b.box(.08, .08, .08, '*led', 0, 2.24, 0, true)); rack = bg; }, false);

  // --- The double shift: Barcelona. Eixample blocks, the Sagrada Família, Torre Glòries, EAE, the beach with the Hotel Arts and the golden fish. Day turns to night ---
  prop(ON('_old'), k => {
    // Three Eixample blocks: chamfered octagons round a green courtyard, balconies on every floor, shops with awnings, roof terraces.
    [[-3.8, -2.4], [-2.5, -4.6], [.6, -4.7]].forEach(([x, z], bn) => { const [b] = k.group(x, 0, z, Math.PI / 8); b.cyl(1.1, 1.6, bn === 1 ? 'wall' : 'wall3', 0, 0, 0, 8); b.cyl(.62, 1.62, 'leaf', 0, 0, 0, 8); b.cyl(1.12, .06, 'terra', 0, 1.6, 0, 8);
      for (let f = 0; f < 8; f++) { const a = f * Math.PI / 4 + Math.PI / 8, [w] = b.group(Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02, -a + Math.PI / 2);
        w.box(.62, .34, .03, 'glass', 0, .02, .02, true); const aw = w.box(.66, .02, .14, f % 2 ? 'flag' : 'gold', 0, .4, .08, true); aw.rotation.x = .3;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { w.box(.14, .2, .04, '*win', -.15 + i * .3, .55 + j * .33, .02, true); w.box(.2, .02, .09, 'ink', -.15 + i * .3, .53 + j * .33, .06, true); w.box(.2, .07, .01, 'metal', -.15 + i * .3, .55 + j * .33, .1, true); }
        w.box(.5, .1, .03, 'wall2', 0, 1.6, .04, true); } });
    // The Sagrada Família, still under construction: the bell towers with their tops, the tall centre tower, the façade, cranes.
    const sx = 3.2, sz = -3.9; k.box(1.5, 1.3, .9, 'stone', sx, 0, sz); k.prism(1.55, .45, .95, 'stone', sx, 1.3, sz);
    for (let i = 0; i < 3; i++) k.box(.24, .62, .03, 'ink', sx - .45 + i * .45, 0, sz + .46, true);
    [-1, 1].forEach(side => [[-.6, 2.3], [-.2, 2.75], [.2, 2.75], [.6, 2.3]].forEach(([x, h]) => { const z = sz + side * .62, hh = side > 0 ? h : h - .2;
      k.cyl(.1, hh, 'stone', sx + x, 0, z, 12, 1.5); k.cone(.07, .45, 'gold', sx + x, hh, z, 8); k.ball(.05, 'flag', sx + x, hh + .5, z);
      for (let j = 0; j < 4; j++) k.box(.03, .12, .02, 'ink', sx + x, .7 + j * .4, z + side * .12, true); }));
    k.cyl(.2, 3.6, 'stone', sx, 0, sz, 14, 1.4); k.cone(.15, .55, 'line', sx, 3.6, sz, 12); k.box(.05, .26, .05, 'line', sx, 4.15, sz, true); k.box(.18, .05, .05, 'line', sx, 4.29, sz, true);
    k.box(.08, 3.0, .08, 'crane', 4.55, 0, -3.7); k.box(.06, .06, 1.3, 'crane', 4.55, 3.0, -4.25); k.box(.06, .06, .35, 'crane', 4.55, 3.0, -3.45); k.box(.01, .6, .01, 'ink', 4.55, 2.4, -4.75, true);
    // Torre Glòries: the bullet-shaped tower, its skin of little windows.
    k.cyl(.45, 2.8, 'wall2', 4.9, 0, -1.5, 20, 1.1); const dome = k.ball(.45, 'wall2', 4.9, 2.8, -1.5); dome.scale.y = 1.5;
    for (let j = 0; j < 12; j++) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + j * .2; k.box(.06, .08, .02, '*win', 4.9 + Math.sin(a) * .47, .2 + j * .22, -1.5 + Math.cos(a) * .47, true).rotation.y = a; }
    // EAE: a modern building, the classroom where I spent my evenings, students inside.
    k.box(2.2, 1.8, 1.4, 'wall', .9, 0, -2.0); k.windows(0, .25, -1.28, 5, 3, .45, .5, .36, .32); k.box(2.3, .1, 1.5, 'roof', .9, 1.8, -2.0); k.box(.8, .25, .04, 'brand', .9, 1.45, -1.27);
    for (let i = 0; i < 6; i++) k.box(.03, 1.8, .06, 'line', -.15 + i * .42, 0, -1.27, true); k.box(.5, .5, .04, 'glass', .9, 0, -1.27, true); k.box(.8, .04, .4, 'wall', .9, .6, -1.1, true);
    // The streets: plane trees, zebra crossings, taxis, a Bicing station, the metro sign, a café terrace, people.
    [[-1.65, -.3], [-1.65, -1.4], [-.25, -.4], [-4.4, 1.2], [-.3, 1.2], [3.2, 1.2]].forEach(([x, z]) => k.leafy(x, z, .6));
    for (let i = 0; i < 6; i++) { k.box(.08, .012, .7, 'line', -1.3 + i * .14, .06, .55, true); k.box(.08, .012, .7, 'line', 2.2 + i * .14, .06, .55, true); }
    for (let i = 0; i < 10; i++) if (Math.abs(-5 + i * 1.1 + .95) > .6) k.box(.4, .01, .04, 'line', -5 + i * 1.1, .06, .55, true);
    k.car('ink', -3.2, .36, 0, .66); k.car('gold', 1.6, .74, Math.PI, .66); k.car('car1', -.95, -1.4, Math.PI / 2, .66); k.box(.2, .06, .1, 'gold', -3.2, .4, .36, true);
    for (let i = 0; i < 4; i++) k.bike(1.4 + i * .22, 1.2, Math.PI / 2, .7); k.box(1, .1, .1, 'metal', 1.7, 0, 1.08, true);
    k.cyl(.02, .9, 'metal', -1.6, 0, 1.15, 6, 1, true); const mt = k.box(.22, .22, .03, 'flag', -1.6, .85, 1.15); mt.rotation.z = Math.PI / 4;
    [[-3.4, 1.2], [-3.1, 1.25]].forEach(([x, z]) => { k.box(.36, .14, .1, 'flag', x, .1, z); k.cyl(.06, .02, 'ink', x - .14, .06, z, 8).rotation.x = Math.PI / 2; });
    [[2.4, -1.0], [3.2, -1.0]].forEach(([x, z]) => k.table(x, z, 3, ['accent', 'team1'])); k.umbrella(2.8, -1.0, 'wall');
    k.person('team2', -2.4, .95, .5, { pose: 'walk', ry: 1.5 }); k.person('leaf', .4, 1.0, .5, { pose: 'walk', ry: -1.5 });
    // The boardwalk with its railing and lamps; the golden fish and the Hotel Arts with its white steel frame.
    for (let i = 0; i < 24; i++) { const x = -5.6 + i * .48; if (x < -2.9 || x > -1.5) k.box(.02, .22, .02, 'metal', x, .05, 1.82, true); } k.box(2.6, .02, .02, 'metal', -4.2, .27, 1.82, true); k.box(7, .02, .02, 'metal', 2.0, .27, 1.82, true);
    [-4, -1, 2, 5].forEach(x => k.lamp(x, 1.6, 1.4));
    { const f = k.ball(.45, 'gold', 4.1, 1.0, 1.15); f.scale.set(1.5, .6, .5); for (let i = 0; i < 5; i++) k.box(.03, .76, .03, 'metal', 3.55 + i * .28, 0, 1.15, true);
      for (let i = -3; i <= 3; i++) { const x = i * .2, r = Math.sqrt(Math.max(.05, 1 - (x / .68) ** 2)), rib = k.ring(1, .05, 'metal', 4.1 + x, 1.0, 1.15, true); rib.rotation.y = Math.PI / 2; rib.scale.set(.235 * r, .28 * r, .2); }
      const tail = k.cone(.3, .4, 'gold', 4.1 - .85, .92, 1.15, 4); tail.rotation.z = -Math.PI / 2 - .5; tail.scale.z = .3; }
    k.box(.8, 3.8, .8, 'glass', 5.3, 0, .1); for (let j = 0; j < 7; j++) { const x1 = k.box(.03, .75, .03, 'line', 5.3, .2 + j * .52, .52, true); x1.rotation.z = .8; const x2 = k.box(.03, .75, .03, 'line', 5.3, .2 + j * .52, .52, true); x2.rotation.z = -.8; k.box(.76, .03, .03, 'line', 5.3, .5 + j * .52, .52, true); }
    // The beach: umbrellas, towels and sunbathers, a beach-volley net, a lifeguard tower, the chiringuito; boats on the sea.
    [[-.9, 2.4, 'accent'], [2.3, 2.3, 'gold'], [3.6, 2.6, 'team1'], [-4.4, 2.5, 'flag']].forEach(([x, z, c]) => { k.umbrella(x, z, c); k.box(.5, .01, .22, c, x + .3, -.03, z + .3, true); });
    { const p = k.person('team1', 2.6, 2.6, .5, { ry: 1.57 }); p.rotation.z = Math.PI / 2; p.position.y = .08; }
    [2.05, 2.95].forEach(z => k.cyl(.02, .9, 'metal', .7, -.05, z, 6, 1, true)); k.box(.01, .25, .9, 'net', .7, .6, 2.5, true);
    k.person('accent', .2, 2.4, .5, { pose: 'cheer', ry: 1.57, y: -.05, legs: 'line' }); k.person('team2', 1.3, 2.6, .5, { pose: 'ready', ry: -1.57, y: -.05, legs: 'line' });
    { const [lk] = k.group(4.7, -.05, 2.4); [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]].forEach(([x, z]) => lk.box(.03, .7, .03, 'wood', x, 0, z, true)); lk.box(.4, .3, .4, 'line', 0, .7, 0); lk.box(.44, .04, .44, 'flag', 0, 1.0, 0); for (let i = 0; i < 4; i++) lk.box(.3, .02, .05, 'wood', 0, .15 + i * .15, .28, true); }
    k.box(1, .7, .7, 'wood', -3.6, 0, 2.4); k.box(1.2, .06, .9, 'leaf', -3.6, .72, 2.4); k.box(1, .06, .25, 'line', -3.6, .45, 2.82, true);
    [[1.6, 4.4, .3], [4, 4.3, -.4]].forEach(([x, z, ry]) => { const [sk] = k.group(x, -.14, z, ry, .75); sk.box(.6, .12, .2, 'line', 0, 0, 0); sk.cyl(.015, .9, 'metal', 0, .12, 0, 4, 1, true); const sl = sk.cone(.3, .8, 'sail', .14, .16, 0, 3); sl.scale.z = .15; });
    // The table where I worked by day: laptop, chairs.
    k.box(1.1, .06, .6, 'wood', -2.2, .72, 1.95); k.box(.5, .32, .03, '*screen', -2.2, .8, 1.71); [[-2.65, 1.7], [-1.75, 1.7], [-2.65, 2.2], [-1.75, 2.2]].forEach(([x, z]) => k.cyl(.03, .72, 'metal', x, 0, z, 6, 1, true));
    moon = live(k.ball(.55, '*moon', 0, 6, -6)); });

  // --- Trusted: back at Silhouette, two years on. The same office as the spark, and my desk is now the hub in the middle of it.
  // Glowing lines carry the tools I build out to the other teams' desks, and their screens light up one by one. Amstetten and the Westbahn go past the windows ---
  prop(ON('_old'), k => {
    // The window wall at the back (a low sill, tall mullions, no glass, so we see out) and the side walls from the spark.
    k.box(8.8, .5, .14, 'wall', 0, 0, -3.6); k.box(8.8, .14, .3, 'wall', 0, 2.4, -3.6); for (let i = 0; i < 12; i++) k.box(.06, 1.9, .1, 'line', -4.35 + i * .79, .5, -3.6, true);
    [-4.4, 4.4].forEach(x => { k.box(.16, 2.4, 3.4, 'wall', x, 0, -1.9); k.windows(x * .97, .8, -3.2, 3, 1, 1, 0, .7, 1.1, 'glass', true); });
    // My desk, the hub: three monitors, the big screen behind it, a chair; a colleague walking up with a laptop.
    k.box(2, .05, .75, 'wood', HUB[0], .55, HUB[1] - .3); [[-.95, -.3], [.95, -.3], [-.95, .3], [.95, .3]].forEach(([x, z]) => k.box(.04, .55, .04, 'metal', HUB[0] + x, 0, HUB[1] - .3 + z, true)); k.box(.4, .45, .65, 'wall2', HUB[0] - .7, 0, HUB[1] - .3);
    [-.6, 0, .6].forEach((x, n) => { const m = k.box(.56, .34, .04, 'ink', x, .76, HUB[1] - .58); m.rotation.y = -x * .4; const sc = k.box(.5, .28, .01, '*screen', x, .79, HUB[1] - .555, true); sc.rotation.y = -x * .4; k.box(.05, .16, .05, 'ink', x, .6, HUB[1] - .6, true); });
    k.box(.42, .02, .14, 'ink', 0, .6, HUB[1] - .2, true); k.box(.05, .02, .08, 'ink', .32, .6, HUB[1] - .2, true); k.cyl(.04, .1, 'flag', .8, .6, HUB[1] - .15, 10);
    k.box(1.8, 1, .05, '*screen', 0, 1.1, HUB[1] - 1.5); k.box(1.9, 1.1, .04, 'ink', 0, 1.05, HUB[1] - 1.53); k.box(.08, 1.1, .08, 'metal', 0, 0, HUB[1] - 1.56); k.box(.8, .04, .4, 'metal', 0, 0, HUB[1] - 1.56, true);
    k.person('team2', 1.15, -.1, .55, { pose: 'walk', ry: -2.2 }); k.box(.3, .02, .22, 'ink', 1.0, .5, -.2, true);
    // The four teams round the floor. Each desk's screen glows in its team's key once my tools arrive.
    TEAMS.forEach(([, cx, cz], n) => { const front = cz > 0, scr = '*t' + n;
      [-.55, .55].forEach(dx => { k.desk(cx + dx, cz, 0, scr); k.person(['team1', 'accent', 'leaf', 'roof', 'wall2', 'team2'][(n * 2 + (dx > 0)) % 6], cx + dx, cz + .45, .5, { pose: 'sit', ry: Math.PI, y: .04 }); });
      if (front) [-.55, .55].forEach(dx => { k.desk(cx + dx, cz + 1.0, Math.PI, scr); if (dx < 0 || n === 3) k.person(['team2', 'brand', 'gold'][n % 3], cx + dx, cz + .55, .5, { pose: 'sit', ry: 0, y: .04 }); });
      k.plant(front ? cx + (cx > 0 ? 1.35 : -1.35) : (cx > 0 ? 3.95 : -3.95), cz + (front ? .5 : .8), .9); });   // inside the side walls (x ±4.32) at the back
    // The Scrum board for the two strategic projects, with a colleague moving a card.
    k.box(1.5, .95, .05, 'line', -1.9, .7, -3.3); [-.1, .2].forEach(dy => k.box(1.4, .015, .02, 'ink', -1.9, 1.15 + dy, -3.27, true)); for (let i = 1; i < 4; i++) k.box(.015, .85, .02, 'ink', -2.65 + i * .37, .75, -3.27, true);
    for (let i = 0; i < 14; i++) k.box(.13, .11, .01, ['gold', 'flag', 'leaf', 'screen'][i % 4], -2.52 + (i % 4) * .37 + (i % 2) * .1, 1.42 - Math.floor(i / 4) * .17 - (i > 7 ? .1 : 0), -3.26, true);
    [-2.55, -1.25].forEach(x => k.box(.04, .7, .04, 'metal', x, 0, -3.32, true)); k.person('accent', -1.0, -2.9, .55, { ry: -2.6 });
    // Coffee point, a printer, plants in the corners.
    k.box(1.2, .9, .45, 'wall2', 3.4, 0, -3.25); k.box(1.3, .05, .5, 'line', 3.4, .9, -3.25); k.box(.3, .36, .3, 'ink', 3.1, .95, -3.25); k.cyl(.04, .1, 'line', 3.5, .95, -3.2, 8, 1, true); k.box(.5, .5, .45, 'metal', 1.6, 0, -3.2);
    [[-4.0, -3.2], [4.0, 3.6], [-4.0, 3.6]].forEach(([x, z]) => k.plant(x, z, 1.1));
    // Outside the windows: the railway, catenary masts, Amstetten's houses and the parish church.
    [-4.15, -4.45].forEach(z => k.box(10.4, .05, .04, 'metal', 0, .03, z, true)); for (let i = 0; i < 21; i++) k.box(.08, .03, .7, 'wood', -5 + i * .5, 0, -4.3, true);
    [-3.6, -1.2, 1.2, 3.6].forEach(x => { k.box(.06, 1.25, .06, 'metal', x, 0, -4.85, true); k.box(.03, .03, .6, 'metal', x, 1.15, -4.55, true); }); k.box(9, .01, .01, 'ink', 0, 1.05, -4.3, true);
    [[-3.2, -5.5, 'wall3'], [1.0, -5.6, 'wall'], [2.9, -5.3, 'wall4'], [-2.0, -5.9, 'wall']].forEach(([x, z, c], n) => k.house(x, z, 0, { w: 1.1, h: 1.2 + (n % 2) * .3, d: .8, wall: c, rh: .5, floors: 2, chimney: n % 2 === 0 }));
    k.box(.6, 2.2, .6, 'wall', 1.95, 0, -5.5); k.cyl(.42, .6, 'roof', 1.95, 2.2, -5.5, 4).rotation.y = Math.PI / 4; k.cone(.16, .8, 'roof', 1.95, 2.8, -5.5, 8); k.cyl(.17, .03, 'line', 1.95, 1.8, -5.18, 20).rotation.x = Math.PI / 2;
    [[-4.4, -4.9], [4.2, -4.8]].forEach(([x, z]) => k.leafy(x, z, .7));
    const [t, tg] = k.group(0, 0, -4.3); for (let n = 0; n < 3; n++) { const [c, cg] = t.group(-n * 2, 0, 0); c.box(1.9, .55, .5, 'train', 0, .08, 0); c.box(1.9, .1, .51, 'ink', 0, .45, 0, true); c.windows(-.8, .44, .26, 7, 1, .26, 0, .2, .14, 'glass'); c.box(.3, .4, .02, 'line', .55, .1, .26, true);
      if (!n) { c.box(.3, .4, .48, 'train', 1.05, .08, 0).rotation.z = .5; c.box(.02, .4, .02, 'metal', 0, .63, 0, true); } }
    train = live(tg);
    // The lines from my desk to each team: a glowing strip on the floor that grows out, then packets running along it.
    TEAMS.forEach(([, cx, cz]) => { const dx = cx - HUB[0], dz = (cz + (cz > 0 ? -.2 : .4)) - HUB[1], L = Math.hypot(dx, dz) - .6;
      const [lk, lg] = k.group(HUB[0], .02, HUB[1], Math.atan2(-dz, dx)), [sk, sg] = lk.group(.3, 0, 0); sk.box(L, .03, .13, '*tool', L / 2, 0, 0, true);
      const packets = [0, 1, 2].map(() => lk.box(.14, .14, .14, '*tool', 0, .03, 0, true)); links.push({ g: live(sg), packets, L, lg: live(lg) }); });
  });
  // --- Next: a glass tower going up on the hill. Tower crane, excavator, mixer truck, site offices, materials, workers in hi-vis. The sunrise behind ---
  const ROADZ = 3.1;
  prop(ON('_old'), k => {
    k.box(3, .12, 3, 'stone', 0, 1.1, -1.6);
    for (let n = 0; n < 6; n++) { const [f, fg] = k.group(0, 1.22 + n * .8, -1.6); f.box(2.3, .06, 2.3, 'stone', 0, 0, 0);
      if (n < 5) { f.box(.7, .74, .7, 'stone', 0, .06, 0); f.box(2.2, .72, 2.2, 'glass', 0, .06, 0);
        for (let i = 0; i < 6; i++) { f.box(.03, .72, .03, 'metal', -1.1 + i * .44, .06, 1.11, true); f.box(.03, .72, .03, 'metal', 1.11, .06, -1.1 + i * .44, true); } f.windows(-.88, .2, 1.13, 5, 1, .44, 0, .3, .36, '*win');
        // Scaffolding on the right face: standards, ledgers, boards, braces.
        for (let i = 0; i < 4; i++) f.box(.02, .8, .02, 'metal', 1.45, 0, -1.05 + i * .7, true); [.05, .45].forEach(yy => f.box(.02, .02, 2.2, 'metal', 1.45, yy, 0, true)); f.box(.26, .02, 2.2, 'wood', 1.32, .02, 0, true);
        const br = f.box(.02, .02, 1, 'metal', 1.45, .3, -.7, true); br.rotation.x = .7; }
      else { [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1], [0, -1.1], [0, 1.1], [-1.1, 0], [1.1, 0]].forEach(([x, z]) => { f.box(.08, .5, .08, 'stone', x, 0, z); for (let r = 0; r < 4; r++) f.box(.015, .3, .015, 'metal', x - .03 + (r % 2) * .06, .5, z - .03 + (r > 1) * .06, true); });
        f.box(.7, .6, .7, 'stone', 0, .06, 0); for (let i = 0; i < 9; i++) f.box(2.2, .01, .01, 'metal', 0, .08, -1.1 + i * .275, true); }
      floors.push(live(fg)); }
    // A lattice tower crane: mast of four legs with cross bracing, the turning jib with counterweight, trolley and hook.
    const cx = -3, cz = -1.6, cy = ny(cx, cz);
    k.box(.6, .2, .6, 'stone', cx, cy - .05, cz);
    [[-.12, -.12], [.12, -.12], [-.12, .12], [.12, .12]].forEach(([x, z]) => k.box(.04, 4.2, .04, 'crane', cx + x, cy, cz + z, true));
    for (let j = 0; j < 13; j++) [[0, .12, 0], [0, -.12, 0], [.12, 0, 1], [-.12, 0, 1]].forEach(([x, z, side]) => { const b = k.box(side ? .03 : .32, .03, side ? .32 : .03, 'crane', cx + x, cy + .15 + j * .3, cz + z, true); if (side) b.rotation.x = j % 2 ? .7 : -.7; else b.rotation.z = j % 2 ? .7 : -.7; });
    // The jib reaches 1.7 from the mast (x -1.3 at most, while it swings), so it and its load never enter the tower (x from -1.15).
    const [jb, jg] = k.group(cx, cy + 4.2, cz); jb.box(2.6, .06, .2, 'crane', .4, 0, 0); jb.box(2.6, .04, .04, 'crane', .4, .24, 0, true);
    for (let i = 0; i < 8; i++) { const b = jb.box(.02, .28, .02, 'crane', -.75 + i * .33, 0, 0, true); b.rotation.z = i % 2 ? .45 : -.45; }
    jb.box(.04, .28, .04, 'crane', 0, 0, 0, true); jb.box(.5, .4, .4, 'wall', 0, -.4, .3); jb.box(.6, .45, .45, 'stone', -.75, -.45, 0); jb.box(.16, .08, .2, 'ink', 1.45, -.08, 0);
    jb.box(.01, 1.2, .01, 'ink', 1.45, -1.2, 0, true); jb.box(.06, .1, .06, 'gold', 1.45, -1.3, 0); jb.box(.5, .05, .36, 'wood', 1.45, -1.55, 0); jb.box(.42, .2, .28, 'stone', 1.45, -1.5, 0); jib = live(jg);
    // Site fence with a gate and the project board; site offices stacked with a stair; toilets; materials; a floodlight mast.
    for (let i = 0; i < 12; i++) { const x = -2.6 + i * .5; if (x > .1 && x < 1.5) continue; k.box(.5, .5, .03, 'line', x, ny(x, 1.2) - .05, 1.2, true); k.box(.06, .06, .14, 'stone', x - .25, ny(x, 1.2) - .05, 1.2, true); }
    k.box(1, .6, .04, 'brand', -1.9, ny(-1.9, 1.24) + .4, 1.24); [-2.3, -1.5].forEach(x => k.box(.04, 1, .04, 'metal', x, ny(x, 1.24) - .05, 1.24, true));
    [[2.8, -3.5, 'brand'], [2.8, -2.9, 'gold'], [2.8, -3.2, 'wall', .5]].forEach(([x, z, c, up = 0]) => { const y = ny(x, z) - .05 + up; k.box(1.2, .5, .5, c, x, y, z); k.windows(x - .3, y + .15, z + .26, 2, 1, .6, 0, .3, .2, 'glass'); });
    for (let i = 0; i < 5; i++) k.box(.3, .03, .2, 'metal', 2.0 + i * .03, ny(2.0, -2.6) + i * .1, -2.6 + i * .0, true);
    [[3.9, -2.2], [4.2, -2.2]].forEach(([x, z]) => { k.box(.26, .6, .26, 'leaf', x, ny(x, z) - .05, z); k.box(.28, .03, .28, 'line', x, ny(x, z) + .55, z, true); });
    [[-1.8, -.4], [-1.4, -.4]].forEach(([x, z]) => { const y = ny(x, z) - .05; k.box(.36, .08, .36, 'wood', x, y, z); for (let r = 0; r < 3; r++) k.box(.32, .08, .32, 'tile', x, y + .08 + r * .09, z); });
    for (let i = 0; i < 6; i++) { const r = k.cyl(.012, 1.2, 'ink', -1.6, ny(-1.6, -3.6) + .02 + (i % 3) * .025, -3.6 + Math.floor(i / 3) * .03 + (i % 3) * .025, 4, 1, true); r.rotation.z = Math.PI / 2; }
    for (let i = 0; i < 5; i++) { const p = k.cyl(.08, 1, 'metal', 1.9, ny(1.9, -3.7) + .08 + (i > 2 ? .14 : 0), -3.9 + (i % 3) * .17 + (i > 2 ? .08 : 0), 10); p.rotation.z = Math.PI / 2; }
    k.box(.05, 2.2, .05, 'metal', 3.9, ny(3.9, -.6) - .05, -.6, true); k.box(.4, .2, .1, '*lamp', 3.9, ny(3.9, -.6) + 2.1, -.6);
    // Machines: an excavator digging, a concrete mixer truck, a wheelbarrow.
    { const y = ny(2.6, -.5) - .05, [ek] = k.group(2.6, y, -.5, -.6); [-.22, .22].forEach(z => { ek.box(.9, .16, .16, 'ink', 0, 0, z); });
      ek.box(.7, .3, .55, 'vest', 0, .2, 0); ek.box(.3, .32, .3, 'glass', .14, .5, .1); ek.box(.32, .04, .32, 'vest', .14, .82, .1, true); ek.box(.3, .26, .52, 'vest', -.36, .2, 0);
      const [bk, bg] = ek.group(.35, .45, -.1); bg.rotation.z = .55; bk.box(.85, .1, .1, 'vest', .42, -.05, 0);
      const [sk2, sg] = bk.group(.85, 0, 0); sg.rotation.z = -1.9; sk2.box(.7, .08, .08, 'vest', .35, -.04, 0); sk2.box(.18, .16, .22, 'ink', .72, -.08, 0); }
    { const y = ny(-1.8, .4) - .05, [mk] = k.group(-1.8, y, .4, .25); mk.box(1.4, .12, .4, 'ink', 0, .12, 0); mk.box(.36, .4, .42, 'wall', .58, .2, 0); mk.box(.04, .2, .36, 'glass', .77, .4, 0, true);
      const dr = mk.cyl(.24, .8, 'wall2', -.2, .3, 0, 14, .7); dr.rotation.z = 1.35; dr.position.y = .5; for (let i = 0; i < 3; i++) { const sp = mk.ring(.2 - i * .02, .015, 'metal', -.45 + i * .25, .5, 0, true); sp.rotation.y = Math.PI / 2; }
      [[-.45, .2], [.1, .2], [.55, .2], [-.45, -.2], [.1, -.2], [.55, -.2]].forEach(([x, z]) => { const w = mk.cyl(.11, .06, 'ink', x, .11, z, 10); w.rotation.x = Math.PI / 2; w.position.y = .11; }); }
    { const y = ny(1.8, .4) - .05; k.box(.3, .12, .2, 'metal', 1.8, y + .12, .4); k.ring(.06, .02, 'ink', 1.98, y + .06, .4, true); k.box(.3, .02, .02, 'metal', 1.65, y + .12, .46, true); }
    k.box(.18, .26, .18, 'vest', 2.4, ny(2.4, .9) - .05, .9); k.box(.18, .26, .18, 'vest', 2.8, ny(2.8, .95) - .05, .95); k.box(.18, .26, .18, 'vest', 3.2, ny(3.2, 1.0) - .05, 1.0);
    // Workers in hi-vis and helmets.
    [[1.6, .2, 0], [-1.3, .8, 1.2], [2.2, -1.2, -1], [-2.4, -.9, .5], [1.4, -2.9, 2.5], [-.9, .4, -.4]].forEach(([x, z, ry]) => k.person('vest', x, z, .55, { y: ny(x, z) - .05, hat: 'gold', ry }));
    for (let n = 0; n < 7; n++) k.box(.4, .06, .4, '*gold', .9 - n * .1, ny(.9 - n * .1, 1.4 - n * .5) - .05 + .02, 1.4 - n * .5);
    k.leafy(-4.6, 1.4, .9); k.spruce(4.8, .4, .9); k.leafy(3.8, -4.4, .9); k.spruce(-4.4, -3.6, 1); k.spruce(-5.2, -.9, .8); k.leafy(4.9, 2.2, .7); k.bush(-3.4, 2.4); k.bush(3.2, 2.6, 1.2);
    // The road past the site: parked cars of the crew, cones round a manhole, a delivery van arriving, a cyclist, streetlights.
    for (let i = 0; i < 9; i++) k.box(.32, .01, .04, 'line', -4.8 + i * 1.2, ny(-4.8 + i * 1.2, ROADZ) + .01, ROADZ, true);
    k.car('car1', -3.4, ROADZ + .2, 0, .66); k.car('car2', -2.5, ROADZ + .2, 0, .66); k.van('wall', 3.0, ROADZ - .18, Math.PI, .85); k.bike(-.4, ROADZ - .15, Math.PI, 1.1); k.person('leaf', -.33, ROADZ - .15, .45, { pose: 'sit', ry: -Math.PI / 2, y: .26 });
    for (let i = 0; i < 4; i++) { k.cone(.06, .18, 'vest', 1.2 + i * .25, 0, ROADZ + .25 - (i % 2) * .1, 10); } k.cyl(.12, .015, 'metal', 1.6, 0, ROADZ + .15, 14, 1, true);
    [-4.6, -1.6, 1.4, 4.4].forEach(x => k.lamp(x, ROADZ - .6, 1.6)); k.sign(2.4, 2.4, 0, 'gold', 1.0, .5); k.person('accent', 4.2, 2.3, .5, { pose: 'walk', ry: -1.4 }); k.dog(4.6, 2.4, -1.4);
    sunrise = live(k.ball(1.4, '*sun', 4.5, 3.4, -9)); });


  // =====================================================================================================================
  // Moments 4–8: built for what happens, one after another. Each is a small composition on the soft ground.
  // =====================================================================================================================
  // --- Spark, moment 4a: the Silhouette entrance. A partition with three doors (Marketing, E-commerce, Data), the eyewear vitrine, a reception desk ---
  const doors = [];
  prop(ON('doors'), k => {
    k.box(8.0, 2.4, .12, 'wall2', 0, 0, -1.3); k.box(8.2, .14, .4, 'wall', 0, 2.4, -1.3);
    [-2.4, 0, 2.4].forEach((x, i) => { const key = i === 2 ? '*gold' : 'ink'; k.box(1.2, 2.2, .16, 'carpet', x, 0, -1.3);
      k.box(.1, 2.24, .2, key, x - .62, 0, -1.3); k.box(.1, 2.24, .2, key, x + .62, 0, -1.3); k.box(1.34, .1, .22, key, x, 2.2, -1.3); k.box(.5, .12, .02, 'line', x, 1.92, -1.2, true);
      const [d, dg] = k.group(x - .56, 0, -1.2); d.box(1.1, 2.18, .05, 'wall', .55, 0, 0); d.ball(.04, 'metal', 1, 1, .05); d.box(.3, .8, .02, 'glass', .55, 1.1, .03, true); doors.push(live(dg)); });
    k.box(2.2, .3, .03, 'brand', 0, 2.5, -1.18, true); k.label('DIGITAL BUSINESS', 2.0, .24, 0, 2.65, -1.15);
    k.box(.3, 2, 2.2, 'wall2', -3.9, 0, .6);
    for (let j = 0; j < 4; j++) { k.box(.28, .03, 2.1, '*lamp', -3.76, .42 + j * .42, .6, true);
      for (let i = 0; i < 6; i++) [-.05, .05].forEach(d => { const f = k.ring(.035, .008, 'ink', -3.72, .48 + j * .42, -.25 + i * .34 + d, true); f.rotation.y = Math.PI / 2; }); }
    k.box(1.8, .62, .5, 'wall', 1.6, 0, 2.4); k.box(1.9, .05, .6, 'wood', 1.6, .62, 2.4); k.box(.6, .1, .02, 'brand', 1.6, .4, 2.66, true); k.person('wall2', 1.6, 1.95, .55);
    k.person('accent', -2.4, .3, .5, { ry: .5 }); k.person('leaf', 2.6, .1, .5, { ry: -.6 }); k.plant(-3.2, 2.3); k.plant(3.5, .5, 1.1); k.plant(-1.2, 2.6, .9);
  });
  // --- Spark, moment 4b: a table at large scale and a messy pile of numbers that sorts itself into one block, with one cube on top that glows: the recommendation ---
  const pile = [];
  prop(ON('pile'), k => {
    k.box(3.2, .09, 1.7, 'wood', 0, .71, .6); [[-1.45, -.15], [1.45, -.15], [-1.45, 1.35], [1.45, 1.35]].forEach(([x, z]) => k.box(.08, .72, .08, 'metal', x, 0, z, true));
    k.box(3.5, .01, 2.0, 'wall2', 0, 0, .6, true);
    for (let n = 0; n < 17; n++) { const top = n === 16, m = k.box(.3, .3, .3, top ? '*rec' : 'wall2', 0, 0, 0);
      m.userData = { a: V(-.95 + Math.cos(n * 2.4) * .55, .96 + (n % 3) * .27, .55 + Math.sin(n * 2.4) * .42), r: n,
        b: top ? V(.78, 1.71, .76) : V(.3 + (n % 4) * .32, .96 + Math.floor(n / 8) * .32, .6 + (Math.floor(n / 4) % 2) * .32) }; pile.push(m); } }, false);
  // --- Engine, moments 5a and 5b: my desk corner. A back wall with the sales-report calendar, a whiteboard and the wall screen; the desk; a printer and a growing stack ---
  let printer, rack, packets = [], paper; const balls = [];
  prop(ON('byhand', 'auto'), k => {
    k.box(6.4, 2.5, .16, 'wall', 0, 0, -2.2); k.box(6.6, .1, .3, 'wall2', 0, 2.5, -2.2);
    k.box(1.7, 1, .04, 'line', -2.4, .95, -2.1); for (let i = 0; i < 4; i++) k.box(1.1 - i * .2, .02, .02, 'ink', -2.6, 1.75 - i * .2, -2.07, true);
    for (let i = 0; i < 8; i++) k.box(.14, .14, .01, ['gold', 'flag', 'leaf', 'screen'][i % 4], -2.0 + (i % 4) * .18, 1.0 + Math.floor(i / 4) * .2, -2.07, true);
    { const [ck] = k.group(-.9, 0, -2.1); ck.box(1.0, .8, .02, 'line', 0, 1.0, 0); ck.label('SALES REPORTS · 2023', .9, .1, 0, 1.72, .015);
      for (let i = 0; i < 26; i++) ck.box(.055, .055, .01, i < 20 ? 'flag' : 'wall2', -.39 + (i % 13) * .065, 1.3 - Math.floor(i / 13) * .1, .016, true); }
    k.box(2.2, 1.2, .05, '*wall', 1.9, 1.2, -2.08); k.box(2.3, 1.3, .04, 'ink', 1.9, 1.15, -2.11);   // the wall screen that ends up running the numbers
    k.person('roof', 2.6, -1.3, .55, { ry: .3 }); k.plant(3.0, -1.7, 1.1);
    // My desk: two monitors, keyboard, mouse, a notebook, a mug, a lamp, my glasses case, a photo; crumpled drafts in and around the bin.
    k.box(1.8, .05, .8, 'wood', -.9, .55, .9); [[-1.7, .55], [-.1, .55], [-1.7, 1.25], [-.1, 1.25]].forEach(([x, z]) => k.box(.04, .55, .04, 'metal', x, 0, z, true)); k.box(.4, .45, .7, 'wall2', -1.5, 0, .9);
    [-1.3, -.5].forEach(x => { k.box(.62, .36, .04, 'ink', x, .76, .6); k.box(.56, .3, .01, '*screen', x, .79, .63, true); k.box(.05, .16, .05, 'ink', x, .6, .58, true); k.box(.2, .02, .14, 'ink', x, .6, .56, true); });
    k.box(.4, .02, .14, 'ink', -.9, .6, 1.05, true); k.box(.05, .02, .08, 'ink', -.6, .6, 1.05, true); k.cyl(.04, .1, 'flag', -.2, .6, 1.1, 10); k.box(.2, .02, .28, 'line', -1.55, .6, 1.05, true);
    k.cyl(.05, .02, 'metal', -1.65, .6, .7, 10, 1, true); k.box(.015, .3, .015, 'metal', -1.65, .62, .7, true); k.box(.12, .05, .08, '*lamp', -1.58, .9, .74, true); k.box(.12, .03, .05, 'ink', -1.2, .6, 1.15, true); k.box(.1, .12, .02, 'line', -1.75, .6, .9, true);
    k.cyl(.12, .3, 'metal', .25, 0, 1.6, 12); [[.1, 1.85], [.45, 1.5], [.35, 1.95], [-.3, 2.1]].forEach(([x, z]) => balls.push(k.ball(.05, 'line', x, .05, z)));
    k.box(2.6, .01, 1.8, 'wall2', -.9, 0, 1.2, true);
    { const [pk, pg] = k.group(.3, .6, .9); for (let i = 0; i < 16; i++) pk.box(.42, .022, .3, 'line', Math.sin(i * 2.1) * .02, i * .026, Math.cos(i * 1.7) * .015, true).rotation.y = Math.sin(i * 1.3) * .06; paper = live(pg); }   // the weekly reports, by hand
    k.label('INTERN', .42, .1, -.2, .66, 1.18);   // the name plate: it changes when the automation lands
  });
  prop(ON('byhand', 'auto'), k => { const [c, cg] = k.group(1.6, 0, 1.4); c.box(.8, .45, .6, 'metal', 0, 0, 0); c.box(.76, .05, .56, 'ink', 0, .45, 0); c.box(.2, .05, .08, '*lamp', .26, .38, .31, true);
    c.box(.5, .02, .3, 'line', 0, .24, .42, true); cg.userData.sheet = c.box(.4, .012, .28, 'line', 0, .27, .3, true); printer = cg; }, false);
  prop(ON('auto'), k => { const [b, bg] = k.group(2.9, 0, -1.7); b.box(.9, 2.1, .8, 'ink', 0, 0, 0);
    for (let j = 0; j < 8; j++) { b.box(.8, .02, .02, 'metal', 0, .2 + j * .24, .41, true); [0, 1, 2].forEach(i => b.box(.04, .04, .02, '*led', -.25 + i * .25, .26 + j * .24, .42, true)); }
    b.box(3.4, .04, .12, 'metal', -2.1, 1.75, 0); for (let n = 0; n < 5; n++) packets.push(b.box(.08, .08, .08, '*led', -.2, 1.8, 0, true)); rack = bg;
    k.label('DATA ANALYST', .5, .1, -.2, .66, 1.18); }, false);
  // --- Double shift, moments 6a and 6b: Barcelona as a skyline (Eixample blocks, the Sagrada Família, Torre Glòries); by day one desk in front, by night the lit school ---
  let moon;
  prop(ON('day', 'night'), k => {
    const [S] = k.group(0, 0, 0, 0, .7);   // composed to fit half a screen
    // Three Eixample blocks: chamfered octagons round a green courtyard, balconies on every floor, shops with awnings, roof terraces.
    [[-3.8, -2.4], [-2.5, -4.6], [.6, -4.7]].forEach(([x, z], bn) => { const [b] = S.group(x, 0, z, Math.PI / 8); b.cyl(1.1, 1.6, bn === 1 ? 'wall' : 'wall3', 0, 0, 0, 8); b.cyl(.62, 1.62, 'leaf', 0, 0, 0, 8); b.cyl(1.12, .06, 'terra', 0, 1.6, 0, 8);
      for (let f = 0; f < 8; f++) { const a = f * Math.PI / 4 + Math.PI / 8, [w] = b.group(Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02, -a + Math.PI / 2);
        w.box(.62, .34, .03, 'glass', 0, .02, .02, true); const aw = w.box(.66, .02, .14, f % 2 ? 'flag' : 'gold', 0, .4, .08, true); aw.rotation.x = .3;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { w.box(.14, .2, .04, '*nwin', -.15 + i * .3, .55 + j * .33, .02, true); w.box(.2, .02, .09, 'ink', -.15 + i * .3, .53 + j * .33, .06, true); w.box(.2, .07, .01, 'metal', -.15 + i * .3, .55 + j * .33, .1, true); }
        w.box(.5, .1, .03, 'wall2', 0, 1.6, .04, true); } });
    // The Sagrada Família, still under construction: the bell towers with their tops, the tall centre tower, the façade, cranes.
    const sx = 3.2, sz = -3.9; S.box(1.5, 1.3, .9, 'stone', sx, 0, sz); S.prism(1.55, .45, .95, 'stone', sx, 1.3, sz);
    for (let i = 0; i < 3; i++) S.box(.24, .62, .03, 'ink', sx - .45 + i * .45, 0, sz + .46, true);
    [-1, 1].forEach(side => [[-.6, 2.3], [-.2, 2.75], [.2, 2.75], [.6, 2.3]].forEach(([x, h]) => { const z = sz + side * .62, hh = side > 0 ? h : h - .2;
      S.cyl(.1, hh, 'stone', sx + x, 0, z, 12, 1.5); S.cone(.07, .45, 'gold', sx + x, hh, z, 8); S.ball(.05, 'flag', sx + x, hh + .5, z);
      for (let j = 0; j < 4; j++) S.box(.03, .12, .02, 'ink', sx + x, .7 + j * .4, z + side * .12, true); }));
    S.cyl(.2, 3.6, 'stone', sx, 0, sz, 14, 1.4); S.cone(.15, .55, 'line', sx, 3.6, sz, 12); S.box(.05, .26, .05, 'line', sx, 4.15, sz, true); S.box(.18, .05, .05, 'line', sx, 4.29, sz, true);
    S.box(.08, 3.0, .08, 'crane', 4.55, 0, -3.7); S.box(.06, .06, 1.3, 'crane', 4.55, 3.0, -4.25); S.box(.06, .06, .35, 'crane', 4.55, 3.0, -3.45); S.box(.01, .6, .01, 'ink', 4.55, 2.4, -4.75, true);
    // Torre Glòries: the bullet-shaped tower, its skin of little windows.
    S.cyl(.45, 2.8, 'wall2', 4.9, 0, -1.5, 20, 1.1); const dome = S.ball(.45, 'wall2', 4.9, 2.8, -1.5); dome.scale.y = 1.5;
    for (let j = 0; j < 12; j++) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + j * .2; S.box(.06, .08, .02, '*nwin', 4.9 + Math.sin(a) * .47, .2 + j * .22, -1.5 + Math.cos(a) * .47, true).rotation.y = a; }
    moon = live(k.ball(.55, '*moon', 0, 6, -6)); });
  prop(ON('day'), k => {
    const [D] = k.group(2.1, 0, -1.7);   // the day desk sits just in front of the skyline
    // The table where I worked by day: laptop, chairs.
    D.box(1.1, .06, .6, 'wood', -2.2, .72, 1.95); D.box(.5, .32, .03, '*screen', -2.2, .8, 1.71); [[-2.65, 1.7], [-1.75, 1.7], [-2.65, 2.2], [-1.75, 2.2]].forEach(([x, z]) => D.cyl(.03, .72, 'metal', x, 0, z, 6, 1, true));
  });
  // 6b: the EAE building where I spent my evenings, windows lit
  prop(ON('night'), k => {
    const [S] = k.group(0, 0, 0, 0, 0.7);   // composed to fit half a screen
    // EAE: a modern building, the classroom where I spent my evenings, students inside.
    S.box(2.2, 1.8, 1.4, 'wall', .9, 0, -2.0); S.windows(0, .25, -1.28, 5, 3, .45, .5, .36, .32); S.box(2.3, .1, 1.5, 'roof', .9, 1.8, -2.0); S.box(.8, .25, .04, 'brand', .9, 1.45, -1.27);
    for (let i = 0; i < 6; i++) S.box(.03, 1.8, .06, 'line', -.15 + i * .42, 0, -1.27, true); S.box(.5, .5, .04, 'glass', .9, 0, -1.27, true); S.box(.8, .04, .4, 'wall', .9, .6, -1.1, true);
  });
  // --- Trusted, moment 7: the hub. An open floor: my desk in the middle, four team desks, a Scrum board, and lines of light from my desk to each team ---
  let train; const links = [], TEAMS = [['Operations', -3, -2.3], ['E-commerce', 3, -2.3], ['Customer service', -3, 2.1], ['Sales', 3, 2.1]], HUB = [0, -.7];
  prop(ON('hub'), k => {
    const [S] = k.group(0, 0, 0, 0, 0.75);   // composed to fit half a screen
    // My desk, the hub: three monitors, the big screen behind it, a chair; a colleague walking up with a laptop.
    S.box(2, .05, .75, 'wood', HUB[0], .55, HUB[1] - .3); [[-.95, -.3], [.95, -.3], [-.95, .3], [.95, .3]].forEach(([x, z]) => S.box(.04, .55, .04, 'metal', HUB[0] + x, 0, HUB[1] - .3 + z, true)); S.box(.4, .45, .65, 'wall2', HUB[0] - .7, 0, HUB[1] - .3);
    [-.6, 0, .6].forEach((x, n) => { const m = S.box(.56, .34, .04, 'ink', x, .76, HUB[1] - .58); m.rotation.y = -x * .4; const sc = S.box(.5, .28, .01, '*screen', x, .79, HUB[1] - .555, true); sc.rotation.y = -x * .4; S.box(.05, .16, .05, 'ink', x, .6, HUB[1] - .6, true); });
    S.box(.42, .02, .14, 'ink', 0, .6, HUB[1] - .2, true); S.box(.05, .02, .08, 'ink', .32, .6, HUB[1] - .2, true); S.cyl(.04, .1, 'flag', .8, .6, HUB[1] - .15, 10);
    S.box(1.8, 1, .05, '*screen', 0, 1.1, HUB[1] - 1.5); S.box(1.9, 1.1, .04, 'ink', 0, 1.05, HUB[1] - 1.53); S.box(.08, 1.1, .08, 'metal', 0, 0, HUB[1] - 1.56); S.box(.8, .04, .4, 'metal', 0, 0, HUB[1] - 1.56, true);
    S.person('team2', 1.15, -.1, .55, { pose: 'walk', ry: -2.2 }); S.box(.3, .02, .22, 'ink', 1.0, .5, -.2, true);
    // The four teams round the floor. Each desk's screen glows in its team's key once my tools arrive.
    TEAMS.forEach(([, cx, cz], n) => { const front = cz > 0, scr = '*t' + n;
      [-.55, .55].forEach(dx => { S.desk(cx + dx, cz, 0, scr); S.person(['team1', 'accent', 'leaf', 'roof', 'wall2', 'team2'][(n * 2 + (dx > 0)) % 6], cx + dx, cz + .45, .5, { pose: 'sit', ry: Math.PI, y: .04 }); });
      if (front) [-.55, .55].forEach(dx => { S.desk(cx + dx, cz + 1.0, Math.PI, scr); if (dx < 0 || n === 3) S.person(['team2', 'brand', 'gold'][n % 3], cx + dx, cz + .55, .5, { pose: 'sit', ry: 0, y: .04 }); });
      S.plant(front ? cx + (cx > 0 ? 1.35 : -1.35) : (cx > 0 ? 3.95 : -3.95), cz + (front ? .5 : .8), .9); });   // inside the side walls (x ±4.32) at the back
    // The Scrum board for the two strategic projects, with a colleague moving a card.
    S.box(1.5, .95, .05, 'line', -1.9, .7, -3.3); [-.1, .2].forEach(dy => S.box(1.4, .015, .02, 'ink', -1.9, 1.15 + dy, -3.27, true)); for (let i = 1; i < 4; i++) S.box(.015, .85, .02, 'ink', -2.65 + i * .37, .75, -3.27, true);
    for (let i = 0; i < 14; i++) S.box(.13, .11, .01, ['gold', 'flag', 'leaf', 'screen'][i % 4], -2.52 + (i % 4) * .37 + (i % 2) * .1, 1.42 - Math.floor(i / 4) * .17 - (i > 7 ? .1 : 0), -3.26, true);
    [-2.55, -1.25].forEach(x => S.box(.04, .7, .04, 'metal', x, 0, -3.32, true)); S.person('accent', -1.0, -2.9, .55, { ry: -2.6 });
    // The lines from my desk to each team: a glowing strip on the floor that grows out, then packets running along it.
    TEAMS.forEach(([, cx, cz]) => { const dx = cx - HUB[0], dz = (cz + (cz > 0 ? -.2 : .4)) - HUB[1], L = Math.hypot(dx, dz) - .6;
      const [lk, lg] = S.group(HUB[0], .02, HUB[1], Math.atan2(-dz, dx)), [sk, sg] = lk.group(.3, 0, 0); sk.box(L, .03, .13, '*tool', L / 2, 0, 0, true);
      const packets = [0, 1, 2].map(() => lk.box(.14, .14, .14, '*tool', 0, .03, 0, true)); links.push({ g: live(sg), packets, L, lg: live(lg) }); });
  });
  // --- Next, moments 8a and 8b: a lone desk with a lamp on a low hill at night (8a); behind it a tower goes up, floor by floor, each lighting as it lands, and the dawn comes up (8b) ---
  const floors = []; let sunrise, jib;
  prop(ON('evenings', 'tower'), k => { const [dk] = k.group(0, ny(0, 1.0), 1.0); dk.desk(0, 0, 0); dk.lamp(.75, 0, 1.2); dk.person('ink', 0, .2, .01); });
  prop(ON('tower'), k => {
    k.box(3, .12, 3, 'stone', 0, 1.1, -1.6);
    for (let n = 0; n < 6; n++) { const [f, fg] = k.group(0, 1.22 + n * .8, -1.6); f.box(2.3, .06, 2.3, 'stone', 0, 0, 0);
      if (n < 5) { f.box(.7, .74, .7, 'stone', 0, .06, 0); f.box(2.2, .72, 2.2, 'glass', 0, .06, 0);
        for (let i = 0; i < 6; i++) { f.box(.03, .72, .03, 'metal', -1.1 + i * .44, .06, 1.11, true); f.box(.03, .72, .03, 'metal', 1.11, .06, -1.1 + i * .44, true); } f.windows(-.88, .2, 1.13, 5, 1, .44, 0, .3, .36, '*win');
        // Scaffolding on the right face: standards, ledgers, boards, braces.
        for (let i = 0; i < 4; i++) f.box(.02, .8, .02, 'metal', 1.45, 0, -1.05 + i * .7, true); [.05, .45].forEach(yy => f.box(.02, .02, 2.2, 'metal', 1.45, yy, 0, true)); f.box(.26, .02, 2.2, 'wood', 1.32, .02, 0, true);
        const br = f.box(.02, .02, 1, 'metal', 1.45, .3, -.7, true); br.rotation.x = .7; }
      else { [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1], [0, -1.1], [0, 1.1], [-1.1, 0], [1.1, 0]].forEach(([x, z]) => { f.box(.08, .5, .08, 'stone', x, 0, z); for (let r = 0; r < 4; r++) f.box(.015, .3, .015, 'metal', x - .03 + (r % 2) * .06, .5, z - .03 + (r > 1) * .06, true); });
        f.box(.7, .6, .7, 'stone', 0, .06, 0); for (let i = 0; i < 9; i++) f.box(2.2, .01, .01, 'metal', 0, .08, -1.1 + i * .275, true); }
      floors.push(live(fg)); }
    // A lattice tower crane: mast of four legs with cross bracing, the turning jib with counterweight, trolley and hook.
    const cx = -3, cz = -1.6, cy = ny(cx, cz);
    k.box(.6, .2, .6, 'stone', cx, cy - .05, cz);
    [[-.12, -.12], [.12, -.12], [-.12, .12], [.12, .12]].forEach(([x, z]) => k.box(.04, 4.2, .04, 'crane', cx + x, cy, cz + z, true));
    for (let j = 0; j < 13; j++) [[0, .12, 0], [0, -.12, 0], [.12, 0, 1], [-.12, 0, 1]].forEach(([x, z, side]) => { const b = k.box(side ? .03 : .32, .03, side ? .32 : .03, 'crane', cx + x, cy + .15 + j * .3, cz + z, true); if (side) b.rotation.x = j % 2 ? .7 : -.7; else b.rotation.z = j % 2 ? .7 : -.7; });
    // The jib reaches 1.7 from the mast (x -1.3 at most, while it swings), so it and its load never enter the tower (x from -1.15).
    const [jb, jg] = k.group(cx, cy + 4.2, cz); jb.box(2.6, .06, .2, 'crane', .4, 0, 0); jb.box(2.6, .04, .04, 'crane', .4, .24, 0, true);
    for (let i = 0; i < 8; i++) { const b = jb.box(.02, .28, .02, 'crane', -.75 + i * .33, 0, 0, true); b.rotation.z = i % 2 ? .45 : -.45; }
    jb.box(.04, .28, .04, 'crane', 0, 0, 0, true); jb.box(.5, .4, .4, 'wall', 0, -.4, .3); jb.box(.6, .45, .45, 'stone', -.75, -.45, 0); jb.box(.16, .08, .2, 'ink', 1.45, -.08, 0);
    jb.box(.01, 1.2, .01, 'ink', 1.45, -1.2, 0, true); jb.box(.06, .1, .06, 'gold', 1.45, -1.3, 0); jb.box(.5, .05, .36, 'wood', 1.45, -1.55, 0); jb.box(.42, .2, .28, 'stone', 1.45, -1.5, 0); jib = live(jg);
    sunrise = live(k.ball(1.4, '*sun', 4.5, 3.4, -9)); });

  // Me.
  const me = avatar(new THREE.MeshStandardMaterial({ color: ACCENT, roughness: .7 }), .5);   // the same height as the other people (~0.92)
  scene.add(me.g);
  const tags = { junior: tag('<small>Austria</small>Junior national team'), dealer: tag('<small>60 years</small>Autohaus Haberhauer'), kufstein: tag('<small>2020–23</small>FH Kufstein'),
    doors: ['Marketing', 'E-commerce', 'Data'].map(t => tag(t)), week: tag(''), grade: tag('<small>MSc</small>9.23 / 10'),
    teams: TEAMS.map(([t]) => tag(t)), scrum: tag('<small>Scrum Master</small>2 company projects') };

  let lastKey = '', room = 0;
  const look = V(0, 1.2, 0), lookB = V(0, 0, 0);
  const ROOM = [.06, .9, 1, .62];   // mock: the one-line headline is larger, so the picture makes room sooner   // where the text may reach before the picture makes room; how far it moves down; how far the stage steps back; how much of that at the end
  // The intro, before the journey: Florian walks in big from the side, says hello and who he is, then walks onto the stage while the camera pulls back
  // and the first scene rises round him. It plays whenever the page opens at the start (no step in the link); with reduced motion he stands still
  // and the stage appears without the camera move. Skip, a scroll, a key or a tap fast-forwards to the walk onto the stage; scrolling on past the opening ends it.
  const SAY = [[2, 3.9, 'Hi, I\'m Florian.'], [3.9, 6.4, 'Data analyst from Austria. I read the numbers, then I build the tool.'], [6.4, 8, 'This is how I got here. Come along.']];
  const PULL = 8, INTRO_END = reduce ? PULL + .3 : 10.2, bubble = document.querySelector('#journey .bubble');
  const clock = () => performance.now() / 1000;   // the intro keeps its own time: the scenes' clock stands still under reduced motion
  let introAt = location.hash || reduce ? null : -1;   // the greeting plays when the page opens at the start
  if (introAt !== null) scrollTo(0, 0);
  const endIntro = () => { introAt = null; document.body.classList.remove('intro'); bubble.hidden = true; };
  const hurry = () => { if (introAt === null) return; const now = clock(); if (introAt === -1 || now - introAt < PULL) introAt = now - PULL; };
  if (introAt !== null) {
    document.body.classList.add('intro');
    document.querySelector('#journey .skip-intro').addEventListener('click', hurry);
    ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, hurry, { passive: true }));
  }
  journey({ beats, s,
    render(u, info) {
      const { i, k, beat, beats: all, time } = info;
      const id = beat.id, prev = info.landed ? id : i > 0 ? all[i - 1].id : id;
      if (introAt === -1) introAt = clock();
      if (introAt !== null && (i > 0 || clock() - introAt > INTRO_END)) endIntro();
      const it = introAt !== null ? clock() - introAt : null;   // seconds into the intro, or null
      // The ground morphs early in each scene. In the intro it starts as the empty stage and becomes the first scene during the pull-back.
      const t = i > 0 ? smooth(seg(k, 0, .32)) : 1, kk = i > 0 && !reduce ? k : 1;
      const [ta, tb, tkk] = it !== null ? ['end', 'hi', reduce ? (it >= PULL ? .5 : 0) : seg(it, PULL - .2, INTRO_END - .6) * .5] : [prev, id, kk];
      const tk = `${ta}>${tb}:${seg(tkk, 0, .5).toFixed(3)}`;
      if (tk !== lastKey) { lastKey = tk; terrain.update(ta, tb, tkk); }
      // Props rise into their scenes and sink out of the ones that end.
      ensure([prev, id]);
      props.forEach((g, n) => { if (!g.userData.built) return; const sc = g.userData.scenes, inNow = sc.includes(id), inPrev = sc.includes(prev);
        const rr = g.userData.r / R, [l0, l1] = id === 'end' ? [.1, .08] : [.3, .14];   // into the end the props clear fast, so the question lands on an empty stage
        let w = inNow ? (inPrev ? 1 : seg(k, .1 + rr * .32, .28 + rr * .32)) : inPrev ? 1 - seg(k, rr * l0, rr * l0 + l1) : 0;
        if (it !== null) w = inNow ? seg(it, PULL + rr * .9, PULL + .7 + rr * .9) : 0;
        if (reduce) w = inNow ? 1 : 0;   // settled: this moment's parts are up, the last moment's are gone
        g.visible = w > .002; if (!g.visible) return;
        const e = (inNow && !inPrev) || it !== null ? backOut(w) : w;
        g.scale.set(1, Math.max(.002, e), 1); });
      // Light: dark at the knee, a night in Barcelona, dawn at the end.
      const night = id === 'down' ? .75 * smooth(seg(k, .1, .35)) : id === 'up' ? .75 : id === 'night' ? .55 + .3 * smooth(seg(k, 0, .4)) : id === 'evenings' ? .85 : id === 'tower' ? .85 * (1 - smooth(seg(k, .5, 1))) : 0;
      hemi.intensity = HEMI * (1 - night * .7); sun.intensity = SUN * (1 - night * .85);
      // His light grows with his scope: none in the hometown, the hall or the valley; one cube at the spark; a screen and a rack at the engine;
      // the city at night; four lines and four screens at the hub; a tower and the dawn at Next; nothing on the empty stage at the end.
      const ACC = new THREE.Color(ACCENT), gl = (key, v) => { const m = glows[key]; if (!m) return; const e = id === 'end' ? 0 : v; m.emissiveIntensity = e;
        if (!(key in GLOW)) m.color.copy(WHITE).lerp(ACC, Math.min(.85, e * .8));   // his light is orange, not pink: the surface takes the colour as it glows
      };
      gl('*lamp', id === 'court' || id === 'team' || id === 'down' ? 1.4 : id === 'up' ? 0 : .6 + night); gl('*score', id === 'down' || id === 'up' ? 0 : .9); gl('*door', id === 'up' ? 2.4 * seg(k, .1, .3) : 0); doorGlow.forEach(m => { m.opacity = id === 'up' ? .9 * smooth(seg(k, .1, .35)) : 0; });
      gl('*win', id === 'night' ? night * .8 : id === 'tower' ? .9 : 0); gl('*nwin', id === 'night' ? night * 1.4 : 0); gl('*gold', id === 'doors' ? .9 * smooth(seg(k, .5, .75)) : 0); gl('*moon', 1); gl('*sun', 1.1);
      gl('*rec', id === 'pile' ? 1.6 * smooth(seg(k, .6, .72)) : 0);
      gl('*screen', id === 'byhand' ? .4 : id === 'auto' ? .4 + seg(k, 0, .25) * .8 : id === 'hub' ? 1 : id === 'evenings' || id === 'tower' ? 1.3 : id === 'day' ? .5 : 0);
      gl('*tool', id === 'hub' ? 1.1 : 0); TEAMS.forEach((tm, n) => gl('*t' + n, id === 'hub' ? seg(k, .38 + n * .06, .46 + n * .06) * 1.2 : 0));
      gl('*wall', id === 'byhand' ? .05 : id === 'auto' ? .05 + smooth(seg(k, 0, .3)) * 1.25 : 0); gl('*led', id === 'auto' ? (Math.sin(time * 12) > 0 ? 1.6 : .6) : 0);
      // Scene life.
      if (ball.visible) ball.children[0]?.position.set(2.2 * Math.cos(time * 1.6), 1.0 + Math.abs(Math.sin(time * 1.6)) * 1.1, .4 * Math.sin(time * .8));
      kneeStar.children[0]?.scale.setScalar(1 + Math.sin(time * 4) * .25);
      doors.forEach((d, n) => { d.rotation.y = id === 'doors' && n === 2 ? -seg(k, .45, .75) * 1.8 : 0; });   // only the Data door opens
      pile.forEach(m => { const p = id === 'pile' ? smooth(seg(k, .12 + m.userData.r * .012, .4 + m.userData.r * .012)) : 0; m.position.lerpVectors(m.userData.a, m.userData.b, p); m.position.y += Math.sin(p * Math.PI); m.rotation.set(m.userData.r * (1 - p), m.userData.r * 1.7 * (1 - p), 0); });
      // The engine: the printer works by hand until the automation lands, then sinks away; the rack rises and data flows.
      if (printer) { const sink = id === 'auto' ? smooth(seg(k, 0, .22)) : 0; printer.position.y = -sink * 1.4; printer.visible = sink < .95; printer.userData.sheet.position.z = .3 + (id === 'byhand' ? (time * .6) % .3 : 0); }
      if (rack) { rack.scale.y = Math.max(.002, id === 'auto' ? backOut(seg(k, .06, .3)) : 0); packets.forEach((c, n) => { c.position.x = -.2 - ((time * .5 + n / 5) % 1) * 3.0; }); }
      if (paper) paper.scale.y = Math.max(.02, (id === 'byhand' ? .3 + seg(k, .1, .85) * .9 : id === 'auto' ? 1.2 : .3) * (1 - (id === 'auto' ? smooth(seg(k, 0, .22)) : 0)));
      if (moon) { const a = Math.PI * smooth(seg(id === 'night' ? k : 0, .1, .95)); moon.position.set(-5.2 + a / Math.PI * 2.4, .8 + Math.sin(a) * 1.5, -6.2); moon.visible = night > .05 && (id === 'night'); }
      // The train passes behind the office; cars outside the plinth's edge are hidden.
      if (train) { train.position.x = -8 + ((time * 1.4) % 18); train.children.forEach((c, n) => { c.visible = Math.abs(train.position.x - n * 2) + 1 < Math.sqrt(R * R - 4.3 * 4.3) - .3; }); }
      links.forEach((l, n) => { const p = id === 'hub' ? seg(k, .32 + n * .06, .42 + n * .06) : 0; l.g.scale.x = Math.max(.002, p); l.g.visible = p > 0;
        l.packets.forEach((m, j) => { m.visible = p >= 1; m.position.x = .3 + ((time * .45 + j / 3) % 1) * l.L; }); });
      if (gondola) gondola.position.copy(cableA).lerp(cableB, (Math.sin(time * .3) + 1) / 2);
      if (jib) jib.rotation.y = Math.sin(time * .25) * .6;
      floors.forEach((f, n) => { const p = id === 'tower' ? seg(k, .04 + n * .13, .17 + n * .13) : 0; f.scale.y = Math.max(.002, reduce ? (p > 0 ? 1 : 0) : backOut(p)); f.visible = p > 0 || (reduce && id === 'tower'); });
      if (sunrise) sunrise.position.y = .6 + smooth(seg(id === 'tower' ? k : 0, .2, .9)) * 2.2;
      stageG.children.forEach(g => { g.children.forEach(c => { if (c.userData.boat) { const p = smooth(seg(id === 'fork' ? k : 0, .7, 1)); c.position.set(3.6 + p * .92, -.14, 3.0 + p * .39); } }); });
      // Me: walking to my spot in each scene, down at the knee.
      const a = SPOT[prev], b = SPOT[id], w = i > 0 ? (reduce ? (k > .3 ? 1 : 0) : smooth(seg(k, .08, .3))) : 1;
      let x = lerp(a[0], b[0], w), z = lerp(a[1], b[1], w), FACE = null, SEAT = false;
      if (id === 'byhand') { const lap = seg(k, .08, .92) * 4, tri = Math.abs((lap % 1) * 2 - 1); x = reduce ? -.9 : lerp(-.9, 1.5, tri); z = 2.1; FACE = Math.PI; }   // laps between the desk and the printer
      if (id === 'auto') { x = -.9; z = 2.1; FACE = Math.PI; }
      if (id === 'evenings') { x = 0; z = 1.42; FACE = Math.PI; SEAT = true; }
      if (id === 'up') z = lerp(z, -2.4, smooth(seg(k, .58, .97)));   // up on my feet, then along the path of light to the gate
      // The camera travels with the walk from the last scene's framing to this one's.
      const fa = FRAME[prev], fb = FRAME[id], fw = reduce ? (w > .5 ? 1 : 0) : w, fd = lerp(fa[0], fb[0], fw) * (innerWidth / innerHeight < .8 ? 1 + .18 * lerp(prev === 'up' ? 1 : 0, id === 'up' ? 1 : 0, fw) : 1),   // phones: the gate scene steps back so the wall stays inside the screen
      fh = lerp(fa[2] ?? 1, fb[2] ?? 1, fw), fyaw = lerp(fa[3] ?? 0, fb[3] ?? 0, fw);
      look.set(...fa[1]).lerp(lookB.set(...fb[1]), fw);
      if (it !== null) {   // in from the left at the front edge, a wave, then back to my spot as the scene rises
        const walkIn = reduce ? 1 : smooth(seg(it, 0, 1.5)), walkOn = reduce ? 0 : smooth(seg(it, PULL + .1, INTRO_END - .4));
        me.place(V(lerp(-2.1, 0, walkIn), 0, lerp(4.2, SPOT.hi[1], walkOn)), 0);
        if (!reduce && it > 1.9 && it < 3.6) me.arms[1].rotation.x = -2.6 + Math.sin(it * 9) * .3;
      } else me.place(V(x, heightAt(x, z, prev, id, t), z), FACE ?? (id === 'end' ? 0 : id === 'doors' || id === 'pile' || id === 'hub' ? Math.PI : id === 'court' || id === 'team' || id === 'down' ? -Math.PI / 2 + .5 : id === 'up' ? Math.PI : Math.PI / 5));
      if (id === 'hi' && it === null) me.arms[1].rotation.x = -2.6 + Math.sin(time * 9) * .3;
      if (id === 'court' || id === 'team') me.arms.forEach(ar => { ar.rotation.x = -1.0; });
      // The knee, acted: a block jump, the landing that goes wrong, down on the floor, up on one knee, then standing again.
      const hop = id === 'down' ? Math.sin(Math.PI * seg(k, .06, .16)) : 0;
      if (hop > 0) { me.g.position.y += hop * .55; me.arms.forEach(ar => { ar.rotation.x = -2.9 * hop; }); }
      const down = id === 'down' ? smooth(seg(k, .16, .3)) : id === 'up' ? 1 - .5 * smooth(seg(k, .05, .3)) - .5 * smooth(seg(k, .4, .6)) : 0;
      if (down) { me.g.rotation.x = -down * Math.PI / 2; me.legs[1].rotation.x = -1.3 * down; me.arms.forEach(ar => { ar.rotation.x = -1.1 * down; }); }
      const star = kneeStar.children[0];
      if (star) { star.visible = down > .5; if (star.visible) { me.g.updateMatrixWorld(true); me.legs[1].localToWorld(star.position.set(0, -.28, .12)); } }
      if (SEAT) { me.legs.forEach(l => { l.rotation.x = -1.45; }); me.g.position.y += .04; me.arms.forEach((ar, n) => { ar.rotation.x = -1.15 + Math.sin(time * 11 + n * 2) * .1; }); }   // sitting at the desk, typing
      if (id === 'auto') { const c = Math.sin(Math.PI * seg(k, .06, .34)); if (c > 0) { me.arms.forEach(ar => { ar.rotation.x = -2.8 * c; }); me.g.position.y += .14 * Math.abs(Math.sin(time * 9)) * c; } else if (k > .5) me.arms.forEach((ar, n) => { ar.rotation.x = -1.15 + Math.sin(time * 10 + n * 2) * .1; }); }   // the automation lands: arms up, then back to work

      const endE = id === 'end' ? (reduce ? 1 : smooth(seg(k, .55, .85))) : 0;   // the ending: off the line, towards the reader, big
      if (id === 'end') { me.place(V(0, 0, lerp(1.4, 4.2, endE)), 0); const o = reduce ? 1 : smooth(seg(k, .85, .95)); me.arms[0].rotation.z = -1.05 * o; me.arms[1].rotation.z = 1.05 * o; me.arms.forEach(ar => { ar.rotation.x = -.5 * o; }); }
      const acting = id === 'down' || id === 'up' || id === 'byhand' || id === 'auto' || id === 'evenings' || (id === 'end' && k > .55);   // moments where he is in the scene, not on the line
      document.body.classList.toggle('acting', acting); VIEW.acting = acting; me.g.visible = !VIEW.out || acting || reduce; VIEW.me = me.g;   // reduced motion: he stands in each scene instead of walking the line
      document.body.classList.toggle('finale', id === 'end' && k > .2);
      // Camera: one view of the stage that comes closer or opens up per scene (FRAME), breathing a little.
      // On tall (phone) screens the camera rises and looks down more steeply, so the round stage fills the height instead of a thin strip.
      const asp = innerWidth / innerHeight, fit = Math.max(1, 1.12 / asp), steep = asp < 1 ? 1 + (1 - asp) * 1.3 : 1, ang = Math.sin(time * .12) * .1;
      const close = asp < .6 ? lerp(1, .88, seg(.6 - asp, 0, .15)) : 1;   // phones: closer, as far as the rim stays inside the screen width
      // Room for the text: the further the title block reaches down the screen, the further the picture moves down and the stage steps back.
      const want = 0;   // walk: the text lives beside the stage, not over it
      const pb = it === null ? 1 : reduce ? (it >= PULL ? 1 : 0) : smooth(seg(it, PULL, INTRO_END - .2));   // the intro's pull-back from the close-up
      room = reduce || it !== null ? want * pb : lerp(room, want, .08);
      const back = 1 + Math.abs(room) * ROOM[2];
      const dist = 21 * VIEW.zoom * fit * close * back * fd / Math.sqrt(steep), h = 12 * VIEW.zoom * fit * close * back * fd * fh * steep;
      s.cam.setViewOffset(innerWidth, innerHeight, -VIEW.shift * innerWidth, VIEW.lift * innerHeight, innerWidth, innerHeight);   // walk: the stage sits in the right half (phone: the top)
      s.cam.position.set(look.x + Math.sin(ang + fyaw) * dist, h, look.z + Math.cos(ang + fyaw) * dist);
      if (it !== null) {   // the intro's close-up, eased back out to the stage view
        const near = 4.0 * Math.max(1, .7 / asp);
        s.cam.position.lerpVectors(V(0, 1.2, 4.2 + near), s.cam.position.clone(), pb);
        s.cam.lookAt(V(0, .62, 4.2).lerp(look, pb));
        const line = SAY.find(([a0, b0]) => it >= a0 && it < b0);
        bubble.hidden = !line;
        if (line) {
          if (bubble.textContent !== line[2]) bubble.textContent = line[2];
          const p = me.g.position.clone().add(V(0, 1.0, 0)).project(s.cam);
          bubble.style.opacity = Math.min(seg(it, line[0], line[0] + .25), 1 - seg(it, line[1] - .25, line[1]));
          bubble.style.transform = `translate(${(p.x + 1) / 2 * innerWidth}px, ${(1 - p.y) / 2 * innerHeight}px) translate(-50%, calc(-100% - 14px))`;
        }
      } else if (endE > 0) { const near = 4.0 * Math.max(1, .7 / asp) * (asp < .8 ? 1.3 : 1); s.cam.position.lerp(V(0, 1.2, 4.2 + near), endE); s.cam.lookAt(lookB.copy(look).lerp(V(0, .62, 4.2), endE)); }
      else s.cam.lookAt(look);
      tags.dealer.show(V(-3.9, 3.1, -.6), s.cam, 0);
      tags.kufstein.show(V(2.6, 1.8, .2), s.cam, 0);
      tags.doors.forEach((tg, n) => tg.show(V(-2.4 + n * 2.4, 2.95, -1.1), s.cam, id === 'doors' ? seg(k, .35, .45) : 0));
      tags.week.show(V(.3, 2, .9), s.cam, 0);
      tags.junior.show(me.g.position.clone().add(V(0, 2.2, 0)), s.cam, 0);
      tags.grade.show(me.g.position.clone().add(V(0, 2.4, 0)), s.cam, 0);
      tags.teams.forEach((tg, n) => tg.show(V(TEAMS[n][1], 1.5, TEAMS[n][2]), s.cam, 0));
      tags.scrum.show(V(-1.9, 2.0, -3.3), s.cam, 0);
      return it !== null;   // tells the loop the intro still needs frames
    } });
  idle(buildRest);   // the first frame builds only what's on screen; the rest follows while the reader starts
}

// Walk the line. The stage is one fixed canvas behind the page; the section in the middle of the screen decides the scene and how far it has built.
// After the greeting the stage moves into the right half and steps back. Florian steps off it onto the line: a second, small canvas draws him
// at the tip of the line (the page script publishes the tip as window.TIP), walking when it moves, facing where it goes.
const VIEW = { zoom: 1, shift: 0, lift: 0, out: false, acting: false, me: null };
// Moments: each page section owns one or more, by its scroll progress. ORDER is the story order the engine morphs along.
const MOMENTS = { hi: [['hi', 0, 1]], court: [['court', 0, .5], ['team', .5, 1]], knee: [['down', 0, .6], ['up', .6, 1]], fork: [['dealer', 0, .55], ['kufstein', .55, 1]],
  spark: [['doors', 0, .6], ['pile', .6, 1]], engine: [['byhand', 0, .62], ['auto', .62, 1]], double: [['day', 0, .5], ['night', .5, 1]], trusted: [['hub', 0, 1]], next: [['evenings', 0, .6], ['tower', .6, 1]], end: [['end', 0, .6]] };   // the ending completes before the section's text has scrolled up
const ORDER = Object.values(MOMENTS).flat().map(m => m[0]), MBEATS = ORDER.map(id => ({ id }));
function journey({ beats, render, s }) {
  if (!s) { document.documentElement.classList.add('text'); return; }   // no WebGL: the page reads as text
  const phone = () => innerWidth <= 860;
  const secs = beats.map(b => document.getElementById(b.id));
  const W = { r: new THREE.WebGLRenderer({ alpha: true, antialias: true }), scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(28, 1, .1, 50) };
  W.r.setPixelRatio(Math.min(devicePixelRatio, 2)); W.r.domElement.className = 'walker'; W.r.domElement.setAttribute('aria-hidden', 'true'); document.body.append(W.r.domElement);
  W.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d9d4, 1.8)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(-3, 6, 5); W.scene.add(dl);
  const fig = avatar(new THREE.MeshStandardMaterial({ color: ACCENT, roughness: .7 }), .5); W.scene.add(fig.g);
  W.cam.position.set(0, 1.1, 4.6); W.cam.lookAt(0, .46, 0);
  let WS = 0; const sizeW = () => { WS = phone() ? 96 : 128; W.r.setSize(WS, WS); };
  sizeW();
  addEventListener('resize', () => { s.resize(); sizeW(); });
  const link = document.querySelector('.link path');
  let outAt = 0, phase = 0, swing = 0, yaw = 0, last = null, restSince = 0, lastNow = 0, lastY = -1, clock = 0, lastAct = performance.now();
  ['scroll', 'resize', 'wheel', 'touchstart', 'keydown', 'pointerdown', 'pointermove'].forEach(ev => addEventListener(ev, () => { lastAct = performance.now(); }, { passive: true }));
  function frame(now) {
    if (!window.__manual) requestAnimationFrame(frame);   // ?manual: a test page calls window.__frame itself
    const vh = innerHeight, intro = document.body.classList.contains('intro'), P = phone();
    // The scene's own life (sway, waving, the crane, the packets) runs only while the reader is active, and stops five seconds after the last input.
    const dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0; lastNow = now;
    const idle = now - lastAct > 5000 && !intro && !window.__manual && !window.__playing;   // Play counts as the reader being there: slow autoplay moves under a pixel a frame and must still redraw every frame
    if (idle && Math.abs(scrollY - lastY) < 1) return;
    lastY = scrollY; if (!idle && !reduce) clock += dt;
    const time = reduce ? 0 : clock;
    // The scene and its progress: the last section whose top has passed the middle of the screen.
    let sec = 0, p = 0;
    secs.forEach((el, n) => { if (!el) return; const r = el.getBoundingClientRect(); if (r.top <= vh * .6) { sec = n; p = clamp((vh * .6 - r.top) / r.height); } });
    const [mid, a, b] = MOMENTS[beats[sec].id].find(([, a0, b0]) => p < b0) || MOMENTS[beats[sec].id].at(-1);
    const i = ORDER.indexOf(mid), k = seg(p, a, b);
    // After the greeting the stage glides into the right half (phone: up) and steps back.
    if (!intro && !outAt) outAt = now;
    const go = intro ? 0 : reduce ? 1 : smooth(clamp((now - outAt) / 1400));
    VIEW.shift = P ? 0 : .25 * go; VIEW.lift = (P ? .27 : .06) * go; VIEW.zoom = 1 + (P ? .5 : .5) * go;
    document.body.classList.toggle('settled', go > .3);   // the hero's words come in as the stage moves aside
    document.documentElement.style.setProperty('--veil', go);
    // From the hero the line starts at him in the scene: a link from his spot down to the first drawing, drawn as the hero scrolls away.
    const hero = secs[0].getBoundingClientRect(), c = intro ? 0 : clamp(-hero.top / (vh * .7));   // he walks off the stage along the link over 70% of a screen of scroll
    VIEW.out = !intro && (c > .02 || i > 0);
    // Once the sections after the journey come up, the stage fades out under them.
    const stub = document.querySelector('#projects'); if (stub) document.getElementById('stage').style.opacity = clamp((stub.getBoundingClientRect().top - vh * .45) / (vh * .35));
    render(0, { i, k, beat: MBEATS[i], beats: MBEATS, time });
    s.draw();
    const tip = window.TIP || {};
    let pos = null, dir = [0, 1];
    if (!reduce && VIEW.me && c > 0 && !(tip.on && tip.sec !== 'court') && window.LINESTART) {
      const p = VIEW.me.position.clone().project(s.cam), A = [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * vh], B = window.LINESTART();
      link.setAttribute('d', `M${A[0]},${A[1]} C${A[0]},${A[1] + 160} ${B[0]},${B[1] - 220} ${B[0]},${B[1]}`);
      const L = link.getTotalLength(); link.style.strokeDasharray = `${L} ${L}`; link.style.strokeDashoffset = L * (1 - c);
      link.parentNode.style.opacity = 1 - (tip.on ? clamp(tip.p / .15) : 0);
      if (!tip.on) { const a = link.getPointAtLength(c * L), b = link.getPointAtLength(Math.max(0, c * L - 6)); pos = [a.x, a.y]; dir = [a.x - b.x, a.y - b.y]; }
    } else link.parentNode.style.opacity = 0;
    if (tip.on) { pos = [tip.x, tip.y]; dir = [tip.dx, tip.dy]; }
    // The walker: there while he is on the line; legs swing with the distance he covers; facing the way the line goes, the reader when he stops.
    const show = !reduce && VIEW.out && pos && !VIEW.acting;
    // On a phone the caption sits across the line: he steps out of sight while he would overlap its words, and is back below them.
    let seen = 1;
    if (show && P) { const c = document.querySelector('.cap.live .caps'); if (c) { const r = c.getBoundingClientRect(); if (pos[1] + WS * .2 > r.top - 8 && pos[1] - WS * .8 < r.bottom + 8) seen = 0; } }
    W.r.domElement.style.opacity = show ? seen : 0;
    if (!show) { last = null; return; }
    const moved = last ? Math.hypot(pos[0] - last[0], pos[1] - last[1]) : 0; last = pos;
    if (moved > .4) { restSince = now; phase += moved * .09; if (Math.hypot(...dir) > .5) { const want = Math.atan2(dir[0], dir[1]); yaw += ((((want - yaw) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * .25; } }
    else if (now - restSince > 700) yaw += ((((0 - yaw) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * .08;
    swing += ((moved > .4 ? .6 : 0) - swing) * .2;
    const sw = Math.sin(phase) * swing;
    fig.legs[0].rotation.x = sw; fig.legs[1].rotation.x = -sw; fig.arms[0].rotation.x = -sw; fig.arms[1].rotation.x = sw; fig.arms[1].rotation.z = 0;
    fig.g.rotation.y = yaw;
    if (tip.end) { fig.g.rotation.y = 0; fig.arms[1].rotation.z = 1.15; fig.arms[1].rotation.x = -.55; }   // the end: a hand held out to the reader
    W.r.domElement.style.transform = `translate(${pos[0] - WS / 2}px, ${pos[1] - WS * .8}px)`;
    W.r.render(W.scene, W.cam);
  }
  window.__frame = frame; window.__manual = new URLSearchParams(location.search).has('manual');
  requestAnimationFrame(frame);
}

run();
