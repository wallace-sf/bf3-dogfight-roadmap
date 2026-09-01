# Visualização 3D das Manobras — Módulo Piloto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static-render pipeline (three.js scenes + Puppeteer capture + ffmpeg GIF export) that produces a 3-frame storyboard and a looping GIF for the "Diagonal sustentada" maneuver (module 1), and embed them in that module's markdown.

**Architecture:** Maneuvers are described as plain-data keyframe lists consumed by pure, unit-testable interpolation/camera functions. A browser harness (native ES modules, no bundler) renders those functions with three.js; a Node/Puppeteer script drives that harness headlessly to capture PNG frames; a small export script turns the GIF frame sequence into a `.gif` via `ffmpeg-static`. Everything under `visuals/` is a dev-only toolchain — readers only ever see the committed PNG/GIF output referenced from markdown.

**Tech Stack:** Node.js (native ESM, `node --test` for unit tests), three.js (ES module build), Puppeteer (headless Chromium), ffmpeg-static.

**Spec:** `docs/superpowers/specs/2026-09-01-visualizacao-3d-manobras-design.md`

## Global Constraints

- Storyboard images use the **tactical** camera (fixed, framing the whole trajectory); the GIF uses the **chase** camera (follows behind/above the jet). Source: spec §"Modelo de dados da cena".
- Final artifacts live at `assets/maneuvers/<scene-id>/storyboard-1.png`, `storyboard-2.png`, `storyboard-3.png`, and `loop.gif`. Intermediate GIF frames live in a gitignored `assets/maneuvers/<scene-id>/frames/` directory — never committed. Source: spec §"Estrutura de pastas".
- `visuals/` is a self-contained Node package (`"type": "module"`) with its own `package.json`; its `node_modules/` is gitignored. Regenerating visuals requires `npm install` inside `visuals/` — this is expected to only affect course editors, not readers. Source: spec §"Riscos e decisões em aberto".
- No pixel-level automated testing. Validation for rendering steps is manual (visual check) plus concrete file-existence/format assertions (file exists, non-zero size, correct magic bytes) — never a vague "looks right" step. Source: spec §"Testing / validação".
- Keyframe field vocabulary matches the course's existing mental model: `speed`, `tendencia`, `comando`, plus `pos`/`pitch`/`roll` for geometry and `nota` for the storyboard caption. Source: spec §"Modelo de dados da cena".
- Scope is the module 1 pilot only ("01-diagonal-sustentada"). The other 7 modules are out of scope for this plan. Source: spec §"Não-objetivos".

---

## File Structure

```
visuals/
  package.json                       # Task 1
  .gitignore                         # Task 1
  scenes/
    shared/
      interpolate.js                 # Task 2
      interpolate.test.js            # Task 2
      cameraRigs.js                  # Task 3
      cameraRigs.test.js             # Task 3
      jet.js                         # Task 4
      jet.test.js                    # Task 4
    01-diagonal-sustentada.js        # Task 5
    01-diagonal-sustentada.test.js   # Task 5
  render/
    static-server.js                 # Task 6
    static-server.test.js            # Task 6
    harness.html                     # Task 7
    harness-entry.js                 # Task 7
    capture.js                       # Task 7
    export.js                        # Task 8
assets/
  maneuvers/
    01-diagonal-sustentada/
      storyboard-1.png                # Task 7 (generated)
      storyboard-2.png                # Task 7 (generated)
      storyboard-3.png                # Task 7 (generated)
      loop.gif                        # Task 8 (generated)
docs/modules/01-diagonal-sustentada.md  # Task 9 (modified)
```

---

### Task 1: Scaffold the `visuals/` toolchain package

**Files:**
- Create: `visuals/package.json`
- Create: `visuals/.gitignore`

**Interfaces:**
- Produces: an installable Node package at `visuals/` with `three`, `puppeteer`, `ffmpeg-static` as dependencies, ESM (`"type": "module"`) enabled, and a `test` script running `node --test`. All later tasks add files under `visuals/scenes/` and `visuals/render/` and rely on this package.json existing.

- [ ] **Step 1: Create the directory and package.json**

```json
{
  "name": "bf3-dogfight-visuals",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test scenes/shared/*.test.js scenes/*.test.js render/*.test.js"
  },
  "dependencies": {
    "three": "^0.160.0",
    "puppeteer": "^22.0.0",
    "ffmpeg-static": "^5.2.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore` for the toolchain**

```
node_modules/
```

- [ ] **Step 3: Install dependencies**

Run: `cd visuals && npm install`
Expected: `node_modules/` created, `package-lock.json` generated, no errors. Puppeteer will download a Chromium build — this can take a minute.

- [ ] **Step 4: Add repo-level ignore for generated frame intermediates**

Add this line to the root `.gitignore` (create the file if it doesn't exist yet):

```
assets/maneuvers/*/frames/
```

- [ ] **Step 5: Commit**

```bash
cd /home/wallace/Projects/bf3-dogfight-roadmap
git add visuals/package.json visuals/package-lock.json visuals/.gitignore .gitignore
git commit -m "chore: scaffold visuals/ 3D rendering toolchain"
```

---

### Task 2: Keyframe interpolation (pure function)

**Files:**
- Create: `visuals/scenes/shared/interpolate.js`
- Test: `visuals/scenes/shared/interpolate.test.js`

**Interfaces:**
- Consumes: nothing (pure function, no dependency on earlier tasks).
- Produces: `interpolateKeyframes(keyframes, t)` returning `{ pos: [x,y,z], pitch, roll, speed, tendencia, comando, nota }`. Keyframe shape consumed: `{ t, pos: [x,y,z], pitch, roll, speed, tendencia, comando, nota }`. Used by Task 5 (scene data), Task 7 (harness-entry.js).

- [ ] **Step 1: Write the failing tests**

```js
// visuals/scenes/shared/interpolate.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpolateKeyframes } from './interpolate.js';

const keyframes = [
  { t: 0, pos: [0, 100, 0], pitch: 0, roll: 30, speed: 310, tendencia: 'estável', comando: 'manter', nota: 'Entrada' },
  { t: 2.5, pos: [40, 90, 20], pitch: -5, roll: 30, speed: 300, tendencia: 'caindo', comando: 'AB curto', nota: 'Meio' },
  { t: 5, pos: [80, 100, 40], pitch: 0, roll: 30, speed: 312, tendencia: 'subindo', comando: 'conter', nota: 'Saída' },
];

test('returns exact keyframe values at t equal to a keyframe', () => {
  const frame = interpolateKeyframes(keyframes, 2.5);
  assert.deepEqual(frame.pos, [40, 90, 20]);
  assert.equal(frame.speed, 300);
  assert.equal(frame.comando, 'AB curto');
});

test('linearly interpolates numeric fields between keyframes', () => {
  const frame = interpolateKeyframes(keyframes, 1.25);
  assert.equal(frame.pos[0], 20);
  assert.equal(frame.pos[1], 95);
  assert.equal(frame.pos[2], 10);
  assert.equal(frame.speed, 305);
  assert.equal(frame.pitch, -2.5);
});

test('steps categorical fields to the segment start keyframe', () => {
  const frame = interpolateKeyframes(keyframes, 1.25);
  assert.equal(frame.tendencia, 'estável');
  assert.equal(frame.comando, 'manter');
});

test('clamps t before the first keyframe', () => {
  const frame = interpolateKeyframes(keyframes, -10);
  assert.deepEqual(frame.pos, [0, 100, 0]);
});

test('clamps t after the last keyframe', () => {
  const frame = interpolateKeyframes(keyframes, 999);
  assert.deepEqual(frame.pos, [80, 100, 40]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd visuals && node --test scenes/shared/interpolate.test.js`
Expected: FAIL — `interpolate.js` does not exist / `interpolateKeyframes` is not defined.

- [ ] **Step 3: Implement `interpolate.js`**

```js
// visuals/scenes/shared/interpolate.js
export function interpolateKeyframes(keyframes, t) {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (t <= first.t) return toFrame(first);
  if (t >= last.t) return toFrame(last);

  let k0 = first;
  let k1 = last;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    if (keyframes[i].t <= t && t <= keyframes[i + 1].t) {
      k0 = keyframes[i];
      k1 = keyframes[i + 1];
      break;
    }
  }

  const alpha = (t - k0.t) / (k1.t - k0.t);
  return {
    pos: [
      lerp(k0.pos[0], k1.pos[0], alpha),
      lerp(k0.pos[1], k1.pos[1], alpha),
      lerp(k0.pos[2], k1.pos[2], alpha),
    ],
    pitch: lerp(k0.pitch, k1.pitch, alpha),
    roll: lerp(k0.roll, k1.roll, alpha),
    speed: lerp(k0.speed, k1.speed, alpha),
    tendencia: k0.tendencia,
    comando: k0.comando,
    nota: k0.nota,
  };
}

function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

function toFrame(k) {
  return {
    pos: [...k.pos],
    pitch: k.pitch,
    roll: k.roll,
    speed: k.speed,
    tendencia: k.tendencia,
    comando: k.comando,
    nota: k.nota,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd visuals && node --test scenes/shared/interpolate.test.js`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add visuals/scenes/shared/interpolate.js visuals/scenes/shared/interpolate.test.js
git commit -m "feat: add keyframe interpolation for maneuver scenes"
```

---

### Task 3: Camera rigs (pure functions)

**Files:**
- Create: `visuals/scenes/shared/cameraRigs.js`
- Test: `visuals/scenes/shared/cameraRigs.test.js`

**Interfaces:**
- Consumes: nothing (pure functions).
- Produces: `tacticalCameraPosition(keyframes)` and `chaseCameraPosition(currentPos, forward, options)`, both returning `{ position: [x,y,z], lookAt: [x,y,z] }`. Used by Task 7 (`harness-entry.js`).

- [ ] **Step 1: Write the failing tests**

```js
// visuals/scenes/shared/cameraRigs.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tacticalCameraPosition, chaseCameraPosition } from './cameraRigs.js';

const keyframes = [
  { t: 0, pos: [0, 100, 0] },
  { t: 2.5, pos: [40, 90, 20] },
  { t: 5, pos: [80, 100, 40] },
];

test('tactical camera centers on the trajectory bounding box and looks at it', () => {
  const rig = tacticalCameraPosition(keyframes);
  assert.equal(rig.lookAt[0], 40);
  assert.equal(rig.lookAt[1], 95);
  assert.equal(rig.lookAt[2], 20);
  assert.ok(rig.position[1] > rig.lookAt[1], 'camera sits above the trajectory');
});

test('chase camera sits behind and above the jet along the forward vector', () => {
  const rig = chaseCameraPosition([10, 50, 0], [1, 0, 0], { distanceBehind: 10, heightAbove: 4 });
  assert.deepEqual(rig.position, [0, 54, 0]);
  assert.deepEqual(rig.lookAt, [20, 50, 0]);
});

test('chase camera uses default distance and height when options are omitted', () => {
  const rig = chaseCameraPosition([0, 0, 0], [0, 0, 1]);
  assert.deepEqual(rig.position, [0, 4, -15]);
  assert.deepEqual(rig.lookAt, [0, 0, 10]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd visuals && node --test scenes/shared/cameraRigs.test.js`
Expected: FAIL — `cameraRigs.js` does not exist.

- [ ] **Step 3: Implement `cameraRigs.js`**

```js
// visuals/scenes/shared/cameraRigs.js
export function tacticalCameraPosition(keyframes) {
  const xs = keyframes.map((k) => k.pos[0]);
  const ys = keyframes.map((k) => k.pos[1]);
  const zs = keyframes.map((k) => k.pos[2]);

  const center = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ];

  const spread = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...zs) - Math.min(...zs),
    20
  );

  return {
    position: [center[0], center[1] + spread, center[2] + spread],
    lookAt: center,
  };
}

export function chaseCameraPosition(currentPos, forward, options = {}) {
  const { distanceBehind = 15, heightAbove = 4 } = options;

  const position = [
    currentPos[0] - forward[0] * distanceBehind,
    currentPos[1] - forward[1] * distanceBehind + heightAbove,
    currentPos[2] - forward[2] * distanceBehind,
  ];
  const lookAt = [
    currentPos[0] + forward[0] * 10,
    currentPos[1] + forward[1] * 10,
    currentPos[2] + forward[2] * 10,
  ];

  return { position, lookAt };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd visuals && node --test scenes/shared/cameraRigs.test.js`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add visuals/scenes/shared/cameraRigs.js visuals/scenes/shared/cameraRigs.test.js
git commit -m "feat: add tactical and chase camera rigs"
```

---

### Task 4: Stylized jet model

**Files:**
- Create: `visuals/scenes/shared/jet.js`
- Test: `visuals/scenes/shared/jet.test.js`

**Interfaces:**
- Consumes: `three` (npm package, installed in Task 1).
- Produces: `buildJet()` returning a `THREE.Group` named `'jet'` with a body mesh and a wing mesh as children. Used by Task 7 (`harness-entry.js`).

- [ ] **Step 1: Write the failing test**

```js
// visuals/scenes/shared/jet.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildJet } from './jet.js';

test('buildJet returns a named group with body and wing meshes', () => {
  const jet = buildJet();
  assert.ok(jet instanceof THREE.Group);
  assert.equal(jet.name, 'jet');
  assert.equal(jet.children.length, 2);
  assert.ok(jet.children.every((child) => child instanceof THREE.Mesh));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd visuals && node --test scenes/shared/jet.test.js`
Expected: FAIL — `jet.js` does not exist.

- [ ] **Step 3: Implement `jet.js`**

```js
// visuals/scenes/shared/jet.js
import * as THREE from 'three';

export function buildJet() {
  const group = new THREE.Group();
  group.name = 'jet';

  const bodyGeometry = new THREE.ConeGeometry(1, 4, 8);
  bodyGeometry.rotateX(Math.PI / 2);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3399ff });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);

  const wingGeometry = new THREE.BoxGeometry(6, 0.1, 1.2);
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1d1d });
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  wings.position.z = 0.2;
  group.add(wings);

  return group;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd visuals && node --test scenes/shared/jet.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visuals/scenes/shared/jet.js visuals/scenes/shared/jet.test.js
git commit -m "feat: add stylized jet model"
```

---

### Task 5: Module 1 scene data — "Diagonal sustentada"

**Files:**
- Create: `visuals/scenes/01-diagonal-sustentada.js`
- Test: `visuals/scenes/01-diagonal-sustentada.test.js`

**Interfaces:**
- Consumes: nothing beyond plain data; `interpolateKeyframes` (Task 2) is used only in the test, to sanity-check the data is well-formed.
- Produces: a default-exported object `{ id: '01-diagonal-sustentada', keyframes: [...] }`. Consumed by Task 7 (`harness-entry.js`, via dynamic `import`) and Task 7/8 (`capture.js`/`export.js`, via static `import` to read `keyframes.length` / `id`).

- [ ] **Step 1: Write the failing test**

```js
// visuals/scenes/01-diagonal-sustentada.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import scene from './01-diagonal-sustentada.js';
import { interpolateKeyframes } from './shared/interpolate.js';

test('scene has the expected id and three keyframes in ascending time order', () => {
  assert.equal(scene.id, '01-diagonal-sustentada');
  assert.equal(scene.keyframes.length, 3);
  const times = scene.keyframes.map((k) => k.t);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('every keyframe has the full field set required by the storyboard caption', () => {
  for (const keyframe of scene.keyframes) {
    for (const field of ['t', 'pos', 'pitch', 'roll', 'speed', 'tendencia', 'comando', 'nota']) {
      assert.ok(field in keyframe, `missing field "${field}"`);
    }
  }
});

test('scene keyframes are usable by interpolateKeyframes', () => {
  const frame = interpolateKeyframes(scene.keyframes, scene.keyframes[1].t);
  assert.deepEqual(frame.pos, scene.keyframes[1].pos);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd visuals && node --test scenes/01-diagonal-sustentada.test.js`
Expected: FAIL — `01-diagonal-sustentada.js` does not exist.

- [ ] **Step 3: Implement the scene data**

Keyframes encode the maneuver as described in `docs/modules/01-diagonal-sustentada.md`: entering a stable diagonal plane, a brief speed dip corrected mid-curve, exiting stabilized.

```js
// visuals/scenes/01-diagonal-sustentada.js
export default {
  id: '01-diagonal-sustentada',
  keyframes: [
    {
      t: 0,
      pos: [0, 100, 0],
      pitch: 0,
      roll: 30,
      speed: 310,
      tendencia: 'estável',
      comando: 'manter',
      nota: 'Entrada no plano diagonal',
    },
    {
      t: 2.5,
      pos: [40, 90, 20],
      pitch: -5,
      roll: 30,
      speed: 300,
      tendencia: 'caindo',
      comando: 'AB curto',
      nota: 'Meio da curva — corrige leve queda',
    },
    {
      t: 5,
      pos: [80, 100, 40],
      pitch: 0,
      roll: 30,
      speed: 312,
      tendencia: 'subindo',
      comando: 'conter',
      nota: 'Saída, plano estabilizado',
    },
  ],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd visuals && node --test scenes/01-diagonal-sustentada.test.js`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add visuals/scenes/01-diagonal-sustentada.js visuals/scenes/01-diagonal-sustentada.test.js
git commit -m "feat: add module 1 maneuver scene data"
```

---

### Task 6: Static file server for the browser harness

**Files:**
- Create: `visuals/render/static-server.js`
- Test: `visuals/render/static-server.test.js`

**Interfaces:**
- Consumes: nothing beyond Node built-ins.
- Produces: `startServer()` returning a `Promise<http.Server>` already listening on an OS-assigned port, serving files relative to `visuals/` (so `/render/harness.html`, `/scenes/*.js`, and `/node_modules/three/...` all resolve). Used by Task 7 (`capture.js`).

- [ ] **Step 1: Write the failing test**

```js
// visuals/render/static-server.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './static-server.js';

test('serves a known file from the visuals/ root with the right content type', async () => {
  const server = await startServer();
  const port = server.address().port;

  const response = await fetch(`http://localhost:${port}/package.json`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.ok(body.includes('bf3-dogfight-visuals'));

  await new Promise((resolve) => server.close(resolve));
});

test('returns 404 for a missing file', async () => {
  const server = await startServer();
  const port = server.address().port;

  const response = await fetch(`http://localhost:${port}/does-not-exist.js`);
  assert.equal(response.status, 404);

  await new Promise((resolve) => server.close(resolve));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd visuals && node --test render/static-server.test.js`
Expected: FAIL — `static-server.js` does not exist.

- [ ] **Step 3: Implement `static-server.js`**

```js
// visuals/render/static-server.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RENDER_DIR = path.dirname(fileURLToPath(import.meta.url));
const VISUALS_ROOT = path.resolve(RENDER_DIR, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
};

export function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(VISUALS_ROOT, decodeURIComponent(urlPath));

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(0, () => resolve(server));
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd visuals && node --test render/static-server.test.js`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add visuals/render/static-server.js visuals/render/static-server.test.js
git commit -m "feat: add static file server for the rendering harness"
```

---

### Task 7: Browser harness + Puppeteer capture script (generates the storyboard PNGs)

**Files:**
- Create: `visuals/render/harness.html`
- Create: `visuals/render/harness-entry.js`
- Create: `visuals/render/capture.js`

**Interfaces:**
- Consumes: `buildJet` (Task 4), `tacticalCameraPosition`/`chaseCameraPosition` (Task 3), `interpolateKeyframes` (Task 2), scene modules shaped like Task 5's output, `startServer` (Task 6).
- Produces: running `node render/capture.js <scene-id> storyboard` writes `assets/maneuvers/<scene-id>/storyboard-1.png` .. `storyboard-N.png` (one per keyframe) directly. Running `node render/capture.js <scene-id> gif` writes `assets/maneuvers/<scene-id>/frames/frame-0000.png` .. `frame-NNNN.png` (15 fps). Task 8 (`export.js`) consumes the `frames/` directory this produces.

This task has no automated unit test — it is validated by actually running the capture pipeline and checking the output files exist and are non-trivial in size, per the spec's "no pixel-level testing" constraint.

- [ ] **Step 1: Write the HTML harness page**

```html
<!-- visuals/render/harness.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Maneuver render harness</title>
  <style>
    html, body { margin: 0; background: #87ceeb; }
  </style>
  <script type="importmap">
    { "imports": { "three": "/node_modules/three/build/three.module.js" } }
  </script>
</head>
<body>
  <canvas id="canvas" width="800" height="600"></canvas>
  <script type="module" src="/render/harness-entry.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the browser-side rendering entry point**

```js
// visuals/render/harness-entry.js
import * as THREE from 'three';
import { buildJet } from '../scenes/shared/jet.js';
import { tacticalCameraPosition, chaseCameraPosition } from '../scenes/shared/cameraRigs.js';
import { interpolateKeyframes } from '../scenes/shared/interpolate.js';

const params = new URLSearchParams(window.location.search);
const sceneId = params.get('scene');
const sceneModule = await import(`../scenes/${sceneId}.js`);
const keyframes = sceneModule.default.keyframes;

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(800, 600);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.add(new THREE.GridHelper(200, 20));
scene.add(new THREE.AmbientLight(0x404040));

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(50, 100, 50);
scene.add(sun);

const jet = buildJet();
scene.add(jet);

const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);

function applyFrame(t, cameraMode) {
  const frame = interpolateKeyframes(keyframes, t);
  jet.position.set(frame.pos[0], frame.pos[1], frame.pos[2]);
  jet.rotation.set(
    THREE.MathUtils.degToRad(frame.pitch),
    0,
    THREE.MathUtils.degToRad(frame.roll)
  );

  let rig;
  if (cameraMode === 'tatica') {
    rig = tacticalCameraPosition(keyframes);
  } else {
    const firstT = keyframes[0].t;
    const lastT = keyframes[keyframes.length - 1].t;
    const dt = 0.05;
    const before = interpolateKeyframes(keyframes, Math.max(firstT, t - dt));
    const after = interpolateKeyframes(keyframes, Math.min(lastT, t + dt));
    const rawForward = [
      after.pos[0] - before.pos[0],
      after.pos[1] - before.pos[1],
      after.pos[2] - before.pos[2],
    ];
    const length = Math.hypot(...rawForward) || 1;
    const forward = rawForward.map((v) => v / length);
    rig = chaseCameraPosition(frame.pos, forward);
  }

  camera.position.set(rig.position[0], rig.position[1], rig.position[2]);
  camera.lookAt(rig.lookAt[0], rig.lookAt[1], rig.lookAt[2]);

  renderer.render(scene, camera);
}

window.__applyFrame = applyFrame;
window.__ready = true;
```

- [ ] **Step 3: Write the Puppeteer capture script**

```js
// visuals/render/capture.js
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './static-server.js';

const RENDER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(RENDER_DIR, '..', '..');

const [, , sceneId, mode] = process.argv;
if (!sceneId || !['storyboard', 'gif'].includes(mode)) {
  console.error('Usage: node capture.js <scene-id> <storyboard|gif>');
  process.exit(1);
}

const sceneModule = await import(`../scenes/${sceneId}.js`);
const keyframes = sceneModule.default.keyframes;

const maneuverDir = path.join(REPO_ROOT, 'assets', 'maneuvers', sceneId);
const outDir = mode === 'gif' ? path.join(maneuverDir, 'frames') : maneuverDir;
fs.mkdirSync(outDir, { recursive: true });

const server = await startServer();
const { port } = server.address();

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 600 });
await page.goto(`http://localhost:${port}/render/harness.html?scene=${sceneId}`);
await page.waitForFunction(() => window.__ready === true);

const canvas = await page.$('#canvas');
const cameraMode = mode === 'storyboard' ? 'tatica' : 'chase';

if (mode === 'storyboard') {
  for (let i = 0; i < keyframes.length; i += 1) {
    await page.evaluate(
      (time, camMode) => window.__applyFrame(time, camMode),
      keyframes[i].t,
      cameraMode
    );
    await canvas.screenshot({ path: path.join(outDir, `storyboard-${i + 1}.png`) });
  }
  console.log(`Wrote ${keyframes.length} storyboard frames to ${outDir}`);
} else {
  const fps = 15;
  const duration = keyframes[keyframes.length - 1].t;
  const totalFrames = Math.round(duration * fps);
  for (let f = 0; f <= totalFrames; f += 1) {
    const t = f / fps;
    await page.evaluate(
      (time, camMode) => window.__applyFrame(time, camMode),
      t,
      cameraMode
    );
    await canvas.screenshot({ path: path.join(outDir, `frame-${String(f).padStart(4, '0')}.png`) });
  }
  console.log(`Wrote ${totalFrames + 1} gif frames to ${outDir}`);
}

await browser.close();
await new Promise((resolve) => server.close(resolve));
```

- [ ] **Step 4: Run the storyboard capture and verify output**

Run:
```bash
cd visuals
node render/capture.js 01-diagonal-sustentada storyboard
ls -la ../assets/maneuvers/01-diagonal-sustentada/
```
Expected: `storyboard-1.png`, `storyboard-2.png`, `storyboard-3.png` all exist and each is larger than a few KB (a blank/broken render is typically under 1KB). Open each file to confirm a blue jet shape is visible against the sky-colored background from a wide external angle.

- [ ] **Step 5: Run the gif-frame capture and verify output**

Run:
```bash
cd visuals
node render/capture.js 01-diagonal-sustentada gif
ls ../assets/maneuvers/01-diagonal-sustentada/frames/ | wc -l
```
Expected: 76 frame files (`frame-0000.png` through `frame-0075.png`, since the scene's duration is 5s at 15fps). Open one or two frames to confirm the camera is now positioned behind/above the jet (chase view), not the wide tactical view.

- [ ] **Step 6: Commit**

```bash
git add visuals/render/harness.html visuals/render/harness-entry.js visuals/render/capture.js assets/maneuvers/01-diagonal-sustentada/storyboard-1.png assets/maneuvers/01-diagonal-sustentada/storyboard-2.png assets/maneuvers/01-diagonal-sustentada/storyboard-3.png
git commit -m "feat: add rendering harness and capture script, generate module 1 storyboard"
```

Note: the `frames/` directory is intentionally not committed — it is covered by the root `.gitignore` entry added in Task 1.

---

### Task 8: GIF export

**Files:**
- Create: `visuals/render/export.js`

**Interfaces:**
- Consumes: the `assets/maneuvers/<scene-id>/frames/frame-NNNN.png` sequence produced by Task 7's capture script; `ffmpeg-static` (installed in Task 1).
- Produces: `assets/maneuvers/<scene-id>/loop.gif`. Consumed by Task 9 (embedded in the module markdown).

No automated unit test (shells out to a real ffmpeg binary against real frame files) — validated by running it against the frames generated in Task 7 and checking the resulting file's format and size.

- [ ] **Step 1: Implement `export.js`**

```js
// visuals/render/export.js
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RENDER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(RENDER_DIR, '..', '..');

const [, , sceneId] = process.argv;
if (!sceneId) {
  console.error('Usage: node export.js <scene-id>');
  process.exit(1);
}

const maneuverDir = path.join(REPO_ROOT, 'assets', 'maneuvers', sceneId);
const framesDir = path.join(maneuverDir, 'frames');
const palettePath = path.join(framesDir, 'palette.png');
const outputGif = path.join(maneuverDir, 'loop.gif');

execFileSync(ffmpegPath, [
  '-y',
  '-framerate', '15',
  '-i', path.join(framesDir, 'frame-%04d.png'),
  '-vf', 'palettegen',
  palettePath,
]);

execFileSync(ffmpegPath, [
  '-y',
  '-framerate', '15',
  '-i', path.join(framesDir, 'frame-%04d.png'),
  '-i', palettePath,
  '-lavfi', 'paletteuse',
  outputGif,
]);

console.log(`GIF written to ${outputGif}`);
```

- [ ] **Step 2: Run export and verify the GIF is valid**

Run:
```bash
cd visuals
node render/export.js 01-diagonal-sustentada
node -e "
const fs = require('node:fs');
const buf = fs.readFileSync('../assets/maneuvers/01-diagonal-sustentada/loop.gif');
console.log('size:', buf.length);
console.log('header:', buf.toString('ascii', 0, 6));
"
```
Expected: `header: GIF89a`, `size` greater than a few KB. Open `loop.gif` in an image viewer to confirm it plays the diagonal maneuver smoothly from the chase camera.

- [ ] **Step 3: Remove the now-unneeded frame intermediates**

```bash
rm -rf assets/maneuvers/01-diagonal-sustentada/frames
```

(They are gitignored and regenerable by re-running Task 7 Step 5 + this task, so deleting them locally is safe and keeps the working tree tidy.)

- [ ] **Step 4: Commit**

```bash
git add visuals/render/export.js assets/maneuvers/01-diagonal-sustentada/loop.gif
git commit -m "feat: add GIF export, generate module 1 loop GIF"
```

---

### Task 9: Embed the visualization in the module 1 markdown

**Files:**
- Modify: `docs/modules/01-diagonal-sustentada.md`

**Interfaces:**
- Consumes: the four image files generated in Tasks 7–8 at `assets/maneuvers/01-diagonal-sustentada/`.
- Produces: nothing consumed by later tasks — this is the final, reader-facing deliverable of the pilot.

- [ ] **Step 1: Read the current module file to find the insertion point**

```bash
sed -n '1,15p' docs/modules/01-diagonal-sustentada.md
```

Confirm the file's title (`# ...`) is the first line, so the new section can be inserted right after it.

- [ ] **Step 2: Insert the "Visualização" section right after the title**

Using the editor, insert this block immediately after the module's `# ` title line and before the existing body text:

```markdown

## Visualização

| Início | Meio | Saída |
|---|---|---|
| ![Início](../../assets/maneuvers/01-diagonal-sustentada/storyboard-1.png)<br>310, estável, —, manter | ![Meio](../../assets/maneuvers/01-diagonal-sustentada/storyboard-2.png)<br>300, caindo, —, AB curto | ![Saída](../../assets/maneuvers/01-diagonal-sustentada/storyboard-3.png)<br>312, subindo, —, conter |

![Manobra completa](../../assets/maneuvers/01-diagonal-sustentada/loop.gif)
```

- [ ] **Step 3: Verify the relative paths resolve**

Run:
```bash
ls docs/modules/../../assets/maneuvers/01-diagonal-sustentada/
```
Expected: lists `storyboard-1.png`, `storyboard-2.png`, `storyboard-3.png`, `loop.gif` — confirming the `../../assets/...` path used in the markdown (relative to `docs/modules/`) is correct.

- [ ] **Step 4: Preview the rendered markdown**

Push to a branch (or use a local markdown previewer) and open `docs/modules/01-diagonal-sustentada.md` on GitHub.com to confirm: the table renders with three images side by side, each caption appears on its own line under the image, and the GIF autoplays below the table.

- [ ] **Step 5: Commit**

```bash
git add docs/modules/01-diagonal-sustentada.md
git commit -m "docs: embed 3D storyboard and GIF in module 1"
```

---

## Post-plan: replicating to the remaining 7 modules

Out of scope for this plan (per spec §"Não-objetivos"). Once this pilot is validated end-to-end, each remaining module needs only: a new `visuals/scenes/NN-*.js` keyframe file (Task 5 pattern) plus re-running Tasks 7–9's *run* steps (no new code) with that scene's id.
