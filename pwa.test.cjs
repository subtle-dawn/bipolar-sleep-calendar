const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('manifest icons exist at their declared sizes, with paths scoped to the project', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(manifest.scope, './');
  assert.equal(manifest.start_url, './index.html');
  for (const icon of manifest.icons) {
    const bytes = fs.readFileSync(icon.src);
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('rel="manifest"'));
  assert.ok(html.includes('src="pwa.js"'));
});

test('service worker caches app assets, supports offline navigation and isolates other projects', async () => {
  const scope = 'https://example.test/sleep/';
  const handlers = {}, deleted = [], cached = new Map();
  const current = `sleep-calendar-${scope}-v16`;
  const cache = {
    async addAll(requests) {
      for (const request of requests) {
        const url = new URL(request.url);
        const path = url.pathname.slice('/sleep/'.length);
        assert.ok(fs.existsSync(path), path);
        cached.set(request.url, fs.readFileSync(path, 'utf8'));
      }
    },
    async match(request) { return cached.get(typeof request === 'string' ? request : request.url); }
  };
  vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {
    self: { registration: { scope }, clients: { claim: async () => {} }, addEventListener: (name, callback) => { handlers[name] = callback; } },
    URL, Request,
    caches: { open: async () => cache, keys: async () => [current, `sleep-calendar-${scope}-v0`, 'other-project'], delete: async key => deleted.push(key) },
    fetch: async () => { throw new Error('offline'); }
  });
  let pending;
  handlers.install({ waitUntil: promise => { pending = promise; } });
  await pending;
  const html = fs.readFileSync('index.html', 'utf8');
  for (const [, path] of html.matchAll(/(?:href|src)="([^"]+\.(?:css|js)(?:\?[^"]*)?)"/g)) {
    assert.ok(cached.has(new URL(path, scope).href), path);
  }
  handlers.activate({ waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual(deleted, [`sleep-calendar-${scope}-v0`]);
  for (const path of ['', 'index.html', 'index.html?launch=home']) {
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: scope + path }, respondWith: promise => { pending = promise; } });
    assert.equal(await pending, html);
  }
  for (const url of ['https://example.test/other/', scope + 'backup.json']) {
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url }, respondWith: () => assert.fail('Unrelated request intercepted') });
  }
});
