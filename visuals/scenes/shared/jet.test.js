import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildJet } from './jet.js';

test('buildJet returns a named group with body and wing meshes', () => {
  const jet = buildJet();
  assert.ok(jet instanceof THREE.Group);
  assert.equal(jet.name, 'jet');
  assert.equal(jet.children.length, 2);
  assert.ok(jet.children.every((child) => child instanceof THREE.Mesh));
});
