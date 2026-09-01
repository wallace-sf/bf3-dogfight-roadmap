// visuals/render/export.js
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
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

execFileSync(ffmpegPath, [
  '-y',
  '-framerate', '15',
  '-i', path.join(framesDir, 'frame-%04d.png'),
  '-vf', 'palettegen',
  palettePath,
]);

execFileSync(ffmpegPath, [
  '-y',
  '-framerate', '15',
  '-i', path.join(framesDir, 'frame-%04d.png'),
  '-i', palettePath,
  '-lavfi', 'paletteuse',
  outputGif,
]);

console.log(`GIF written to ${outputGif}`);
