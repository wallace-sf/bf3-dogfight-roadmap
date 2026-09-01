import * as THREE from 'three';

export function buildJet() {
  const group = new THREE.Group();
  group.name = 'jet';

  const bodyGeometry = new THREE.ConeGeometry(1, 4, 8);
  bodyGeometry.rotateX(Math.PI / 2);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3399ff });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);

  const wingGeometry = new THREE.BoxGeometry(6, 0.1, 1.2);
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1d1d });
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  wings.position.z = 0.2;
  group.add(wings);

  return group;
}
