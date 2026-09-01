import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertValidScene } from './assertValidScene.js';

const validScene = {
  id: 'demo',
  keyframes: [
    {
      t: 0,
      pos: [0, 10, 0],
      pitch: 0,
      roll: 0,
      speed: 300,
      tendencia: 'estável',
      comando: 'manter',
      nota: 'a',
    },
    {
      t: 1,
      pos: [10, 10, 0],
      pitch: 0,
      roll: 0,
      speed: 300,
      tendencia: 'estável',
      comando: 'manter',
      nota: 'b',
    },
  ],
};

const clone = (mutate) => {
  const copy = JSON.parse(JSON.stringify(validScene));
  mutate(copy);
  return copy;
};

test('accepts a well-formed scene', () => {
  assertValidScene(validScene);
});

test('rejects a keyframe missing a caption field', () => {
  const scene = clone((s) => {
    delete s.keyframes[1].comando;
  });
  assert.throws(() => assertValidScene(scene), /comando/);
});

test('rejects keyframes out of ascending time order', () => {
  const scene = clone((s) => {
    s.keyframes[1].t = -1;
  });
  assert.throws(() => assertValidScene(scene), /ascending/);
});

test('rejects a malformed position', () => {
  const scene = clone((s) => {
    s.keyframes[0].pos = [0, 10];
  });
  assert.throws(() => assertValidScene(scene), /3 components/);
});
