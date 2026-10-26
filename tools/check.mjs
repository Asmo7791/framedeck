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
for (const dir of ['src', 'app', 'app/shared', 'tools', 'build', 'relay']) {
  for (const f of fs.readdirSync(path.join(root, dir))) if (/\.(m?js)$/.test(f)) files.push(path.join(dir, f));
}
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); ok(true, `parses: ${f}`); }
  catch (e) { ok(false, `parses: ${f}\n${e.stderr}`); }
}

// 2. Supporter keys: the embedded public key must be a valid Ed25519 key.
const { verifyKey } = require(path.join(root, 'src/license.js'));
ok(verifyKey('FD1-e30.AAAA') === null, 'rejects a forged supporter key');

// 2b. Translations: each pack loads, and every placeholder in a key is used in its translation
// (except ones stuck to the end of a word, like the plural s in "widget{1}").
{
  const vm = await import('vm');
  const sandbox = { window: {}, navigator: { language: 'en' }, document: {}, location: {} };
  vm.createContext(sandbox);
  for (const f of ['app/shared/i18n.js', 'app/i18n/zh-Hans.js', 'app/i18n/zh-Hant.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
  const FD = sandbox.window.FD;
  for (const lang of ['zh-Hans', 'zh-Hant']) {
    const pack = FD.I18N[lang];
    const bad = Object.entries(pack ? pack.strings : {}).filter(([k, v]) => (k.match(/(^|[^A-Za-z])\{t?\d\}/g) || []).some((p) => !v.includes('{' + p.replace(/\D/g, '') + '}')));
    ok(pack && Object.keys(pack.strings).length > 300 && typeof pack.guide === 'function' && pack.help, `${lang} translation loads`);
    ok(!bad.length, `${lang} keeps every placeholder${bad.length ? ': ' + bad.map(([k]) => k).join(' | ') : ''}`);
  }
  const zhHans = Object.keys(FD.I18N['zh-Hans'].strings).sort().join('\n');
  ok(zhHans === Object.keys(FD.I18N['zh-Hant'].strings).sort().join('\n'), 'zh-Hant.js is up to date (run npm run i18n)');
}

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

  // Esports relay: run relay/worker.js locally against a fake PandaScore, and point FrameDeck at it.
  const { default: relay } = await import(path.join(root, 'relay/worker.js'));
  const realFetch = globalThis.fetch;
  const upstream = [];
  const match = { id: 1, status: 'finished', number_of_games: 3, winner_id: 10, league: { name: 'LCK' }, begin_at: '2026-10-26T10:00:00Z',
    opponents: [{ opponent: { id: 10, acronym: 'T1', name: 'T1' } }, { opponent: { id: 20, acronym: 'GEN', name: 'Gen.G' } }], results: [{ team_id: 10, score: 2 }, { team_id: 20, score: 1 }] };
  globalThis.fetch = (u, opts) => {
    if (String(u).startsWith('https://api.pandascore.co/')) {
      upstream.push({ url: String(u), auth: opts.headers.authorization });
      return Promise.resolve(new Response(JSON.stringify(String(u).includes('/past') ? [match] : []), { headers: { 'content-type': 'application/json' } }));
    }
    return realFetch(u, opts);
  };
  const relayServer = http.createServer(async (req, r) => {
    const out = await relay.fetch(new Request('http://relay' + req.url), { PANDASCORE_TOKEN: 'relay-secret' }, { waitUntil() {} });
    r.writeHead(out.status, { 'content-type': 'application/json' }); r.end(await out.text());
  });
  await new Promise((resolve) => relayServer.listen(0, '127.0.0.1', resolve));
  process.env.FRAMEDECK_ESPORTS_RELAY = `http://127.0.0.1:${relayServer.address().port}`;
  try {
    const viaRelay = await sources.scores('lol', {});
    ok(viaRelay.games.length === 1 && viaRelay.games[0].away.abbr === 'GEN' && viaRelay.games[0].home.score === 2, 'esports without a token uses the relay');
    ok(upstream.length === 3 && upstream.every((u) => u.auth === 'Bearer relay-secret'), 'the relay adds its own token');
    upstream.length = 0;
    await sources.scores('lol', { token: 'mine' });
    ok(upstream.length === 3 && upstream.every((u) => u.auth === 'Bearer mine'), 'a personal token goes straight to PandaScore');
    const bad = await relay.fetch(new Request('http://relay/pandascore/lol/teams'), { PANDASCORE_TOKEN: 'x' }, { waitUntil() {} });
    ok(bad.status === 404, 'the relay only answers match lists');
    upstream.length = 0;
    const again = await relay.fetch(new Request('http://relay/pandascore/lol/matches/past?per_page=10'), { PANDASCORE_TOKEN: 'relay-secret' }, { waitUntil() {} });
    ok(again.headers.get('x-relay-cache') === 'memory' && upstream.length === 0, 'the relay answers repeats from its cache');
    const dl = (ua, q = '') => relay.fetch(new Request('http://relay/download' + q, { headers: { 'user-agent': ua } }), {}, { waitUntil() {} });
    const loc = (r) => r.headers.get('location') || '';
    ok(loc(await dl('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).endsWith('/releases/latest/download/FrameDeck-windows-setup.exe'), '/download sends Windows to the installer');
    ok(loc(await dl('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).endsWith('/FrameDeck-mac.dmg'), '/download sends Macs to the dmg');
    const linux = await dl('Mozilla/5.0 (X11; Linux aarch64)');
    ok(linux.status === 200 && (await linux.text()).includes('install.sh | sh'), '/download shows Linux the install command');
    ok((await (await dl('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).text()).includes('Add to Home Screen'), '/download tells phones no download is needed');
    ok(loc(await dl('Mozilla/5.0 (X11; Linux x86_64)', '?os=windows')).endsWith('FrameDeck-windows-setup.exe'), '/download?os= picks a system');
  } finally {
    delete process.env.FRAMEDECK_ESPORTS_RELAY;
    globalThis.fetch = realFetch;
    relayServer.close();
  }
} finally {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
