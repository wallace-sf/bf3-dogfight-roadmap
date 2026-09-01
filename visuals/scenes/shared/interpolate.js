export function interpolateKeyframes(keyframes, t) {
  // Check for exact keyframe match
  for (let i = 0; i < keyframes.length; i += 1) {
    if (keyframes[i].t === t) {
      return toFrame(keyframes[i]);
    }
  }

  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (t <= first.t) return toFrame(first);
  if (t >= last.t) return toFrame(last);

  let k0 = first;
  let k1 = last;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    if (keyframes[i].t <= t && t <= keyframes[i + 1].t) {
      k0 = keyframes[i];
      k1 = keyframes[i + 1];
      break;
    }
  }

  const alpha = (t - k0.t) / (k1.t - k0.t);
  return {
    pos: [
      lerp(k0.pos[0], k1.pos[0], alpha),
      lerp(k0.pos[1], k1.pos[1], alpha),
      lerp(k0.pos[2], k1.pos[2], alpha),
    ],
    pitch: lerp(k0.pitch, k1.pitch, alpha),
    roll: lerp(k0.roll, k1.roll, alpha),
    speed: lerp(k0.speed, k1.speed, alpha),
    tendencia: k0.tendencia,
    comando: k0.comando,
    nota: k0.nota,
  };
}

function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

function toFrame(k) {
  return {
    pos: [...k.pos],
    pitch: k.pitch,
    roll: k.roll,
    speed: k.speed,
    tendencia: k.tendencia,
    comando: k.comando,
    nota: k.nota,
  };
}
