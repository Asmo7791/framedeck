// FrameDeck relay (a Cloudflare Worker): the esports relay, plus /download, one link that
// sends each visitor the right FrameDeck download for their system.
//
// Esports relay:
// Answers esports match requests for every FrameDeck user with one PandaScore token and
// caches the answers, so any number of users only cost a few PandaScore requests.
// The token is a Worker secret (PANDASCORE_TOKEN); it never reaches the app.

// PandaScore game slugs FrameDeck uses, and how long each kind of list is cached (seconds).
const GAMES = new Set(['lol', 'csgo', 'valorant', 'dota2', 'ow', 'r6siege', 'rl']);
const CACHE_SECONDS = { running: 60, upcoming: 300, past: 300 };

// Answers kept in this worker's memory. Cloudflare's Cache API does nothing on *.workers.dev
// addresses, so this is the cache that counts there; it lasts as long as the worker instance.
const memory = new Map();

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// x-relay-cache says where an answer came from: miss (asked PandaScore), memory, cache or stale.
function answer(body, ttl, source) {
  return new Response(body, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttl}`, 'x-relay-cache': source },
  });
}

// ---------- /download ----------
const REPO = 'https://github.com/Asmo7791/framedeck';
const LATEST = REPO + '/releases/latest/download/';
const FILES = { mac: 'FrameDeck-mac.dmg', windows: 'FrameDeck-windows-setup.exe' };
const INSTALL = 'curl -fsSL https://raw.githubusercontent.com/Asmo7791/framedeck/main/install.sh | sh';

// Which system the visitor is on: "mac", "windows", "linux", "phone" or "" (unknown).
function systemOf(request) {
  const hint = (request.headers.get('sec-ch-ua-platform') || '').replace(/"/g, '').toLowerCase();
  const ua = request.headers.get('user-agent') || '';
  if (/iphone|ipad|ipod|android/i.test(ua) || hint === 'android' || hint === 'ios') return 'phone';
  if (hint === 'windows' || /windows/i.test(ua)) return 'windows';
  if (hint === 'macos' || /macintosh|mac os x/i.test(ua)) return 'mac';
  if (hint === 'linux' || hint === 'chrome os' || /linux|cros|x11/i.test(ua)) return 'linux';
  return '';
}

function downloadPage(system) {
  const lead = system === 'linux'
    ? `<p>On Linux or a Raspberry Pi, paste this into a terminal. It picks the right package for your machine:</p><pre>${INSTALL}</pre>`
    : system === 'phone'
      ? '<p>Phones and tablets don\'t need a download. Install FrameDeck on a computer, turn on <b>Settings → Share displays on my network</b>, open a screen\'s link on the phone or tablet, and choose <b>Add to Home Screen</b>.</p>'
      : '<p>Pick your system:</p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download FrameDeck</title><style>
body { font: 16px/1.5 -apple-system, "Segoe UI", sans-serif; max-width: 560px; margin: 8vh auto; padding: 0 20px; background: #0b0d11; color: #e7e9ee; }
a { color: #ff8a3d; } pre { background: #1a1e26; padding: 12px 14px; border-radius: 10px; white-space: pre-wrap; word-break: break-all; }
li { margin: 6px 0; } small { color: #8b94a3; }
</style></head><body>
<h1>Download FrameDeck</h1>${lead}
<ul>
<li><a href="${LATEST}${FILES.mac}">Mac</a> <small>(Apple silicon and Intel, macOS 12 or newer)</small></li>
<li><a href="${LATEST}${FILES.windows}">Windows 10/11</a> <small>(x64 and ARM)</small></li>
<li>Linux and Raspberry Pi: <code>${INSTALL}</code></li>
</ul>
<p><small>Every file, including portable zips: <a href="${REPO}/releases/latest">Releases page</a> · Help: <a href="${REPO}/wiki/Installing">Installing</a></small></p>
</body></html>`;
}

function download(request) {
  const url = new URL(request.url);
  const system = (url.searchParams.get('os') || systemOf(request)).toLowerCase();
  if (FILES[system]) return Response.redirect(LATEST + FILES[system], 302);
  return new Response(downloadPage(system), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', vary: 'user-agent, sec-ch-ua-platform' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/') return json({ ok: true, service: 'FrameDeck esports relay' });
    if (url.pathname === '/download' || url.pathname === '/download/') return download(request);
    const m = /^\/pandascore\/([a-z0-9]+)\/matches\/(running|upcoming|past)$/.exec(url.pathname);
    if (request.method !== 'GET' || !m || !GAMES.has(m[1])) return json({ error: 'Not found' }, 404);
    if (!env.PANDASCORE_TOKEN) return json({ error: 'The relay has no PandaScore token yet' }, 503);

    const [, game, kind] = m;
    const perPage = Math.min(20, Math.max(1, Number(url.searchParams.get('per_page')) || 10));
    const ttl = CACHE_SECONDS[kind];
    // Cache by game, kind and size only, so every user shares the same cached answer.
    const key = new Request(`https://framedeck-relay.cache/${game}/${kind}?per_page=${perPage}`);
    const remembered = memory.get(key.url);
    if (remembered && Date.now() - remembered.at < ttl * 1000) return answer(remembered.body, ttl, 'memory');
    const cache = globalThis.caches ? caches.default : null;
    if (cache) {
      const hit = await cache.match(key);
      if (hit) return hit;
    }

    const upstream = await fetch(`https://api.pandascore.co/${game}/matches/${kind}?per_page=${perPage}`, {
      headers: { authorization: 'Bearer ' + env.PANDASCORE_TOKEN, accept: 'application/json' },
    });
    if (!upstream.ok) {
      // Keep showing the last answer if PandaScore is down or the hourly limit is used up.
      if (remembered) return answer(remembered.body, ttl, 'stale');
      return json({ error: `PandaScore answered ${upstream.status}` }, 502);
    }
    const body = await upstream.text();
    memory.set(key.url, { at: Date.now(), body });
    if (cache) ctx.waitUntil(cache.put(key, answer(body, ttl, 'cache')));
    return answer(body, ttl, 'miss');
  },
};
