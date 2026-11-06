import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

const stage = $('#stage');
const canvas = $('#gl');
const hot = $('#hot');
const hotcard = $('#hotcard');
const isTouch = matchMedia('(pointer: coarse)').matches;

// ---------- renderer, scene, camera, controls ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060607);
scene.fog = new THREE.Fog(0x060607, 16, 34);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 1.5;
controls.maxDistance = 14;
controls.minPolarAngle = 0.02;
controls.maxPolarAngle = Math.PI - 0.02;
controls.enablePan = false;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.9;
controls.target.set(0, 0.6, 0);
canvas.style.touchAction = 'none';

scene.add(new THREE.HemisphereLight(0xffffff, 0x101014, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(4, 8, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9db7ff, 1.1);
rim.position.set(-6, 4, -5);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(14, 96),
  new THREE.MeshStandardMaterial({ color: 0x0c0c0f, roughness: 0.35, metalness: 0.3, side: THREE.DoubleSide })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ---------- materials ----------
const M = {
  paint: new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, metalness: 0.7, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1118, roughness: 0.04, transparent: true, opacity: 0.8, side: THREE.DoubleSide, clearcoat: 1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.55, metalness: 0.2 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.95 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.22 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.6 }),
  headlight: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe9ff, emissiveIntensity: 2.2 }),
  taillight: new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff1f1f, emissiveIntensity: 1.8 }),
  engine: new THREE.MeshStandardMaterial({ color: 0x5b5f66, metalness: 0.9, roughness: 0.35 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xa31d17, metalness: 0.6, roughness: 0.3 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x001018, emissive: 0x2a8cff, emissiveIntensity: 0.9 }),
};

// ---------- car model (procedural) ----------
const car = new THREE.Group();
scene.add(car);

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.9)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function extrudeProfile(pts, width, bevel = 0.04) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 8,
  });
  g.translate(0, 0, -width / 2);
  return g;
}

function box(w, h, d, mat, x, y, z, parent = car) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

const BODY_PTS = [[-2.2, 0.3], [2.2, 0.3], [2.25, 0.5], [2.12, 0.56], [1.0, 0.7], [-1.1, 0.74], [-2.2, 0.62]];
const CABIN_PTS = [[1.0, 0.68], [0.42, 1.0], [-0.55, 1.03], [-1.12, 0.8], [-1.12, 0.68]];

const body = new THREE.Mesh(extrudeProfile(BODY_PTS, 1.9), M.paint);
const greenhouse = new THREE.Mesh(extrudeProfile(CABIN_PTS, 1.46, 0.03), M.glass);
car.add(body, greenhouse);

// nose, tail and lights
box(0.22, 0.035, 1.9, M.black, 2.12, 0.27, 0);            // front splitter
box(0.04, 0.14, 0.8, M.black, 2.23, 0.38, 0);              // grille
box(0.05, 0.08, 0.34, M.headlight, 2.23, 0.5, 0.62);       // headlights
box(0.05, 0.08, 0.34, M.headlight, 2.23, 0.5, -0.62);
box(0.2, 0.1, 1.5, M.black, -2.12, 0.27, 0);               // rear diffuser
box(0.05, 0.06, 1.4, M.taillight, -2.21, 0.56, 0);         // tail bar
box(2.6, 0.06, 0.04, M.black, 0, 0.3, 0.97);               // side skirts
box(2.6, 0.06, 0.04, M.black, 0, 0.3, -0.97);
for (const z of [0.35, -0.35]) {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 20), M.rim);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(-2.18, 0.36, z);
  car.add(pipe);
}

// doors (front-hinged, swing outward)
function makeDoor(side) {
  const pivot = new THREE.Group();
  pivot.position.set(0.5, 0.56, side * 0.975);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.035), M.paint);
  panel.position.set(-0.5, 0, 0);
  pivot.add(panel);
  car.add(pivot);
  return pivot;
}
const doorR = makeDoor(1);
const doorL = makeDoor(-1);

// bonnet (hinged at windscreen base)
const bonnet = new THREE.Group();
bonnet.position.set(0.95, 0.72, 0);
bonnet.rotation.z = -0.1;
box(1.3, 0.04, 1.84, M.paint, 0.65, 0.02, 0, bonnet);
car.add(bonnet);

// engine, visible only with bonnet open
const engine = new THREE.Group();
box(0.9, 0.22, 0.95, M.engine, 1.45, 0.8, 0, engine);
for (let i = 0; i < 4; i++) {
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 20), M.accent);
  cyl.rotation.x = Math.PI / 2;
  cyl.position.set(1.2 + i * 0.17, 0.95, 0);
  engine.add(cyl);
}
engine.visible = false;
car.add(engine);

// boot lid (hinged at rear deck front edge)
const boot = new THREE.Group();
boot.position.set(-1.1, 0.745, 0);
boot.rotation.z = 0.109;
box(1.15, 0.04, 1.8, M.paint, -0.575, 0.02, 0, boot);
car.add(boot);

// ---------- wheels ----------
const WHEEL_DESIGNS = {
  turbine: { n: 5, w: 0.07, len: 0.2 },
  mesh: { n: 12, w: 0.022, len: 0.18 },
  forged: { n: 3, w: 0.1, len: 0.2 },
};
const spokeGeoCache = {};

function buildSpokes(wheel, designName) {
  const d = WHEEL_DESIGNS[designName];
  const sp = wheel.userData.spokes;
  sp.clear();
  const key = designName;
  if (!spokeGeoCache[key]) spokeGeoCache[key] = new THREE.BoxGeometry(d.w, d.len, 0.05);
  for (let i = 0; i < d.n; i++) {
    const a = (i * Math.PI * 2) / d.n;
    const s = new THREE.Mesh(spokeGeoCache[key], M.rim);
    s.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.12);
    s.rotation.z = a - Math.PI / 2;
    sp.add(s);
  }
}

function makeWheel(x, z) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.09, 20, 56), M.rubber);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 40), M.black);
  barrel.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 24), M.rim);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.12;
  const spokes = new THREE.Group();
  g.userData.spokes = spokes;
  g.add(tyre, barrel, hub, spokes);
  g.position.set(x, 0.4, z);
  car.add(g);
  buildSpokes(g, 'turbine');
  return g;
}
const wheels = [];
for (const x of [1.3, -1.3]) for (const z of [0.97, -0.97]) wheels.push(makeWheel(x, z));

// ---------- interior (visible when body is faded) ----------
const interior = new THREE.Group();
car.add(interior);
[-0.36, 0.36].forEach((z) => {
  box(0.5, 0.14, 0.42, M.leather, 0.05, 0.78, z, interior);
  const back = box(0.14, 0.55, 0.42, M.leather, -0.2, 1.02, z, interior);
  back.rotation.z = -0.12;
});
box(0.42, 0.2, 1.7, M.black, 0.8, 0.86, 0, interior);      // dashboard
box(0.02, 0.12, 0.36, M.screen, 0.99, 0.94, -0.36, interior); // driver display
box(0.02, 0.2, 0.5, M.screen, 0.99, 0.92, 0.2, interior);    // central screen
const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 16, 48), M.black);
wheelRim.position.set(0.56, 1.0, -0.36);
wheelRim.rotation.set(0, Math.PI / 2, 0.5);
interior.add(wheelRim);

// ---------- paint, wheel, trim helpers ----------
function tweenColor(mat, hex, dur = 0.6) {
  const c = new THREE.Color(hex);
  gsap.to(mat.color, { r: c.r, g: c.g, b: c.b, duration: dur, ease: 'power2.out' });
}
function setInterior(k) {
  greenhouse.visible = k < 0.5;
  M.paint.opacity = 1 - 0.9 * k;
}

// ---------- panels ----------
const panelState = { doors: false, bonnet: false, boot: false };
function togglePanel(name, open = !panelState[name]) {
  panelState[name] = open;
  if (name === 'doors') {
    gsap.to(doorR.rotation, { y: open ? 0.9 : 0, duration: 0.9, ease: 'power2.inOut' });
    gsap.to(doorL.rotation, { y: open ? -0.9 : 0, duration: 0.9, ease: 'power2.inOut' });
  } else if (name === 'bonnet') {
    gsap.to(bonnet.rotation, {
      z: open ? 0.5 : -0.1, duration: 1, ease: 'power2.inOut',
      onStart: () => { if (open) engine.visible = true; },
      onComplete: () => { if (!open) engine.visible = false; },
    });
  } else if (name === 'boot') {
    gsap.to(boot.rotation, { z: open ? -0.55 : 0.109, duration: 1, ease: 'power2.inOut' });
  }
  $$(`[data-panel="${name}"]`).forEach((b) => b.setAttribute('aria-pressed', String(open)));
}

// ---------- camera control ----------
const VIEWS = {
  hero: { p: [5.2, 1.8, 4.6], t: [0, 0.6, 0] },
  front: { p: [6.2, 0.9, 0], t: [0, 0.6, 0] },
  rear: { p: [-6.2, 0.9, 0], t: [0, 0.6, 0] },
  side: { p: [0, 1.0, 6.4], t: [0, 0.55, 0] },
  top: { p: [0.01, 8.4, 0.01], t: [0, 0, 0] },
  interior: { p: [-0.15, 0.98, 0], t: [1.8, 0.85, 0], int: 1 },
};
const view = { int: 0 };

function flyTo(p, t, interiorOn = false) {
  gsap.killTweensOf([camera.position, controls.target, view]);
  gsap.to(camera.position, { x: p[0], y: p[1], z: p[2], duration: 1.4, ease: 'power3.inOut' });
  gsap.to(controls.target, { x: t[0], y: t[1], z: t[2], duration: 1.4, ease: 'power3.inOut' });
  gsap.to(view, { int: interiorOn ? 1 : 0, duration: 1.2, ease: 'power2.inOut', onUpdate: () => setInterior(view.int) });
}

// ---------- scroll journey ----------
const S = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, rot: 0, int: 0 };
const JOURNEY = [
  { p: [5.2, 1.8, 4.6], t: [0, 0.6, 0], rot: 0, int: 0 },
  { p: [6.2, 0.9, 0], t: [0, 0.6, 0], rot: 0, int: 0 },
  { p: [3.9, 0.9, 1.4], t: [2.1, 0.55, 0.6], rot: 0, int: 0 },
  { p: [2.6, 0.7, 3.2], t: [1.3, 0.4, 0.97], rot: 0, int: 0 },
  { p: [3.5, 0.6, 0], t: [2.2, 0.45, 0], rot: 0, int: 0 },
  { p: [-6.2, 1.2, 2.6], t: [0, 0.6, 0], rot: 0, int: 0 },
  { p: [-0.15, 0.98, 0], t: [1.8, 0.85, 0], rot: 0, int: 1 },
  { p: [0, 1.6, 7.2], t: [0, 0.6, 0], rot: Math.PI * 2, int: 0 },
];
Object.assign(S, { px: JOURNEY[0].p[0], py: JOURNEY[0].p[1], pz: JOURNEY[0].p[2], tx: 0, ty: 0.6, tz: 0 });

function applyS() {
  camera.position.set(S.px, S.py, S.pz);
  controls.target.set(S.tx, S.ty, S.tz);
  car.rotation.y = S.rot;
  setInterior(S.int);
}

const tl = gsap.timeline({ paused: true, defaults: { duration: 1, ease: 'power2.inOut' } });
JOURNEY.slice(1).forEach((k) => {
  tl.to(S, { px: k.p[0], py: k.p[1], pz: k.p[2], tx: k.t[0], ty: k.t[1], tz: k.t[2], rot: k.rot, int: k.int });
});
tl.eventCallback('onUpdate', applyS);
const journeyST = ScrollTrigger.create({
  trigger: '#journey', start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl,
});

// ---------- hotspots ----------
const HOTS = [
  { label: 'Engine', pos: [1.45, 0.8, 0], title: '4.0 L twin-turbo V8', text: 'A hand-tuned V8 with 720 hp. The bonnet opens to show the engine bay.', cam: { p: [2.8, 1.4, 2.4], t: [1.45, 0.7, 0] }, bonnet: true },
  { label: 'LED headlights', pos: [2.23, 0.5, 0.62], title: 'Adaptive LED optics', text: 'Slim light signatures with adaptive high beams.', cam: { p: [3.9, 0.9, 1.4], t: [2.1, 0.55, 0.6] } },
  { label: 'Forged alloys', pos: [1.3, 0.4, 0.98], title: '20-inch forged wheels', text: 'Three spoke designs and three finishes, set in the panel.', cam: { p: [2.6, 0.7, 3.2], t: [1.3, 0.4, 0.98] } },
  { label: 'Cockpit', pos: [0.98, 0.95, 0.1], title: 'Driver cockpit', text: 'Digital instruments and a leather-trimmed driver seat.', cam: { p: [-0.15, 0.98, 0], t: [1.8, 0.85, 0] }, interior: true },
  { label: 'Rear diffuser', pos: [-2.12, 0.27, 0], title: 'Active rear diffuser', text: 'Adds downforce at speed while keeping drag low.', cam: { p: [-4.2, 0.7, 1.8], t: [-2.1, 0.35, 0] } },
];
const hotEls = HOTS.map((h, i) => {
  const el = document.createElement('button');
  el.className = 'hs';
  el.innerHTML = `<span class="hs-dot"></span><span class="hs-lbl">${h.label}</span>`;
  el.addEventListener('click', () => openHot(i));
  hot.appendChild(el);
  return { el, pos: new THREE.Vector3(...h.pos) };
});

function openHot(i) {
  const h = HOTS[i];
  if (h.bonnet && !panelState.bonnet) togglePanel('bonnet', true);
  flyTo(h.cam.p, h.cam.t, !!h.interior);
  $('#hotcard-title').textContent = h.title;
  $('#hotcard-text').textContent = h.text;
  hotcard.hidden = false;
}

const _v = new THREE.Vector3();
function updateHots() {
  car.updateMatrixWorld();
  const w = stage.clientWidth;
  const hgt = stage.clientHeight;
  for (const h of hotEls) {
    _v.copy(h.pos);
    car.localToWorld(_v);
    _v.project(camera);
    const x = (_v.x * 0.5 + 0.5) * w;
    const y = (-_v.y * 0.5 + 0.5) * hgt;
    h.el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    h.el.style.opacity = _v.z < 1 ? '1' : '0';
  }
}

// ---------- page modes (controls which section owns the canvas) ----------
let mode = 'hero';
let hotOn = true;
function refreshHotVis() {
  hot.classList.toggle('show', hotOn && (mode === 'hero' || mode === 'showroom'));
}
function setMode(m) {
  if (m === mode) return;
  const prev = mode;
  mode = m;
  canvas.style.pointerEvents = m === 'hero' || m === 'showroom' ? 'auto' : 'none';
  stage.classList.toggle('off', m === 'off');
  if (m !== 'hero' && m !== 'showroom') hotcard.hidden = true;
  refreshHotVis();
  if (m === 'journey') journeyST.animation && tl.progress(journeyST.progress);
  if (m === 'showroom' && prev === 'journey') flyTo(VIEWS.hero.p, VIEWS.hero.t);
}
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) setMode(e.target.dataset.mode); }),
  { rootMargin: '-45% 0px -45% 0px' }
);

// ---------- rendering ----------
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 640 ? 52 : 38;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function frame() {
  requestAnimationFrame(frame);
  if (mode === 'off') return;
  controls.update();
  renderer.render(scene, camera);
  updateHots();
}

// ---------- UI wiring ----------
function pressGroup(btn) {
  btn.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
}

function wireUI() {
  $$('[data-color]').forEach((b) => b.addEventListener('click', () => { tweenColor(M.paint, b.dataset.color); pressGroup(b); }));
  $$('[data-wheel]').forEach((b) => b.addEventListener('click', () => {
    wheels.forEach((w) => buildSpokes(w, b.dataset.wheel));
    pressGroup(b);
  }));
  $$('[data-rim]').forEach((b) => b.addEventListener('click', () => { tweenColor(M.rim, b.dataset.rim); pressGroup(b); }));
  $$('[data-trim]').forEach((b) => b.addEventListener('click', () => { tweenColor(M.leather, b.dataset.trim); pressGroup(b); }));
  $$('[data-panel]').forEach((b) => b.addEventListener('click', () => togglePanel(b.dataset.panel)));
  $('[data-action="close-all"]').addEventListener('click', () => ['doors', 'bonnet', 'boot'].forEach((n) => togglePanel(n, false)));
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    const v = VIEWS[b.dataset.view];
    flyTo(v.p, v.t, !!v.int);
  }));
  const autoBtn = $('[data-tool="auto"]');
  autoBtn.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 1.6;
    autoBtn.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  const hotBtn = $('[data-tool="hotspots"]');
  hotBtn.addEventListener('click', () => {
    hotOn = !hotOn;
    hotBtn.setAttribute('aria-pressed', String(hotOn));
    refreshHotVis();
  });
  $('[data-tool="fullscreen"]').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e) { console.warn('Fullscreen unavailable', e); }
  });
  $('#hotcard-close').addEventListener('click', () => { hotcard.hidden = true; });
  $$('[data-mode]').forEach((s) => io.observe(s));
}

// ---------- boot with build progress ----------
function setProgress(p) {
  $('#bar').style.width = p + '%';
  $('#pct').textContent = Math.round(p) + '%';
}

async function startApp() {
  setProgress(10);
  await nextFrame();
  setProgress(40);
  await nextFrame();
  setProgress(70);
  await nextFrame();
  buildHotspotsReady();
  setProgress(90);
  resize();
  applyS();
  wireUI();
  gsap.fromTo(camera.position, { x: 11, y: 4, z: 10 }, {
    x: S.px, y: S.py, z: S.pz, duration: 2.4, ease: 'power3.out',
    onUpdate: () => controls.update(),
  });
  setProgress(100);
  requestAnimationFrame(frame);
  window.__APEX_READY = true;
  setTimeout(() => $('#loader').classList.add('done'), 300);
}

function buildHotspotsReady() { /* hotspots are built at module load; kept as a progress step */ }

startApp().catch((err) => {
  console.error(err);
  document.body.classList.add('no-webgl');
  $('#loader').classList.add('done');
});
