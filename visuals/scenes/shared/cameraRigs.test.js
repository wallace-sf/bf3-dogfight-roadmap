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
