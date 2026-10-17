import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [release, pkg, manifest, gradle] = await Promise.all([
  readFile(new URL('../release-version.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../android/app/build.gradle', import.meta.url), 'utf8'),
]);

assert.match(release.versionName, /^\d+\.\d+\.\d+$/);
assert.ok(Number.isInteger(release.versionCode) && release.versionCode > 0);
assert.equal(pkg.version, release.versionName, 'package.json must match release-version.json');
assert.equal(manifest.version, release.versionName, 'PWA manifest must match release-version.json');
assert.match(gradle, /versionCode\s+releaseVersion\.versionCode/);
assert.match(gradle, /versionName\s+releaseVersion\.versionName/);

console.log('PWA and Android release versions aligned at ' + release.versionName + ' (code ' + release.versionCode + ').');
