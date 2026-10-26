'use strict';
// Data sources for the newer widgets, plus a safe fetch proxy for custom widgets.
const dns = require('dns').promises;
const net = require('net');
const { execFile } = require('child_process');

const UA = { 'user-agent': 'FrameDeck/0.2 (+https://github.com/Asmo7791/framedeck)' };

// ---------- safe fetching ----------
function isPrivateIp(ip) {
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const l = ip.toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80');
}

// Fetch a URL. Requests that come from other devices on the network may only
// reach public addresses, so a shared display can't be used to probe your LAN.
// Requests from this computer may reach local services (Home Assistant, a Pi, ...).
async function safeFetch(rawUrl, { allowPrivate = false, maxBytes = 3 * 1024 * 1024, timeout = 12000 } = {}) {
  let url = String(rawUrl || '').trim().replace(/^webcal:/i, 'https:');
  for (let hop = 0; hop < 4; hop++) {
    let u;
    try { u = new URL(url); } catch { throw Object.assign(new Error('Invalid address'), { status: 400 }); }
    if (!/^https?:$/.test(u.protocol)) throw Object.assign(new Error('Only http and https addresses are allowed'), { status: 400 });
    if (!allowPrivate) {
      const host = u.hostname.replace(/^\[|\]$/g, '');
      const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
      if (addrs.some((a) => isPrivateIp(a.address))) throw Object.assign(new Error('Local network addresses only work on the computer running FrameDeck'), { status: 403 });
    }
    const r = await fetch(url, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(timeout) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location'), url).toString(); continue; }
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} from ${u.host}`), { status: 502 });
    const reader = r.body.getReader();
    const chunks = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) { reader.cancel(); throw Object.assign(new Error('Response too large'), { status: 413 }); }
      chunks.push(value);
    }
    return { text: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8'), type: r.headers.get('content-type') || '' };
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
async function scores(league) {
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

module.exports = { safeFetch, isPrivateIp, parseFeed, parseIcs, scores, nowPlaying, LEAGUES };
