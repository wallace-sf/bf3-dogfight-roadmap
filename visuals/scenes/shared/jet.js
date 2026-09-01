import * as THREE from 'three';

/**
 * A stylized low-poly fighter. Not a scale model — the goal is a silhouette that
 * reads unmistakably as a jet at ~150px: long fuselage, pointed nose, a raised
 * canopy, swept delta wings, and a vertical tail fin. The nose points along
 * local +Z so the harness can aim it down the flight path with lookAt().
 */
export function buildJet() {
  const group = new THREE.Group();
  group.name = 'jet';

  const metal = new THREE.MeshStandardMaterial({ color: 0x8b929c, metalness: 0.3, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, metalness: 0.2, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1c2b3a,
    metalness: 0.1,
    roughness: 0.15,
  });

  // Fuselage: a slim cylinder lying along Z.
  const fuselageGeometry = new THREE.CylinderGeometry(0.42, 0.34, 4.4, 12);
  fuselageGeometry.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeometry, metal);
  fuselage.name = 'fuselage';
  fuselage.position.z = -0.1;
  group.add(fuselage);

  // Nose: a cone whose tip points to +Z.
  const noseGeometry = new THREE.ConeGeometry(0.42, 1.5, 12);
  noseGeometry.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeometry, metal);
  nose.name = 'nose';
  nose.position.z = 2.85;
  group.add(nose);

  // Tail exhaust cap.
  const exhaustGeometry = new THREE.CylinderGeometry(0.34, 0.24, 0.5, 12);
  exhaustGeometry.rotateX(Math.PI / 2);
  const exhaust = new THREE.Mesh(exhaustGeometry, dark);
  exhaust.name = 'exhaust';
  exhaust.position.z = -2.55;
  group.add(exhaust);

  // Canopy: a stretched half-sphere sitting forward and on top.
  const canopyGeometry = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  canopyGeometry.scale(1, 0.7, 1.9);
  const canopy = new THREE.Mesh(canopyGeometry, glass);
  canopy.name = 'canopy';
  canopy.position.set(0, 0.32, 0.9);
  group.add(canopy);

  // Swept delta wings: a thin solid so they read from every angle (edge-on from
  // directly behind, broadside from the storyboard camera). Root reaches
  // further forward than the tips so the leading edge rakes back.
  const wings = new THREE.Mesh(deltaGeometry(3.4, 1.6, -2.0, 1.7, 0.12), metal);
  wings.name = 'wings';
  wings.position.z = -0.2;
  group.add(wings);

  // Vertical tail fin: the same swept delta stood up in the X=0 plane.
  const finGeometry = deltaGeometry(3.0, 1.1, -2.7, 1.0, 0.1);
  finGeometry.rotateZ(Math.PI / 2);
  const tailfin = new THREE.Mesh(finGeometry, metal);
  tailfin.name = 'tailfin';
  tailfin.position.set(0, 1.3, -2.0);
  group.add(tailfin);

  // Horizontal stabilizers at the tail: a smaller delta.
  const stabilizers = new THREE.Mesh(deltaGeometry(1.6, 0.4, -2.6, 0.7, 0.1), metal);
  stabilizers.name = 'stabilizers';
  group.add(stabilizers);

  return group;
}

/**
 * A symmetric swept delta as a thin solid, planform in the Y=0 plane, nose
 * toward +Z. `span` is tip-to-tip; the root leading edge sits at +`rootFront`,
 * the planform trailing edge at `tailZ`, and each tip trailing edge at
 * `tailZ + tipSweep` (positive `tipSweep` rakes the tips back). `thickness` is
 * the total extent in Y.
 */
function deltaGeometry(span, rootFront, tailZ, tipSweep, thickness) {
  const half = span / 2;
  const ty = thickness / 2;
  // Four planform corners, then top (+y) and bottom (-y) copies.
  const plan = [
    [0, rootFront], // 0 root leading
    [half, tailZ + tipSweep], // 1 right tip
    [0, tailZ], // 2 root trailing
    [-half, tailZ + tipSweep], // 3 left tip
  ];
  const v = [];
  for (const [x, z] of plan) v.push(x, ty, z); // 0..3 top
  for (const [x, z] of plan) v.push(x, -ty, z); // 4..7 bottom

  const idx = [
    0, 1, 2, 0, 2, 3, // top
    4, 6, 5, 4, 7, 6, // bottom
    0, 4, 1, 1, 4, 5, // leading-right edge
    1, 5, 2, 2, 5, 6, // trailing-right edge
    2, 6, 3, 3, 6, 7, // trailing-left edge
    3, 7, 0, 0, 7, 4, // leading-left edge
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return geometry;
}
