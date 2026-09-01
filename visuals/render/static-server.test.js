import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './static-server.js';

test('serves a known file from the visuals/ root with the right content type', async () => {
  const server = await startServer();
  const port = server.address().port;

  const response = await fetch(`http://localhost:${port}/package.json`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.ok(body.includes('bf3-dogfight-visuals'));

  await new Promise((resolve) => server.close(resolve));
});

test('returns 404 for a missing file', async () => {
  const server = await startServer();
  const port = server.address().port;

  const response = await fetch(`http://localhost:${port}/does-not-exist.js`);
  assert.equal(response.status, 404);

  await new Promise((resolve) => server.close(resolve));
});
