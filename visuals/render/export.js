// visuals/render/export.js
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RENDER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(RENDER_DIR, '..', '..');

const [, , sceneId] = process.argv;
if (!sceneId) {
  console.error('Usage: node export.js <scene-id>');
  process.exit(1);
}

const maneuverDir = path.join(REPO_ROOT, 'assets', 'maneuvers', sceneId);
const framesDir = path.join(maneuverDir, 'frames');
const palettePath = path.join(framesDir, 'palette.png');
const outputGif = path.join(maneuverDir, 'loop.gif');

if (!fs.existsSync(framesDir)) {
  console.error(
    `No frames directory at ${framesDir}.\n` +
      `Run the gif capture first: node render/capture.js ${sceneId} gif`
  );
  process.exit(1);
}

// stdio: 'inherit' so ffmpeg's own diagnostics reach the terminal on failure,
// instead of a bare "Command failed".
execFileSync(
  ffmpegPath,
  [
    '-y',
    '-framerate', '15',
    '-i', path.join(framesDir, 'frame-%04d.png'),
    '-vf', 'palettegen=max_colors=64:stats_mode=diff',
    palettePath,
  ],
  { stdio: 'inherit' }
);

execFileSync(
  ffmpegPath,
  [
    '-y',
    '-framerate', '15',
    '-i', path.join(framesDir, 'frame-%04d.png'),
    '-i', palettePath,
    '-lavfi', 'paletteuse=dither=none',
    outputGif,
  ],
  { stdio: 'inherit' }
);

// The frames directory is a build intermediate (gitignored); drop it, palette
// included, so a later capture never picks up stale frames.
fs.rmSync(framesDir, { recursive: true, force: true });

console.log(`GIF written to ${outputGif}`);
