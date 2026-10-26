'use strict';
// Data sources for the newer widgets, plus a safe fetch proxy for custom widgets.
const dns = require('dns').promises;
const net = require('net');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const { execFile } = require('child_process');

const UA = { 'user-agent': 'FrameDeck/0.2 (+https://github.com/Asmo7791/framedeck)' };

// ---------- safe fetching ----------
function isPrivateIp(ip) {
  if (/^::ffff:/i.test(ip) && net.isIPv4(ip.slice(7))) ip = ip.slice(7);
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const l = ip.toLowerCase();
  // Loopback, unspecified, IPv4-mapped/compatible written in hex, unique-local, link-local,
  // and the NAT64 / 6to4 ranges that can wrap a private IPv4 address.
  return l.startsWith('::') || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe8') ||
    l.startsWith('fe9') || l.startsWith('fea') || l.startsWith('feb') || l.startsWith('64:ff9b:') || l.startsWith('2002:');
}

const blocked = () => Object.assign(new Error('Local network addresses only work on the computer running FrameDeck'), { status: 403 });

// DNS lookup that refuses private addresses. It runs as part of connecting, so the address
// that's checked is the one used (a second lookup can't swap in a private one).
function publicLookup(hostname, options, cb) {
  if (typeof options === 'function') { cb = options; options = {}; }
  dns.lookup(hostname, { ...options, all: true }).then((addrs) => {
    if (!addrs.length) return cb(Object.assign(new Error('Address not found'), { code: 'ENOTFOUND' }));
    if (addrs.some((a) => isPrivateIp(a.address))) return cb(blocked());
    if (options.all) cb(null, addrs);
    else cb(null, addrs[0].address, addrs[0].family);
  }, cb);
}

function request(u, { allowPrivate, timeout }) {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.get(u, {
      headers: { ...UA, 'accept-encoding': 'gzip, deflate, br' },
      lookup: allowPrivate ? undefined : publicLookup,
      timeout,
    }, resolve);
    req.on('timeout', () => req.destroy(Object.assign(new Error('Timed out'), { status: 504 })));
    req.on('error', reject);
  });
}

function readBody(res, maxBytes) {
  const enc = String(res.headers['content-encoding'] || '').toLowerCase();
  const stream = enc === 'gzip' ? res.pipe(zlib.createGunzip()) : enc === 'deflate' ? res.pipe(zlib.createInflate())
    : enc === 'br' ? res.pipe(zlib.createBrotliDecompress()) : res;
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    stream.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) { res.destroy(); stream.destroy(); reject(Object.assign(new Error('Response too large'), { status: 413 })); return; }
      chunks.push(c);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
    res.on('error', reject);
  });
}

// Fetch a URL. Requests that come from other devices on the network, or from custom widget
// code, may only reach public addresses, so they can't be used to probe your LAN.
// Built-in widgets on this computer may reach local services (Home Assistant, a Pi, ...).
async function safeFetch(rawUrl, { allowPrivate = false, maxBytes = 3 * 1024 * 1024, timeout = 12000 } = {}) {
  let url = String(rawUrl || '').trim().replace(/^webcal:/i, 'https:');
  for (let hop = 0; hop < 4; hop++) {
    let u;
    try { u = new URL(url); } catch { throw Object.assign(new Error('Invalid address'), { status: 400 }); }
    if (!/^https?:$/.test(u.protocol)) throw Object.assign(new Error('Only http and https addresses are allowed'), { status: 400 });
    // IP addresses skip DNS (and publicLookup), so check them here.
    const host = u.hostname.replace(/^\[|\]$/g, '');
    if (!allowPrivate && net.isIP(host) && isPrivateIp(host)) throw blocked();
    const res = await request(u, { allowPrivate, timeout });
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      url = new URL(res.headers.location, url).toString();
      continue;
    }
    if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); throw Object.assign(new Error(`HTTP ${res.statusCode} from ${u.host}`), { status: 502 }); }
    return { text: await readBody(res, maxBytes), type: res.headers['content-type'] || '' };
  }
  throw Object.assign(new Error('Too many redirects'), { status: 502 });
}

// ---------- RSS / Atom ----------
const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
    const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    if (map[e.toLowerCase()]) return map[e.toLowerCase()];
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  })
  .replace(/\s+/g, ' ').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')); return m ? m[1] : ''; };

function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) || [];
  const head = xml.slice(0, xml.search(isAtom ? /<entry[\s>]/i : /<item[\s>]/i) >>> 0);
  const items = blocks.slice(0, 30).map((b) => {
    let link = decode(tag(b, 'link'));
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    const date = decode(tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date'));
    const desc = decode(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content'));
    return { title: decode(tag(b, 'title')), link, desc: desc.length > 500 ? desc.slice(0, 497) + '…' : desc, date: date && !isNaN(Date.parse(date)) ? new Date(date).toISOString() : null };
  }).filter((i) => i.title);
  return { title: decode(tag(head, 'title')), items };
}

// ---------- iCalendar ----------
function parseIcsDate(v, params) {
  const m = String(v).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || /VALUE=DATE(?!-)/.test(params || '')) return { date: new Date(+y, +mo - 1, +d), allDay: true };
  // TZID times are treated as this computer's local time, which is right for most personal calendars.
  return { date: z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : new Date(+y, +mo - 1, +d, +h, +mi, +s), allDay: false };
}

function parseIcs(text, { days = 14, now = new Date() } = {}) {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const events = []; let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';');
    const val = line.slice(i + 1);
    const p = params.join(';');
    if (name === 'DTSTART') cur.start = parseIcsDate(val, p);
    else if (name === 'DTEND') cur.end = parseIcsDate(val, p);
    else if (name === 'SUMMARY') cur.title = val.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
    else if (name === 'LOCATION') cur.location = val.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
    else if (name === 'RRULE') cur.rrule = Object.fromEntries(val.split(';').map((kv) => kv.split('=')));
    else if (name === 'STATUS') cur.status = val;
  }
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from.getTime() + days * 86400000);
  const out = [];
  const DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  for (const ev of events) {
    if (!ev.start || ev.status === 'CANCELLED') continue;
    const dur = ev.end ? ev.end.date - ev.start.date : 0;
    const push = (d) => { if (d >= from && d < to || (d < from && d.getTime() + dur > from.getTime())) out.push({ title: ev.title || '(No title)', location: ev.location || '', start: d.toISOString(), end: new Date(d.getTime() + dur).toISOString(), allDay: ev.start.allDay }); };
    if (!ev.rrule) { push(ev.start.date); continue; }
    // Simple repeating events: DAILY / WEEKLY (with BYDAY) / MONTHLY / YEARLY, INTERVAL, COUNT, UNTIL.
    const r = ev.rrule; const interval = Number(r.INTERVAL || 1);
    const until = r.UNTIL ? (parseIcsDate(r.UNTIL) || {}).date : null;
    let count = r.COUNT ? Number(r.COUNT) : Infinity;
    const byday = r.BYDAY ? r.BYDAY.split(',').map((x) => DOW[x.slice(-2)]).filter((x) => x !== undefined) : null;
    let d = new Date(ev.start.date);
    for (let guard = 0; guard < 2000 && count > 0 && d < to && (!until || d <= until); guard++) {
      if (r.FREQ === 'WEEKLY' && byday) {
        const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
        for (const wd of byday.sort()) {
          const x = new Date(weekStart); x.setDate(weekStart.getDate() + wd);
          x.setHours(ev.start.date.getHours(), ev.start.date.getMinutes(), 0, 0);
          if (x < ev.start.date || count <= 0 || (until && x > until)) continue;
          count--; push(x);
        }
        d = new Date(weekStart); d.setDate(weekStart.getDate() + 7 * interval);
        d.setHours(ev.start.date.getHours(), ev.start.date.getMinutes(), 0, 0);
        continue;
      }
      count--; push(new Date(d));
      if (r.FREQ === 'DAILY') d.setDate(d.getDate() + interval);
      else if (r.FREQ === 'WEEKLY') d.setDate(d.getDate() + 7 * interval);
      else if (r.FREQ === 'MONTHLY') d.setMonth(d.getMonth() + interval);
      else if (r.FREQ === 'YEARLY') d.setFullYear(d.getFullYear() + interval);
      else break;
    }
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return { events: out.slice(0, 60) };
}

// ---------- sports (ESPN public scoreboard) ----------
const LEAGUES = {
  nba: 'basketball/nba', wnba: 'basketball/wnba', ncaamb: 'basketball/mens-college-basketball',
  nfl: 'football/nfl', ncaaf: 'football/college-football', mlb: 'baseball/mlb', nhl: 'hockey/nhl',
  epl: 'soccer/eng.1', laliga: 'soccer/esp.1', seriea: 'soccer/ita.1', bundesliga: 'soccer/ger.1',
  ligue1: 'soccer/fra.1', mls: 'soccer/usa.1', ucl: 'soccer/uefa.champions',
};
// Esports: Dota 2 from OpenDota (no account needed); other games from PandaScore with a free token.
const PANDASCORE = { lol: ['lol', 'League of Legends'], cs2: ['csgo', 'Counter-Strike 2'], valorant: ['valorant', 'Valorant'],
  overwatch: ['ow', 'Overwatch'], r6: ['r6siege', 'Rainbow Six Siege'], rocketleague: ['rl', 'Rocket League'] };
const short = (name) => String(name || '').trim();
// FrameDeck's shared esports relay (relay/worker.js), used when a widget has no token of its own.
// Set FRAMEDECK_ESPORTS_RELAY to use a different one, or to "off" to require a token.
const DEFAULT_ESPORTS_RELAY = '';
const esportsRelay = () => (process.env.FRAMEDECK_ESPORTS_RELAY === 'off' ? '' : (process.env.FRAMEDECK_ESPORTS_RELAY || DEFAULT_ESPORTS_RELAY));

async function dota() {
  const get = async (p) => { const r = await fetch('https://api.opendota.com/api/' + p, { headers: UA, signal: AbortSignal.timeout(12000) }); if (!r.ok) throw new Error(`HTTP ${r.status} from OpenDota`); return r.json(); };
  const [past, live] = await Promise.all([get('proMatches'), get('live').catch(() => [])]);
  // The live list keeps games for a while after they end (deactivate_time set), so skip those.
  const finished = new Set(past.map((m) => String(m.match_id)));
  const liveGames = live.filter((m) => m.league_id > 0 && m.team_name_radiant && m.team_name_dire && !m.deactivate_time && !finished.has(String(m.match_id))).map((m) => ({
    id: 'live' + m.match_id, date: new Date((m.activate_time || Date.now() / 1000) * 1000).toISOString(), state: 'in',
    detail: `Live · ${Math.floor((m.game_time || 0) / 60)} min`,
    home: { abbr: short(m.team_name_radiant), name: short(m.team_name_radiant), score: m.radiant_score ?? '', logo: '', winner: false },
    away: { abbr: short(m.team_name_dire), name: short(m.team_name_dire), score: m.dire_score ?? '', logo: '', winner: false },
  }));
  const done = past.filter((m) => m.radiant_name && m.dire_name).slice(0, 20).map((m) => ({
    id: String(m.match_id), date: new Date((m.start_time + (m.duration || 0)) * 1000).toISOString(), state: 'post', detail: m.league_name || 'Final',
    home: { abbr: short(m.radiant_name), name: short(m.radiant_name), score: m.radiant_score ?? '', logo: '', winner: !!m.radiant_win },
    away: { abbr: short(m.dire_name), name: short(m.dire_name), score: m.dire_score ?? '', logo: '', winner: m.radiant_win === false },
  }));
  return { league: 'DOTA 2', esports: true, games: [...liveGames, ...done] };
}

async function pandascore(game, token) {
  const [slug, label] = PANDASCORE[game];
  if (!token && !esportsRelay()) throw Object.assign(new Error('Paste a free PandaScore token in this widget\'s settings (sign up at pandascore.co)'), { status: 400 });
  // With a token, ask PandaScore directly; without one, ask the shared relay, which adds its own.
  const get = async (kind, n) => {
    const r = token
      ? await fetch(`https://api.pandascore.co/${slug}/matches/${kind}?per_page=${n}`, { headers: { ...UA, authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(12000) })
      : await fetch(`${esportsRelay().replace(/\/$/, '')}/pandascore/${slug}/matches/${kind}?per_page=${n}`, { headers: UA, signal: AbortSignal.timeout(12000) });
    if (token && (r.status === 401 || r.status === 403)) throw Object.assign(new Error('PandaScore didn\'t accept that token'), { status: 400 });
    if (!r.ok) throw new Error(token ? `HTTP ${r.status} from PandaScore` : 'The shared esports feed is unavailable right now. Paste your own free PandaScore token to use it directly.');
    return r.json();
  };
  const [running, upcoming, past] = await Promise.all([get('running', 10), get('upcoming', 10), get('past', 10)]);
  const STATE = { running: 'in', not_started: 'pre', finished: 'post' };
  const games = [...running, ...upcoming, ...past].filter((m) => (m.opponents || []).length === 2 && STATE[m.status]).map((m) => {
    const team = (i) => {
      const t = m.opponents[i].opponent || {};
      const res = (m.results || []).find((x) => x.team_id === t.id) || {};
      return { abbr: short(t.acronym || t.name), name: short(t.name), score: m.status === 'not_started' ? '' : (res.score ?? ''), logo: t.image_url || '', winner: m.winner_id === t.id };
    };
    const league = [m.league && m.league.name, m.serie && m.serie.full_name].filter(Boolean).join(' · ');
    return { id: String(m.id), date: m.begin_at || m.scheduled_at || new Date().toISOString(), state: STATE[m.status],
      detail: [m.status === 'running' ? 'Live' : m.number_of_games ? 'Bo' + m.number_of_games : '', league].filter(Boolean).join(' · '),
      home: team(0), away: team(1) };
  });
  return { league: label.toUpperCase(), esports: true, games };
}

async function scores(league, { token } = {}) {
  if (league === 'dota2') return dota();
  if (PANDASCORE[league]) return pandascore(league, token);
  const path = LEAGUES[league];
  if (!path) throw Object.assign(new Error('Unknown league'), { status: 400 });
  const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`, { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ESPN`);
  const d = await r.json();
  return {
    league: (d.leagues && d.leagues[0] && d.leagues[0].abbreviation) || league.toUpperCase(),
    games: (d.events || []).map((e) => {
      const c = (e.competitions || [])[0] || {};
      const team = (side) => {
        const t = (c.competitors || []).find((x) => x.homeAway === side) || {};
        return { abbr: (t.team || {}).abbreviation || '', name: (t.team || {}).shortDisplayName || (t.team || {}).displayName || '', score: t.score ?? '', logo: (t.team || {}).logo || '', winner: !!t.winner };
      };
      return { id: e.id, date: e.date, state: ((e.status || {}).type || {}).state || 'pre', detail: ((e.status || {}).type || {}).shortDetail || '', home: team('home'), away: team('away') };
    }),
  };
}

// ---------- now playing (macOS) ----------
const NOW_PLAYING_SCRIPT = `
set out to ""
if application "Spotify" is running then
  tell application "Spotify"
    if player state is playing or player state is paused then
      set out to "Spotify" & tab & (player state as string) & tab & (name of current track) & tab & (artist of current track) & tab & (album of current track) & tab & (artwork url of current track) & tab & (player position as string) & tab & ((duration of current track) / 1000 as string)
    end if
  end tell
end if
if out is "" and application "Music" is running then
  tell application "Music"
    if player state is playing or player state is paused then
      set out to "Music" & tab & (player state as string) & tab & (name of current track) & tab & (artist of current track) & tab & (album of current track) & tab & "" & tab & (player position as string) & tab & (duration of current track as string)
    end if
  end tell
end if
return out`;
function nowPlaying() {
  if (process.platform !== 'darwin') return Promise.resolve({ playing: false, unsupported: true });
  return new Promise((resolve) => {
    execFile('osascript', ['-e', NOW_PLAYING_SCRIPT], { timeout: 4000 }, (err, stdout) => {
      if (err) return resolve({ playing: false, error: /Not authorized|-1743/.test(String(err.message)) ? 'Allow FrameDeck to control Spotify or Music in System Settings → Privacy & Security → Automation' : null });
      const parts = String(stdout).trim().split('\t');
      if (parts.length < 5) return resolve({ playing: false });
      const num = (s) => Number(String(s).replace(',', '.')) || 0;
      resolve({ playing: parts[1] === 'playing', state: parts[1], app: parts[0], title: parts[2], artist: parts[3], album: parts[4], art: parts[5] || '', position: num(parts[6]), duration: num(parts[7]) });
    });
  });
}

module.exports = { safeFetch, isPrivateIp, parseFeed, parseIcs, scores, nowPlaying, LEAGUES, PANDASCORE };
