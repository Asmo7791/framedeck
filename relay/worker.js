// FrameDeck esports relay (a Cloudflare Worker).
// Answers esports match requests for every FrameDeck user with one PandaScore token and
// caches the answers, so any number of users only cost a few PandaScore requests.
// The token is a Worker secret (PANDASCORE_TOKEN); it never reaches the app.

// PandaScore game slugs FrameDeck uses, and how long each kind of list is cached (seconds).
const GAMES = new Set(['lol', 'csgo', 'valorant', 'dota2', 'ow', 'r6siege', 'rl']);
const CACHE_SECONDS = { running: 60, upcoming: 300, past: 300 };

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/') return json({ ok: true, service: 'FrameDeck esports relay' });
    const m = /^\/pandascore\/([a-z0-9]+)\/matches\/(running|upcoming|past)$/.exec(url.pathname);
    if (request.method !== 'GET' || !m || !GAMES.has(m[1])) return json({ error: 'Not found' }, 404);
    if (!env.PANDASCORE_TOKEN) return json({ error: 'The relay has no PandaScore token yet' }, 503);

    const [, game, kind] = m;
    const perPage = Math.min(20, Math.max(1, Number(url.searchParams.get('per_page')) || 10));
    const ttl = CACHE_SECONDS[kind];
    // Cache by game, kind and size only, so every user shares the same cached answer.
    const key = new Request(`https://framedeck-relay.cache/${game}/${kind}?per_page=${perPage}`);
    const cache = globalThis.caches ? caches.default : null;
    if (cache) {
      const hit = await cache.match(key);
      if (hit) return hit;
    }

    const upstream = await fetch(`https://api.pandascore.co/${game}/matches/${kind}?per_page=${perPage}`, {
      headers: { authorization: 'Bearer ' + env.PANDASCORE_TOKEN, accept: 'application/json' },
    });
    if (!upstream.ok) return json({ error: `PandaScore answered ${upstream.status}` }, 502);
    const res = new Response(await upstream.text(), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttl}` },
    });
    if (cache) ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
};
