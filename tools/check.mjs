#!/usr/bin/env node
// Quick checks that run without Electron (locally with `npm run check`, and on GitHub for every push):
// every script parses, and the local server starts, serves pages and guards its editing endpoints.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failed++; };

// 1. Syntax
const files = [];
for (const dir of ['src', 'app', 'app/shared', 'tools', 'build']) {
  for (const f of fs.readdirSync(path.join(root, dir))) if (/\.(m?js)$/.test(f)) files.push(path.join(dir, f));
}
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); ok(true, `parses: ${f}`); }
  catch (e) { ok(false, `parses: ${f}\n${e.stderr}`); }
}

// 2. Supporter keys: the embedded public key must be a valid Ed25519 key.
const { verifyKey } = require(path.join(root, 'src/license.js'));
ok(verifyKey('FD1-e30.AAAA') === null, 'rejects a forged supporter key');

// 3. Local server
const { createServer } = require(path.join(root, 'src/server.js'));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'framedeck-check-'));
const server = createServer({ dataDir, staticDir: path.join(root, 'app'), port: 47900 });
const port = await server.listen();
const base = `http://127.0.0.1:${port}`;
const get = (p, headers = {}) => fetch(base + p, { headers, redirect: 'manual' });
try {
  ok((await get('/')).headers.get('location') === '/editor.html', '/ opens the editor on this computer');
  ok((await get('/editor.html')).status === 200, 'serves editor.html');
  ok((await get('/display.html')).status === 200, 'serves display.html');
  const cfg = await (await get('/api/config')).json();
  ok(Array.isArray(cfg.config.screens) && cfg.config.screens.length > 0, 'default config has screens');
  ok((await get('/../package.json')).status !== 200, 'blocks paths outside app/');
  const put = (headers) => fetch(base + '/api/config', { method: 'PUT', headers, body: JSON.stringify({ config: cfg.config }) });
  ok((await put({})).status === 403, 'config changes need the FrameDeck header');
  ok((await put({ 'x-framedeck': '1' })).status === 200, 'config saves with the header');
  // fetch() won't let us set Host, so use http.request for the DNS-rebinding check.
  const http = await import('http');
  const status = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/api/config', headers: { host: `evil.example:${port}` } }, (r) => { r.resume(); resolve(r.statusCode); }).on('error', reject);
  });
  ok(status === 421, 'rejects requests for other host names (DNS rebinding)');
} finally {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
