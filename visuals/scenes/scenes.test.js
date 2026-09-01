import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValidScene } from './shared/assertValidScene.js';

const SCENES_DIR = path.dirname(fileURLToPath(import.meta.url));

// Every scene module in scenes/ (shared/ holds helpers, not scenes) gets the
// same structural invariants checked automatically — adding a module needs no
// new test file.
const sceneFiles = fs
  .readdirSync(SCENES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .sort();

test('there is at least one scene module to validate', () => {
  assert.ok(sceneFiles.length > 0, 'no scene modules found in scenes/');
});

for (const file of sceneFiles) {
  test(`${file} is a structurally valid scene`, async () => {
    const module = await import(path.join(SCENES_DIR, file));
    const scene = module.default;
    assertValidScene(scene, file);
    assert.equal(
      scene.id,
      path.basename(file, '.js'),
      `scene.id must match its filename (${file})`
    );
  });
}
