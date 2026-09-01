/**
 * Tactical (storyboard) camera: an elevated 3/4 view that frames the whole
 * trajectory. The distance is derived from the trajectory's bounding sphere and
 * the camera's field of view, so the camera sits only as far back as it needs
 * to in order to contain the path — instead of using the raw axis spread as a
 * distance, which pushed the camera much further out than necessary and made
 * the jet unreadably small.
 */
export function tacticalCameraPosition(keyframes, options = {}) {
  const {
    fovDeg = 50,
    aspect = 800 / 600,
    margin = 1.05,
    minRadius = 12,
    // Half-extent of whatever is drawn *at* a trajectory point (i.e. the jet).
    // Keyframes are points, so without this the jet gets clipped at the frame
    // edge when it sits on the bounding box boundary.
    padding = 0,
  } = options;

  const xs = keyframes.map((k) => k.pos[0]);
  const ys = keyframes.map((k) => k.pos[1]);
  const zs = keyframes.map((k) => k.pos[2]);

  const center = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ];

  const half = [
    (Math.max(...xs) - Math.min(...xs)) / 2,
    (Math.max(...ys) - Math.min(...ys)) / 2,
    (Math.max(...zs) - Math.min(...zs)) / 2,
  ];

  const radius =
    (Math.max(minRadius, Math.hypot(half[0], half[1], half[2])) + padding) * margin;

  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distance = Math.max(radius / Math.tan(vFov / 2), radius / Math.tan(hFov / 2));

  // Elevated 45-degree 3/4 view: equal height and depth offsets.
  const offset = distance / Math.SQRT2;

  return {
    position: [center[0], center[1] + offset, center[2] + offset],
    lookAt: center,
  };
}

export function chaseCameraPosition(currentPos, forward, options = {}) {
  const { distanceBehind = 15, heightAbove = 4 } = options;

  const position = [
    currentPos[0] - forward[0] * distanceBehind,
    currentPos[1] - forward[1] * distanceBehind + heightAbove,
    currentPos[2] - forward[2] * distanceBehind,
  ];
  const lookAt = [
    currentPos[0] + forward[0] * 10,
    currentPos[1] + forward[1] * 10,
    currentPos[2] + forward[2] * 10,
  ];

  return { position, lookAt };
}
