import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tacticalCameraPosition,
  overviewCameraPosition,
  chaseCameraPosition,
} from './cameraRigs.js';

const keyframes = [
  { t: 0, pos: [0, 100, 0] },
  { t: 2.5, pos: [40, 90, 20] },
  { t: 5, pos: [80, 100, 40] },
];

test('tactical camera locks onto the given keyframe at a fixed distance', () => {
  const keyframe = { pos: [40, 90, 20] };
  const rig = tacticalCameraPosition(keyframe, [1, 0, 0], { distance: 16 });
  assert.deepEqual(rig.lookAt, [40, 90, 20]);
  const d = Math.hypot(
    rig.position[0] - keyframe.pos[0],
    rig.position[1] - keyframe.pos[1],
    rig.position[2] - keyframe.pos[2]
  );
  assert.ok(Math.abs(d - 16) < 1e-6, `expected distance 16, got ${d}`);
});

test('tactical camera sits above and behind the jet', () => {
  const keyframe = { pos: [0, 50, 0] };
  const rig = tacticalCameraPosition(keyframe, [0, 0, 1]);
  assert.ok(rig.position[1] > keyframe.pos[1], 'camera is above the jet');
  assert.ok(rig.position[2] < keyframe.pos[2], 'camera is behind the jet (nose is +Z)');
});

test('tactical camera survives a straight vertical flight path', () => {
  const rig = tacticalCameraPosition({ pos: [0, 0, 0] }, [0, 1, 0]);
  assert.ok(rig.position.every(Number.isFinite));
});

test('overview camera centers on the trajectory bounding box and looks at it', () => {
  const rig = overviewCameraPosition(keyframes);
  assert.deepEqual(rig.lookAt, [40, 95, 20]);
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
