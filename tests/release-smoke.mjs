import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const read = path => readFile(new URL(path, dist), 'utf8');

test('release contains its PWA shell and built application assets', async () => {
  const html = await read('index.html');
  assert.match(html, /rel="manifest"/);
  assert.match(html, /\/manifest\.webmanifest/);

  const manifest = JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.name, 'YoResuelvo!');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(icon => icon.src === '/logo.svg'));

  const serviceWorker = await read('sw.js');
  assert.match(serviceWorker, /addAll\(SHELL\)/);
  assert.match(serviceWorker, /self\.location\.origin/);

  const assets = await readdir(new URL('assets/', dist));
  const js = assets.find(file => /^index-.*\.js$/.test(file));
  const css = assets.find(file => /^index-.*\.css$/.test(file));
  assert.ok(js, 'hashed JavaScript bundle exists');
  assert.ok(css, 'hashed stylesheet exists');
  const bundle = await read(`assets/${js}`);
  assert.doesNotMatch(bundle, /sb_secret_[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY/i);
});
