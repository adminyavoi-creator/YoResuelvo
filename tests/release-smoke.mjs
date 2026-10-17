import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const read = path => readFile(new URL(path, dist), 'utf8');

test('release includes the welcome entry, legal resources, icon set, and app shell', async () => {
  const html = await read('index.html');
  assert.match(html, /rel="manifest"/);
  assert.match(html, /\/manifest\.webmanifest/);

  const manifest = JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.name, 'YoResuelvo!');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/landing.html');
  assert.ok(manifest.icons.some(icon => icon.src === '/brand/yoresuelvo-icon-192.png'));
  assert.ok(manifest.icons.some(icon => icon.src === '/brand/yoresuelvo-icon-512.png'));

  const welcome = await read('landing.html');
  assert.match(welcome, /rel="manifest"/);
  assert.match(welcome, /href="\/delete-account\.html"/);
  await read('privacy.html');
  await read('terms.html');
  await read('delete-account.html');
  await read('brand/yoresuelvo-icon-192.png');
  await read('brand/yoresuelvo-icon-512.png');
  assert.match(await read('pwa-register.js'), /serviceWorker\.register/);

  const serviceWorker = await read('sw.js');
  assert.match(serviceWorker, /addAll\(SHELL\)/);
  assert.match(serviceWorker, /self\.location\.origin/);
  assert.match(serviceWorker, /firebase-config\.js/);
  assert.match(serviceWorker, /onBackgroundMessage/);
  assert.match(serviceWorker, /notificationclick/);
  assert.match(await read('firebase-config.js'), /__YORESUELVO_FIREBASE__/);

  const assets = await readdir(new URL('assets/', dist));
  const js = assets.find(file => /^index-.*\.js$/.test(file));
  const css = assets.find(file => /^index-.*\.css$/.test(file));
  assert.ok(js, 'hashed JavaScript bundle exists');
  assert.ok(css, 'hashed stylesheet exists');
  const bundle = await read(`assets/${js}`);
  assert.match(bundle, /\/privacy\.html/);
  assert.match(bundle, /\/terms\.html/);
  assert.match(bundle, /\/delete-account\.html/);
  assert.doesNotMatch(bundle, /sb_secret_[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY/i);
  assert.match(bundle, /signInWithOAuth/);
  assert.match(bundle, /provider:`google/);
  const javascript = await Promise.all(assets.filter(file => file.endsWith('.js')).map(file => read(`assets/${file}`)));
  assert.doesNotMatch(javascript.join('\n'), /FIREBASE_SERVICE_ACCOUNT_JSON|BEGIN PRIVATE KEY|SUPABASE_SERVICE_ROLE_KEY/i);
});
