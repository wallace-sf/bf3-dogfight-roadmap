import { test } from 'node:test';
import assert from 'node:assert/strict';
import scene from './01-diagonal-sustentada.js';

// Generic structural invariants live in scenes.test.js, which runs
// assertValidScene against every scene module. What is left here is specific to
// this maneuver's authored content.

test('the storyboard has exactly the three beats the module text describes', () => {
  assert.equal(scene.id, '01-diagonal-sustentada');
  assert.equal(scene.keyframes.length, 3);
  assert.deepEqual(
    scene.keyframes.map((k) => k.tendencia),
    ['estável', 'caindo', 'subindo']
  );
});

test('the trajectory is a sustained diagonal: monotonic in x and z, dipping in y', () => {
  const [start, middle, end] = scene.keyframes;

  assert.ok(start.pos[0] < middle.pos[0] && middle.pos[0] < end.pos[0], 'x advances');
  assert.ok(start.pos[2] < middle.pos[2] && middle.pos[2] < end.pos[2], 'z advances');
  assert.ok(middle.pos[1] < start.pos[1], 'altitude dips through the middle');
  assert.equal(end.pos[1], start.pos[1], 'exits at the entry altitude');
});

test('bank is held constant through the maneuver (sustained plane)', () => {
  const rolls = new Set(scene.keyframes.map((k) => k.roll));
  assert.equal(rolls.size, 1, 'roll is constant across all keyframes');
  assert.ok([...rolls][0] !== 0, 'the jet is actually banked');
});
