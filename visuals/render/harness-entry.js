import * as THREE from 'three';
import { buildJet } from '../scenes/shared/jet.js';
import { tacticalCameraPosition, chaseCameraPosition } from '../scenes/shared/cameraRigs.js';
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
scene.background = new THREE.Color(0x87ceeb);
scene.add(new THREE.GridHelper(200, 20));
scene.add(new THREE.AmbientLight(0x404040));

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(50, 100, 50);
scene.add(sun);

const jet = buildJet();
scene.add(jet);

// Visual-only scale applied in the tactical (storyboard) view. The trajectory
// spans ~90 units while the jet model is ~6 units long, so at a framing that
// contains the whole path the jet renders as a handful of pixels and its
// pitch/roll geometry — the entire point of the storyboard — is unreadable.
// This is legibility, not physical accuracy: the chase view keeps scale 1.
const TACTICAL_JET_SCALE = 3.5;

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

const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);

// Invariant across the whole storyboard loop: depends only on the static
// keyframes, so compute it once rather than on every frame.
// The jet model's largest half-extent is its 6-unit wingspan (half = 3); pad
// the framing by that, scaled, so the jet never clips at the frame edge.
const tacticalRig = tacticalCameraPosition(keyframes, { padding: TACTICAL_JET_SCALE * 3 });

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

  const tactical = cameraMode === 'tatica';
  jet.scale.setScalar(tactical ? TACTICAL_JET_SCALE : 1);
  // Storyboard-only overlays. In the chase view the camera looks straight down
  // the path, so the trajectory line projects onto the jet as a distracting
  // vertical bar rather than reading as a flight path; the drop lines likewise
  // need the ground grid, which the chase camera does not have in frame.
  trajectory.visible = tactical;
  dropLines.visible = tactical;

  const rig = tactical ? tacticalRig : chaseCameraPosition(frame.pos, forward.toArray());

  camera.position.set(rig.position[0], rig.position[1], rig.position[2]);
  camera.lookAt(rig.lookAt[0], rig.lookAt[1], rig.lookAt[2]);

  renderer.render(scene, camera);
}

window.__applyFrame = applyFrame;
window.__ready = true;
