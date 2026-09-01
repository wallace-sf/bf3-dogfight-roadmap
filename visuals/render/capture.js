import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './static-server.js';

const RENDER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(RENDER_DIR, '..', '..');

const [, , sceneId, mode] = process.argv;
if (!sceneId || !['storyboard', 'gif'].includes(mode)) {
  console.error('Usage: node capture.js <scene-id> <storyboard|gif>');
  process.exit(1);
}

const sceneModule = await import(`../scenes/${sceneId}.js`);
const keyframes = sceneModule.default.keyframes;

const maneuverDir = path.join(REPO_ROOT, 'assets', 'maneuvers', sceneId);
const outDir = mode === 'gif' ? path.join(maneuverDir, 'frames') : maneuverDir;
fs.mkdirSync(outDir, { recursive: true });

const server = await startServer();
const { port } = server.address();

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 600 });
await page.goto(`http://localhost:${port}/render/harness.html?scene=${sceneId}`);
await page.waitForFunction(() => window.__ready === true);

const canvas = await page.$('#canvas');
const cameraMode = mode === 'storyboard' ? 'tatica' : 'chase';

if (mode === 'storyboard') {
  for (let i = 0; i < keyframes.length; i += 1) {
    await page.evaluate(
      (time, camMode) => window.__applyFrame(time, camMode),
      keyframes[i].t,
      cameraMode
    );
    await canvas.screenshot({ path: path.join(outDir, `storyboard-${i + 1}.png`) });
  }
  console.log(`Wrote ${keyframes.length} storyboard frames to ${outDir}`);
} else {
  const fps = 15;
  const duration = keyframes[keyframes.length - 1].t;
  const totalFrames = Math.round(duration * fps);
  for (let f = 0; f <= totalFrames; f += 1) {
    const t = f / fps;
    await page.evaluate(
      (time, camMode) => window.__applyFrame(time, camMode),
      t,
      cameraMode
    );
    await canvas.screenshot({ path: path.join(outDir, `frame-${String(f).padStart(4, '0')}.png`) });
  }
  console.log(`Wrote ${totalFrames + 1} gif frames to ${outDir}`);
}

await browser.close();
await new Promise((resolve) => server.close(resolve));
