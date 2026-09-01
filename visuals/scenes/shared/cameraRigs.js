/**
 * Tactical (storyboard) camera: a close 3/4 view locked onto the jet *at one
 * instant*, not the whole trajectory. Earlier this framed the entire path
 * (~90 units) in a single shot, which left the jet a few pixels tall and its
 * pitch/roll — the whole point of the storyboard — unreadable. Now each panel
 * sits a fixed short distance off the jet, looking slightly down and in from
 * the side, so the aircraft fills roughly a third of the frame in every panel
 * while the drawn trajectory line still carries the manoeuvre's shape.
 */
export function tacticalCameraPosition(keyframe, forward, options = {}) {
  const { distance = 16, sideRatio = 0.55, upRatio = 0.4 } = options;

  const pos = keyframe.pos;
  const f = normalize(forward);
  const worldUp = [0, 1, 0];
  let right = normalize(cross(f, worldUp));
  // Degenerate when the jet flies straight up/down; fall back to world X.
  if (!Number.isFinite(right[0]) || right[0] ** 2 + right[1] ** 2 + right[2] ** 2 === 0) {
    right = [1, 0, 0];
  }
  const up = normalize(cross(right, f));

  // Offset from the jet: mostly behind, partly to the side, partly above.
  const dir = normalize([
    -f[0] + right[0] * sideRatio + up[0] * upRatio,
    -f[1] + right[1] * sideRatio + up[1] * upRatio,
    -f[2] + right[2] * sideRatio + up[2] * upRatio,
  ]);

  return {
    position: [
      pos[0] + dir[0] * distance,
      pos[1] + dir[1] * distance,
      pos[2] + dir[2] * distance,
    ],
    lookAt: [...pos],
  };
}

/**
 * Overview camera: the old whole-trajectory framing, kept for the storyboard's
 * opening panel. Sits an elevated 45-degree 3/4 view only as far back as the
 * path's bounding sphere and the field of view require.
 */
export function overviewCameraPosition(keyframes, options = {}) {
  const { fovDeg = 50, aspect = 800 / 600, margin = 1.15, minRadius = 20 } = options;

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

  const radius = Math.max(minRadius, Math.hypot(half[0], half[1], half[2])) * margin;
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distance = Math.max(radius / Math.tan(vFov / 2), radius / Math.tan(hFov / 2));
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

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}
