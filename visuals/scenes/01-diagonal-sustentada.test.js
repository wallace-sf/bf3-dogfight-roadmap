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
