// FrameDeck local server: serves the editor and display pages, stores the
// layout config, and proxies the few public data sources widgets use.
// It has no Electron dependency so it can run on its own for testing.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const { defaultConfig } = require('./defaults');
const sources = require('./sources');
const { licenseStore } = require('./license');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/mp4', // QuickTime files from a Mac are usually H.264, which plays fine as MP4
  '.webm': 'video/webm',
};
const MEDIA_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.m4v', '.mov', '.webm']);
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function createServer({ dataDir, staticDir, hooks = {}, port = 47820 }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const mediaDir = path.join(dataDir, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  const configPath = path.join(dataDir, 'config.json');
  const license = licenseStore(dataDir);

  // ---------- config ----------
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config || !Array.isArray(config.screens)) throw new Error('bad config');
  } catch {
    config = defaultConfig();
    saveConfig();
  }
  let revision = 1;

  function saveConfig() {
    const tmp = configPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
    fs.renameSync(tmp, configPath);
  }

  // ---------- server-sent events ----------
  const clients = new Set();
  function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(msg);
  }
  setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000).unref();

  // ---------- data sources ----------
  const cache = new Map();
  async function cached(key, ttlMs, fn) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < ttlMs) return hit.v;
    try {
      const v = await fn();
      cache.set(key, { t: Date.now(), v });
      return v;
    } catch (err) {
      if (hit) return hit.v; // serve stale data when the source is down
      throw err;
    }
  }
  async function getJSON(url) {
    const r = await fetch(url, { headers: { 'user-agent': 'FrameDeck/0.2 (+https://github.com/Asmo7791/framedeck)' }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
    return r.json();
  }

  let lastCpu = cpuTimes();
  let cpuPct = 0;
  function cpuTimes() {
    let idle = 0, total = 0;
    for (const c of os.cpus()) {
      for (const k of Object.keys(c.times)) total += c.times[k];
      idle += c.times.idle;
    }
    return { idle, total };
  }
  setInterval(() => {
    const now = cpuTimes();
    const dt = now.total - lastCpu.total;
    if (dt > 0) cpuPct = Math.max(0, Math.min(100, 100 * (1 - (now.idle - lastCpu.idle) / dt)));
    lastCpu = now;
  }, 2000).unref();

  // Feed and calendar links can be private (Google's "secret address in iCal format"), and
  // esports scores use the person's own API token. Other devices get a reference instead,
  // and the server swaps the real value back in.
  const SECRET_SETTINGS = { agenda: 'url', rss: 'url', scores: 'token' };
  function hideFeedUrls(value) {
    if (Array.isArray(value)) return value.map(hideFeedUrls);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = hideFeedUrls(v);
    const key = SECRET_SETTINGS[out.type];
    if (key && out.settings && out.settings[key]) {
      out.settings = { ...out.settings, [key]: out.id ? 'fd-ref:' + out.id : '' };
    }
    return out;
  }
  function feedUrl(raw, type) {
    const m = /^fd-ref:(.+)$/.exec(raw || '');
    if (!m) return raw;
    const find = (value) => {
      if (Array.isArray(value)) { for (const v of value) { const f = find(v); if (f) return f; } return null; }
      if (!value || typeof value !== 'object') return null;
      if (value.id === m[1] && value.type === type && value.settings) return value.settings[SECRET_SETTINGS[type]] || null;
      for (const v of Object.values(value)) { const f = find(v); if (f) return f; }
      return null;
    };
    const url = find(config.screens);
    if (!url) throw httpError(404, 'That widget no longer exists');
    return url;
  }

  const api = {
    'GET /api/config': (req, url, local) => ({ revision, config: local ? config : hideFeedUrls(config) }),
    'PUT /api/config': async (req) => {
      const body = await readJSON(req);
      if (!body || !body.config || !Array.isArray(body.config.screens)) throw httpError(400, 'Invalid config');
      const lanChanged = !!body.config.shareOnLan !== !!config.shareOnLan;
      // The app owns `session` (which displays are open); the editor never overwrites it.
      config = { ...body.config, session: config.session || { openDisplays: [] } };
      revision += 1;
      saveConfig();
      broadcast('config', { revision });
      if (lanChanged) setTimeout(() => listen(), 50);
      if (hooks.onConfigChanged) hooks.onConfigChanged(config);
      return { revision };
    },
    'GET /api/info': () => ({
      port: activePort,
      lanUrls: lanAddresses().map((ip) => `http://${ip}:${activePort}`),
      shareOnLan: !!config.shareOnLan,
      platform: process.platform,
      version: hooks.version || 'dev',
      loginItem: hooks.getLoginItem ? hooks.getLoginItem() : null,
      supporter: license.get(),
    }),
    'GET /api/system': () => {
      const total = os.totalmem();
      const free = os.freemem();
      return {
        cpu: Math.round(cpuPct),
        cores: os.cpus().length,
        memUsed: total - free,
        memTotal: total,
        uptime: os.uptime(),
        load: os.loadavg(),
        host: os.hostname().replace(/\.local$/, ''),
      };
    },
    'GET /api/geocode': async (req, url) => {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return { results: [] };
      const d = await cached('geo:' + q.toLowerCase(), 86400000, () =>
        getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=${encodeURIComponent(q)}`));
      return {
        results: (d.results || []).map((r) => ({
          name: r.name,
          label: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
          lat: r.latitude,
          lon: r.longitude,
        })),
      };
    },
    'GET /api/weather': async (req, url) => {
      const lat = Number(url.searchParams.get('lat'));
      const lon = Number(url.searchParams.get('lon'));
      const units = url.searchParams.get('units') === 'c' ? 'c' : 'f';
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw httpError(400, 'lat/lon required');
      const key = `wx:${lat.toFixed(2)},${lon.toFixed(2)}:${units}`;
      return cached(key, 10 * 60000, () => getJSON(
        'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
          latitude: lat, longitude: lon, timezone: 'auto', forecast_days: '7',
          current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
          hourly: 'temperature_2m,weather_code,precipitation_probability',
          temperature_unit: units === 'c' ? 'celsius' : 'fahrenheit',
          wind_speed_unit: units === 'c' ? 'kmh' : 'mph',
        })));
    },
    'GET /api/hn': async () => cached('hn', 10 * 60000, async () => {
      const ids = (await getJSON('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0, 30);
      const items = await Promise.all(ids.map((id) =>
        getJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null)));
      return {
        items: items.filter(Boolean).map((i) => ({
          title: i.title, score: i.score, comments: i.descendants || 0, time: i.time ? new Date(i.time * 1000).toISOString() : null,
          url: i.url || `https://news.ycombinator.com/item?id=${i.id}`, discuss: `https://news.ycombinator.com/item?id=${i.id}`,
          text: i.text ? String(i.text).replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').slice(0, 600) : '',
          host: i.url ? new URL(i.url).host.replace(/^www\./, '') : 'news.ycombinator.com',
        })),
      };
    }),
    'GET /api/crypto': async (req, url) => {
      const ids = (url.searchParams.get('ids') || 'bitcoin,ethereum').toLowerCase().replace(/[^a-z0-9,-]/g, '').split(',').filter(Boolean).slice(0, 12).join(',');
      const vs = (url.searchParams.get('vs') || 'usd').toLowerCase().replace(/[^a-z]/g, '') || 'usd';
      return cached(`crypto:${ids}:${vs}`, 3 * 60000, async () => ({
        vs,
        coins: (await getJSON(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs}&ids=${ids}&sparkline=true&price_change_percentage=24h`)).map((c) => ({
          id: c.id, name: c.name, symbol: String(c.symbol || '').toUpperCase(), price: c.current_price, change: c.price_change_percentage_24h,
          spark: ((c.sparkline_in_7d || {}).price || []).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 48)) === 0),
        })),
      }));
    },
    'GET /api/rss': async (req, url, local) => {
      const feed = feedUrl(url.searchParams.get('url') || '', 'rss');
      return cached('rss:' + feed + local, 10 * 60000, async () => sources.parseFeed((await sources.safeFetch(feed, { allowPrivate: local })).text));
    },
    'GET /api/ics': async (req, url, local) => {
      const feed = feedUrl(url.searchParams.get('url') || '', 'agenda');
      const days = Math.max(1, Math.min(60, Number(url.searchParams.get('days')) || 14));
      const text = await cached('ics:' + feed + local, 10 * 60000, async () => (await sources.safeFetch(feed, { allowPrivate: local, maxBytes: 8 * 1024 * 1024 })).text);
      return sources.parseIcs(text, { days });
    },
    'GET /api/scores': async (req, url) => {
      const league = (url.searchParams.get('league') || 'nba').toLowerCase();
      const token = feedUrl(url.searchParams.get('token') || '', 'scores');
      const key = 'scores:' + league + ':' + crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
      return cached(key, 60000, () => sources.scores(league, { token }));
    },
    'GET /api/air': async (req, url) => {
      const lat = Number(url.searchParams.get('lat')), lon = Number(url.searchParams.get('lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw httpError(400, 'lat/lon required');
      return cached(`air:${lat.toFixed(2)},${lon.toFixed(2)}`, 20 * 60000, () =>
        getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone&timezone=auto`));
    },
    'GET /api/nowplaying': async () => cached('np', 2500, () => sources.nowPlaying()),
    // Used by custom widgets: fetch any public page or API without CORS trouble.
    'GET /api/fetch': async (req, url, local) => {
      const target = url.searchParams.get('url') || '';
      const r = await cached('fetch:' + target + local, 30000, () => sources.safeFetch(target, { allowPrivate: local }));
      return { text: r.text, type: r.type };
    },
    'POST /api/media': async (req) => {
      const name = String(req.headers['x-filename'] || 'image.png');
      const ext = path.extname(name).toLowerCase();
      if (!MEDIA_EXT.has(ext)) throw httpError(400, 'Use a PNG, JPG, GIF or WebP image, or an MP4, MOV or WebM video');
      const buf = await readBody(req, 150 * 1024 * 1024);
      const file = crypto.randomUUID() + ext;
      fs.writeFileSync(path.join(mediaDir, file), buf);
      return { url: '/media/' + file };
    },
    'GET /api/displays': () => (hooks.listDisplays ? hooks.listDisplays() : { displays: [], open: [] }),
    'POST /api/open-display': async (req) => {
      const body = await readJSON(req);
      if (!hooks.openDisplay) throw httpError(501, 'Not available outside the app');
      return hooks.openDisplay(body);
    },
    'POST /api/close-display': async (req) => {
      const body = await readJSON(req);
      if (!hooks.closeDisplay) throw httpError(501, 'Not available outside the app');
      return hooks.closeDisplay(body);
    },
    'POST /api/supporter': async (req) => {
      const body = await readJSON(req);
      if (body.remove) return license.clear();
      const r = await license.set(String(body.key || ''));
      if (!r) throw httpError(400, "That key isn't valid. Check you copied all of it.");
      broadcast('supporter', r);
      return r;
    },
    'POST /api/login-item': async (req) => {
      const body = await readJSON(req);
      if (!hooks.setLoginItem) throw httpError(501, 'Not available outside the app');
      return hooks.setLoginItem(!!body.enabled);
    },
  };
  // Anything that changes state or touches this computer is only allowed from this computer.
  const LOCAL_ONLY = new Set(['PUT /api/config', 'POST /api/media', 'GET /api/displays',
    'POST /api/open-display', 'POST /api/close-display', 'POST /api/login-item', 'POST /api/supporter']);

  function httpError(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
  function readBody(req, limit = 2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) { reject(httpError(413, 'Too large')); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }
  async function readJSON(req) {
    const buf = await readBody(req);
    try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { throw httpError(400, 'Bad JSON'); }
  }
  function send(res, status, body, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  }
  function serveFile(res, root, rel, req) {
    const full = path.normalize(path.join(root, rel));
    if (!full.startsWith(path.normalize(root + path.sep))) return send(res, 403, { error: 'Forbidden' });
    const type = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream';
    if (req && type.startsWith('video/')) {
      let st;
      try { st = fs.statSync(full); } catch { return send(res, 404, { error: 'Not found' }); }
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (!m) {
        res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes' });
        return fs.createReadStream(full).pipe(res);
      }
      const start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${st.size}` });
      return fs.createReadStream(full, { start, end }).pipe(res);
    }
    fs.readFile(full, (err, buf) => {
      if (err) return send(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    // Requests a custom widget makes through the app's bridge are treated like requests
    // from another device, so imported widget code can only reach public addresses.
    const local = LOOPBACK.has(req.socket.remoteAddress) && req.headers['x-framedeck-sandbox'] !== '1';
    const route = `${req.method} ${url.pathname}`;
    // Only answer to addresses FrameDeck hands out, so a web page can't point its own
    // domain at this computer (DNS rebinding) and read or change the config.
    if (!allowedHost(req.headers.host, local)) return send(res, 421, { error: 'Unknown host' });
    try {
      if (url.pathname === '/api/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        res.write(`event: hello\ndata: ${JSON.stringify({ revision })}\n\n`);
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
      }
      if (api[route]) {
        // Pages from other sites (and sandboxed widget frames, whose origin is "null") may
        // not call the API directly. Browsers send these headers on every fetch.
        const site = req.headers['sec-fetch-site'];
        const origin = req.headers.origin;
        if (site === 'cross-site' || site === 'same-site' || (origin && origin !== `http://${req.headers.host}`)) {
          return send(res, 403, { error: 'Not allowed from another site' });
        }
        if (LOCAL_ONLY.has(route) && !local) return send(res, 403, { error: 'Only allowed from this computer' });
        // Changes need a custom header, which browsers won't send cross-site without permission,
        // so a web page (or a custom widget frame) can't quietly call these endpoints.
        if (req.method !== 'GET' && req.headers['x-framedeck'] !== '1') return send(res, 403, { error: 'Missing FrameDeck header' });
        return send(res, 200, await api[route](req, url, local));
      }
      if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Unknown endpoint' });
      if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
      if (url.pathname.startsWith('/media/')) return serveFile(res, mediaDir, decodeURIComponent(url.pathname.slice(7)), req);
      if (url.pathname === '/') {
        res.writeHead(302, { location: local ? '/editor.html' : '/display.html' });
        return res.end();
      }
      // Remote devices can only load the display page and the files it needs.
      if (!local && /editor/.test(url.pathname)) return send(res, 403, { error: 'The editor only opens on this computer' });
      return serveFile(res, staticDir, url.pathname.slice(1));
    } catch (err) {
      return send(res, err.status || 500, { error: err.message || 'Error' });
    }
  });

  let activePort = port;
  let listening = false;
  function listen() {
    return new Promise((resolve, reject) => {
      const host = config.shareOnLan ? '0.0.0.0' : '127.0.0.1';
      const start = () => {
        let attempt = 0;
        const tryPort = (p) => {
          const onErr = (err) => {
            if (err.code === 'EADDRINUSE' && attempt++ < 20) tryPort(p + 1);
            else reject(err);
          };
          server.once('error', onErr);
          server.listen(p, host, () => {
            server.off('error', onErr);
            activePort = p; listening = true; resolve(p);
          });
        };
        tryPort(activePort);
      };
      if (listening) {
        for (const c of clients) c.end();
        clients.clear();
        server.close(() => { listening = false; start(); });
        server.closeAllConnections?.();
      } else start();
    });
  }

  return {
    listen,
    get port() { return activePort; },
    get config() { return config; },
    broadcast,
    save: saveConfig,
    close: () => server.close(),
  };
}

function allowedHost(header, local) {
  const m = /^(\[[0-9a-f:.]+\]|[^:]+)(?::\d+)?$/i.exec(String(header || ''));
  if (!m) return false;
  const host = m[1].replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || net.isIP(host)) return true;
  // Other devices may also use this computer's name, e.g. http://my-pc.local:47820
  const name = os.hostname().toLowerCase().replace(/\.local$/, '');
  return !local && (host === name || host === name + '.local');
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

module.exports = { createServer };
