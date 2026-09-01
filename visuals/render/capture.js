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
if (mode === 'gif') {
  // Clear stale frames first: ffmpeg's frame-%04d pattern would otherwise pick
  // up leftovers from a previous, longer capture and produce a too-long GIF.
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

const server = await startServer();
const { port } = server.address();

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (err) => {
    console.error('Harness page error:', err);
    process.exit(1);
  });
  await page.setViewport({ width: 800, height: 600 });
  await page.goto(`http://127.0.0.1:${port}/render/harness.html?scene=${sceneId}`);
  await page.waitForFunction(() => window.__ready === true);

  const canvas = await page.$('#canvas');
  const cameraMode = mode === 'storyboard' ? 'tatica' : 'chase';

  if (mode === 'storyboard') {
    // Opening panel: the whole trajectory in one wide shot, for context.
    const midT = keyframes[Math.floor(keyframes.length / 2)].t;
    await page.evaluate((time) => window.__applyFrame(time, 'panorama'), midT);
    await canvas.screenshot({ path: path.join(outDir, 'storyboard-0.png') });

    for (let i = 0; i < keyframes.length; i += 1) {
      await page.evaluate(
        (time, camMode) => window.__applyFrame(time, camMode),
        keyframes[i].t,
        cameraMode
      );
      await canvas.screenshot({ path: path.join(outDir, `storyboard-${i + 1}.png`) });
    }
    console.log(`Wrote ${keyframes.length + 1} storyboard frames to ${outDir}`);
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
      await canvas.screenshot({
        path: path.join(outDir, `frame-${String(f).padStart(4, '0')}.png`),
      });
    }
    console.log(`Wrote ${totalFrames + 1} gif frames to ${outDir}`);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
