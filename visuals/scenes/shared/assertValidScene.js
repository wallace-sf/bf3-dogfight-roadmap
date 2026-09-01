import assert from 'node:assert/strict';
import { interpolateKeyframes } from './interpolate.js';

export const REQUIRED_KEYFRAME_FIELDS = [
  't',
  'pos',
  'pitch',
  'roll',
  'speed',
  'tendencia',
  'comando',
  'nota',
];

/**
 * Structural invariants every scene module must satisfy for the render pipeline
 * (capture.js / harness-entry.js) and the storyboard captions to work.
 *
 * `label` is only used to make failures identifiable when this runs across many
 * scenes at once.
 */
export function assertValidScene(scene, label = scene && scene.id) {
  const where = label ? ` (${label})` : '';

  assert.ok(scene && typeof scene === 'object', `scene must be an object${where}`);
  assert.equal(typeof scene.id, 'string', `scene.id must be a string${where}`);
  assert.ok(scene.id.length > 0, `scene.id must not be empty${where}`);

  assert.ok(Array.isArray(scene.keyframes), `scene.keyframes must be an array${where}`);
  assert.ok(scene.keyframes.length >= 2, `scene needs at least 2 keyframes${where}`);

  for (const [i, keyframe] of scene.keyframes.entries()) {
    for (const field of REQUIRED_KEYFRAME_FIELDS) {
      assert.ok(field in keyframe, `keyframe ${i} missing field "${field}"${where}`);
    }
    assert.equal(typeof keyframe.t, 'number', `keyframe ${i} t must be a number${where}`);
    assert.ok(Array.isArray(keyframe.pos), `keyframe ${i} pos must be an array${where}`);
    assert.equal(keyframe.pos.length, 3, `keyframe ${i} pos must have 3 components${where}`);
    for (const component of keyframe.pos) {
      assert.equal(typeof component, 'number', `keyframe ${i} pos must be numeric${where}`);
    }
    for (const field of ['pitch', 'roll', 'speed']) {
      assert.equal(
        typeof keyframe[field],
        'number',
        `keyframe ${i} ${field} must be a number${where}`
      );
    }
  }

  const times = scene.keyframes.map((k) => k.t);
  assert.deepEqual(
    times,
    [...times].sort((a, b) => a - b),
    `keyframe times must be in ascending order${where}`
  );
  assert.equal(new Set(times).size, times.length, `keyframe times must be unique${where}`);

  // The scene must actually drive the interpolator the renderer uses.
  const mid = (times[0] + times[times.length - 1]) / 2;
  const frame = interpolateKeyframes(scene.keyframes, mid);
  assert.ok(Array.isArray(frame.pos), `interpolateKeyframes returned no pos${where}`);
  for (const component of frame.pos) {
    assert.ok(Number.isFinite(component), `interpolated pos must be finite${where}`);
  }
  assert.ok(Number.isFinite(frame.pitch), `interpolated pitch must be finite${where}`);
  assert.ok(Number.isFinite(frame.roll), `interpolated roll must be finite${where}`);
}
