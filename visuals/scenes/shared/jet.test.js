import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normalizeJet, FIGHTER_LENGTH, FIGHTER_MODEL_URL } from './jet.js';

function boxModel(size, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]));
  mesh.position.set(position[0], position[1], position[2]);
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

test('FIGHTER_MODEL_URL points at the committed glb', () => {
  assert.equal(FIGHTER_MODEL_URL, '/assets/models/fighter.glb');
});

test('normalizeJet scales the model to the target nose-to-tail length', () => {
  const jet = normalizeJet(boxModel([10, 4, 20], [0, 0, 0]));
  const size = new THREE.Box3().setFromObject(jet).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.z - FIGHTER_LENGTH) < 1e-6, `z extent ${size.z}`);
  // Uniform scale: the 10:20 width:length ratio is preserved.
  assert.ok(Math.abs(size.x / size.z - 0.5) < 1e-6);
});

test('normalizeJet honors an explicit length', () => {
  const jet = normalizeJet(boxModel([2, 2, 8], [0, 0, 0]), { length: 4 });
  const size = new THREE.Box3().setFromObject(jet).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.z - 4) < 1e-6);
});

test('normalizeJet recenters an off-origin model on the world origin', () => {
  const jet = normalizeJet(boxModel([4, 4, 4], [100, -50, 25]));
  const center = new THREE.Box3().setFromObject(jet).getCenter(new THREE.Vector3());
  assert.ok(center.length() < 1e-6, `center ${center.toArray()}`);
});
