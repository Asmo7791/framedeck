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

  // A tiny feed server standing in for a private calendar / RSS link.
  const zlib = await import('zlib');
  const ICS = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Secret meeting\r\nDTSTART:' + new Date(Date.now() + 3600e3).toISOString().replace(/[-:]|\.\d+/g, '') + '\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  const feed = http.createServer((req, r) => { r.writeHead(200, { 'content-type': 'text/calendar', 'content-encoding': 'gzip' }); r.end(zlib.gzipSync(ICS)); });
  await new Promise((resolve) => feed.listen(0, '127.0.0.1', resolve));
  const feedUrl = `http://127.0.0.1:${feed.address().port}/secret.ics`;
  try {
    const withAgenda = structuredClone(cfg.config);
    withAgenda.screens[0].pages[0].widgets.push({ id: 'cal1', type: 'agenda', x: 0, y: 0, w: 2, h: 2, settings: { url: feedUrl } });
    withAgenda.screens[0].pages[0].widgets.push({ id: 'sc1', type: 'scores', x: 0, y: 0, w: 2, h: 2, settings: { league: 'lol', token: 'pandascore-secret-token' } });
    await fetch(base + '/api/config', { method: 'PUT', headers: { 'x-framedeck': '1' }, body: JSON.stringify({ config: withAgenda }) });
    const asWidget = await (await get('/api/config', { 'x-framedeck-sandbox': '1' })).text();
    ok(!asWidget.includes('secret.ics') && asWidget.includes('fd-ref:cal1'), 'other devices get a reference instead of the calendar link');
    ok(!asWidget.includes('pandascore-secret-token') && asWidget.includes('fd-ref:sc1'), 'other devices get a reference instead of the esports token');
    ok((await get('/api/config')).ok && (await (await get('/api/config')).text()).includes('secret.ics'), 'the editor still sees the real link');
    const events = await (await get('/api/ics?url=fd-ref:cal1')).json();
    ok(JSON.stringify(events).includes('Secret meeting'), 'a reference loads the real (gzipped) calendar');
    ok((await get('/api/ics?url=fd-ref:nope')).status === 404, 'an unknown reference fails');
    ok((await get('/api/fetch?url=' + encodeURIComponent(feedUrl), { 'x-framedeck-sandbox': '1' })).status === 403, 'custom widgets can\'t reach local addresses');
    ok((await get('/api/fetch?url=' + encodeURIComponent(feedUrl))).status === 200, 'built-in widgets on this computer can');
    ok((await get('/api/system', { 'sec-fetch-site': 'cross-site' })).status === 403, 'rejects API calls from other sites');
    ok((await get('/api/system', { origin: 'null' })).status === 403, 'rejects API calls from sandboxed frames');
  } finally {
    feed.close();
  }

  // Private addresses are refused when connecting, including names that resolve to them.
  const sources = require(path.join(root, 'src/sources.js'));
  const refused = async (u) => { try { await sources.safeFetch(u); return false; } catch (e) { return e.status === 403; } };
  ok(await refused('http://localhost:1/'), 'refuses a host name that resolves to a private address');
  ok(await refused('http://127.0.0.1:1/') && await refused('http://[::ffff:7f00:1]:1/') && await refused('http://[fd00::1]/'), 'refuses private IP addresses');
  ok(!sources.isPrivateIp('93.184.216.34') && !sources.isPrivateIp('2606:4700::1111'), 'allows public addresses');
} finally {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
