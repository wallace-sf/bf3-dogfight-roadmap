import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildJet } from './jet.js';

test('buildJet returns a named group', () => {
  const jet = buildJet();
  assert.ok(jet instanceof THREE.Group);
  assert.equal(jet.name, 'jet');
});

test('buildJet has the parts that make it read as a fighter', () => {
  const jet = buildJet();
  const names = jet.children.map((child) => child.name);
  for (const part of ['fuselage', 'nose', 'canopy', 'wings', 'tailfin', 'stabilizers']) {
    assert.ok(names.includes(part), `missing part: ${part}`);
  }
  assert.ok(jet.children.every((child) => child instanceof THREE.Mesh));
});

test('buildJet points its nose along local +Z', () => {
  const jet = buildJet();
  const nose = jet.children.find((child) => child.name === 'nose');
  const fuselage = jet.children.find((child) => child.name === 'fuselage');
  assert.ok(nose.position.z > fuselage.position.z, 'nose sits ahead of the fuselage');
});

test('buildJet wings are swept back from root to tip', () => {
  const jet = buildJet();
  const wings = jet.children.find((child) => child.name === 'wings');
  const pos = wings.geometry.getAttribute('position');
  let rootLeadingZ = -Infinity;
  let tipZ = Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (Math.abs(x) < 0.01) rootLeadingZ = Math.max(rootLeadingZ, z);
    if (Math.abs(x) > 1.5) tipZ = Math.min(tipZ, z);
  }
  assert.ok(rootLeadingZ > tipZ, 'wing root reaches further forward than the tip');
});
