import * as THREE from 'three';

/**
 * The jet is an external glTF model — "Jet" by jeremy, CC-BY 3.0, see
 * `visuals/assets/models/CREDITS.md`. Its nose already points along local +Z
 * (verified by inspection), which is the convention the harness orients along
 * the flight path.
 */
export const FIGHTER_MODEL_URL = '/assets/models/fighter.glb';

// Target length (local +Z extent) after normalization, in scene units. The
// trajectory spans ~90 units; ~7 keeps the jet readable in the close tactical
// framing without dwarfing the path in the panorama.
export const FIGHTER_LENGTH = 7;

/**
 * Recenter an arbitrary loaded model on its own bounding-box center and scale it
 * uniformly so its +Z (nose-to-tail) extent equals `length`. Pure geometry math
 * — no renderer needed — so it can be unit-tested against a plain Object3D.
 * Mutates and returns `object`.
 */
export function normalizeJet(object, { length = FIGHTER_LENGTH } = {}) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const scale = size.z > 0 ? length / size.z : 1;
  object.scale.multiplyScalar(scale);
  object.position.sub(center.multiplyScalar(scale));

  return object;
}
