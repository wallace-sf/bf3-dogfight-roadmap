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
