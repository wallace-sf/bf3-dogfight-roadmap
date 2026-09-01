export function tacticalCameraPosition(keyframes) {
  const xs = keyframes.map((k) => k.pos[0]);
  const ys = keyframes.map((k) => k.pos[1]);
  const zs = keyframes.map((k) => k.pos[2]);

  const center = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ];

  const spread = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...zs) - Math.min(...zs),
    20
  );

  return {
    position: [center[0], center[1] + spread, center[2] + spread],
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
