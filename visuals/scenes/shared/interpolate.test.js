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
