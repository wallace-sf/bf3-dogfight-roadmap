import * as THREE from 'three';
import { buildJet } from '../scenes/shared/jet.js';
import {
  tacticalCameraPosition,
  overviewCameraPosition,
  chaseCameraPosition,
} from '../scenes/shared/cameraRigs.js';
import { interpolateKeyframes } from '../scenes/shared/interpolate.js';

const params = new URLSearchParams(window.location.search);
const sceneId = params.get('scene');
const sceneModule = await import(`../scenes/${sceneId}.js`);
const keyframes = sceneModule.default.keyframes;

const firstT = keyframes[0].t;
const lastT = keyframes[keyframes.length - 1].t;

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(800, 600);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5b6b7d);

// Ground grid: large and low-contrast, so it reads as a reference plane without
// competing with the jet or the trajectory line.
const grid = new THREE.GridHelper(600, 30, 0x7d8c9c, 0x6b7a88);
scene.add(grid);

scene.add(new THREE.AmbientLight(0xb0bcc8, 1.4));

const sun = new THREE.DirectionalLight(0xfff4e6, 2.2);
sun.position.set(60, 120, 40);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbcd0e0, 0x2b3038, 0.6));

const jet = buildJet();
scene.add(jet);

// The tactical camera now sits close to the jet per keyframe, so the model
// renders at a readable size at scale 1 — no artificial storyboard-only scaling.

// Trajectory line: samples the same interpolation the jet follows, so the
// storyboard shows the diagonal plane being flown, not just an isolated dot.
const TRAJECTORY_SAMPLES = 160;
const trajectoryPoints = [];
for (let i = 0; i <= TRAJECTORY_SAMPLES; i += 1) {
  const t = firstT + ((lastT - firstT) * i) / TRAJECTORY_SAMPLES;
  const { pos } = interpolateKeyframes(keyframes, t);
  trajectoryPoints.push(new THREE.Vector3(pos[0], pos[1], pos[2]));
}
const trajectory = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(trajectoryPoints),
  new THREE.LineBasicMaterial({ color: 0xff4400 })
);
scene.add(trajectory);

// Vertical drop lines from each keyframe down to the ground grid, to hint at
// altitude. Kept in the same group as the trajectory so both toggle together.
const dropPoints = [];
for (const keyframe of keyframes) {
  dropPoints.push(new THREE.Vector3(keyframe.pos[0], keyframe.pos[1], keyframe.pos[2]));
  dropPoints.push(new THREE.Vector3(keyframe.pos[0], 0, keyframe.pos[2]));
}
const dropLines = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dropPoints),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
);
scene.add(dropLines);

const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 2000);

// The panorama (opening) shot depends only on the static keyframes.
const overviewRig = overviewCameraPosition(keyframes);

/**
 * Unit direction of travel at time `t`, via a central finite difference on the
 * interpolated path. Falls back to +Z if the path is degenerate at this point.
 */
function forwardAt(t) {
  const dt = 0.05;
  const before = interpolateKeyframes(keyframes, Math.max(firstT, t - dt));
  const after = interpolateKeyframes(keyframes, Math.min(lastT, t + dt));
  const raw = new THREE.Vector3(
    after.pos[0] - before.pos[0],
    after.pos[1] - before.pos[1],
    after.pos[2] - before.pos[2]
  );
  if (raw.lengthSq() === 0) return new THREE.Vector3(0, 0, 1);
  return raw.normalize();
}

const scratch = new THREE.Vector3();

function applyFrame(t, cameraMode) {
  const frame = interpolateKeyframes(keyframes, t);
  const forward = forwardAt(t);

  jet.position.set(frame.pos[0], frame.pos[1], frame.pos[2]);

  // Orientation = path-derived heading/climb, then the scene-authored pitch and
  // roll applied as offsets on top of it.
  //
  // The jet model's nose is local +Z (jet.js rotates the cone's tip onto +Z).
  // Object3D.lookAt() aims local -Z at the target for cameras and lights, but
  // for a plain Object3D it swaps the matrix arguments, so local +Z ends up
  // pointing AT the target — verified empirically. Looking one unit ahead along
  // the path therefore puts the nose on the direction of travel.
  scratch.copy(jet.position).add(forward);
  jet.lookAt(scratch);

  // Scene `pitch` is an additive nose attitude on top of the path's own climb
  // angle (angle of attack / deliberate stick input), not a replacement for it.
  // Positive = nose up; a positive rotation about local +X pitches the nose
  // down in this frame, hence the negation. Roll then banks about the nose axis
  // (local +Z), applied after pitch so it rolls around the actual nose.
  jet.rotateX(-THREE.MathUtils.degToRad(frame.pitch));
  jet.rotateZ(THREE.MathUtils.degToRad(frame.roll));

  const panorama = cameraMode === 'panorama';
  const tactical = cameraMode === 'tatica' || panorama;

  // The panorama frames the whole path, so scale 1 leaves the jet a dot. Blow
  // it up purely for that opening shot; every other view keeps true scale.
  jet.scale.setScalar(panorama ? 3 : 1);
  // Storyboard-only overlays. In the chase view the camera looks straight down
  // the path, so the trajectory line projects onto the jet as a distracting
  // vertical bar rather than reading as a flight path; the drop lines likewise
  // need the ground grid, which the chase camera does not have in frame.
  trajectory.visible = tactical;
  dropLines.visible = tactical;

  let rig;
  if (panorama) {
    rig = overviewRig;
  } else if (tactical) {
    rig = tacticalCameraPosition({ pos: frame.pos }, forward.toArray());
  } else {
    rig = chaseCameraPosition(frame.pos, forward.toArray());
  }

  camera.position.set(rig.position[0], rig.position[1], rig.position[2]);
  camera.lookAt(rig.lookAt[0], rig.lookAt[1], rig.lookAt[2]);

  renderer.render(scene, camera);
}

window.__applyFrame = applyFrame;
window.__ready = true;
