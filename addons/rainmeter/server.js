'use strict';
// Rainmeter add-on, server side: imports .rmskin / .zip skin packages into the add-on's data
// folder, lists them, serves their files to the widget, and measures the system the way
// Rainmeter skins expect (CPU per core, memory, swap, disks, network speed, uptime).
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { readZip } = require('./lib/zip');
const { fontFamily } = require('./lib/fontname');

// Only files a skin needs to be drawn. Plugins (.dll), programs and scripts are left out.
const KEEP = new Set(['.ini', '.inc', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.ttf', '.otf']);
const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.bmp': 'image/bmp', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.ini': 'text/plain; charset=utf-8', '.inc': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

// Rainmeter reads skins as UTF-16 (with a BOM), UTF-8, or the Windows code page.
function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf.subarray(2)).swap16().toString('utf16le');
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('windows-1252').decode(buf); }
}

// Where each file of a package goes: "Skins/<Suite>/...". Packages made by Rainmeter have a
// Skins/ folder; plain zips usually start with the suite folder, or are the suite itself.
function placeFiles(entries, fallbackName) {
  const clean = entries.filter((e) => !e.name.split('/').some((p) => p === '..' || p === '') && !/^[a-z]:/i.test(e.name) && !e.name.startsWith('__MACOSX/'));
  if (clean.some((e) => e.name.startsWith('Skins/'))) return clean.filter((e) => e.name.startsWith('Skins/')).map((e) => ({ e, to: e.name }));
  const top = new Set(clean.map((e) => e.name.split('/')[0]));
  const rootIni = clean.some((e) => !e.name.includes('/') && /\.ini$/i.test(e.name));
  if (rootIni || (top.size === 1 && clean.some((e) => /\.ini$/i.test(e.name) && e.name.split('/').length === 2) && !clean.some((e) => e.name.split('/')[1] === '@Resources'))) {
    // The zip is a single skin folder (or loose files): make it a suite of its own.
    const suite = rootIni ? fallbackName : [...top][0];
    return clean.map((e) => ({ e, to: `Skins/${suite}/${rootIni ? e.name : e.name.split('/').slice(1).join('/')}` }));
  }
  return clean.map((e) => ({ e, to: `Skins/${e.name}` }));
}

function listPackage(dir, id) {
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch { /* no details */ }
  const skins = [], fonts = [];
  const walk = (rel) => {
    for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) walk(r);
      else if (/\.ini$/i.test(d.name) && !r.split('/').includes('@Resources')) {
        const parts = r.split('/'); // Skins/Suite/Config/.../File.ini
        skins.push({ id: `${id}/${r}`, suite: parts[1], config: parts.slice(2, -1).join(' › '), file: parts[parts.length - 1].replace(/\.ini$/i, '') });
      } else if (/\.(ttf|otf)$/i.test(d.name)) {
        let family = null;
        try { family = fontFamily(fs.readFileSync(path.join(dir, r))); } catch { /* unreadable */ }
        if (family) fonts.push({ path: `${id}/${r}`, family });
      }
    }
  };
  if (fs.existsSync(path.join(dir, 'Skins'))) walk('Skins');
  skins.sort((a, b) => a.id.localeCompare(b.id));
  return { id, name: meta.name || id, author: meta.author || '', version: meta.version || '', skins, fonts };
}

// ---------- system measurements ----------
let cpuPrev = null, cpuLast = { at: 0, total: 0, cores: [] };
function cpu() {
  const now = Date.now();
  if (now - cpuLast.at < 800) return cpuLast;
  const cur = os.cpus().map((c) => { const t = c.times; return { idle: t.idle, total: t.user + t.nice + t.sys + t.idle + t.irq }; });
  let cores = cur.map(() => 0), total = 0;
  if (cpuPrev && cpuPrev.length === cur.length) {
    cores = cur.map((c, i) => { const dt = c.total - cpuPrev[i].total; return dt > 0 ? Math.max(0, Math.min(100, 100 * (1 - (c.idle - cpuPrev[i].idle) / dt))) : 0; });
    total = cores.reduce((a, b) => a + b, 0) / cores.length;
  }
  cpuPrev = cur;
  cpuLast = { at: now, total, cores };
  return cpuLast;
}

const run = (cmd, args) => new Promise((resolve) => execFile(cmd, args, { timeout: 4000 }, (err, out) => resolve(err ? '' : String(out))));

// Total bytes in and out over all network interfaces, read the system's way.
async function netTotals() {
  if (process.platform === 'linux') {
    try {
      let rx = 0, tx = 0;
      for (const line of fs.readFileSync('/proc/net/dev', 'utf8').split('\n').slice(2)) {
        const m = /^\s*([^:]+):\s*(.*)$/.exec(line);
        if (!m || m[1].trim() === 'lo') continue;
        const f = m[2].trim().split(/\s+/).map(Number);
        rx += f[0] || 0; tx += f[8] || 0;
      }
      return { rx, tx };
    } catch { return null; }
  }
  if (process.platform === 'darwin') {
    const out = await run('netstat', ['-ibn']);
    let rx = 0, tx = 0;
    const seen = new Set();
    for (const line of out.split('\n').slice(1)) {
      const f = line.trim().split(/\s+/);
      if (f.length < 10 || !f[2].startsWith('<Link#') || f[0].startsWith('lo') || seen.has(f[0])) continue;
      seen.add(f[0]);
      const n = f.length;
      rx += Number(f[n - 5]) || 0; tx += Number(f[n - 2]) || 0;
    }
    return { rx, tx };
  }
  if (process.platform === 'win32') {
    const m = /Bytes\s+(\d+)\s+(\d+)/.exec(await run('netstat', ['-e']));
    return m ? { rx: Number(m[1]), tx: Number(m[2]) } : null;
  }
  return null;
}
let netPrev = null, netRate = { in: 0, out: 0, totalIn: 0, totalOut: 0 }, netBusy = false;
async function net() {
  if (netBusy || (netPrev && Date.now() - netPrev.at < 900)) return netRate;
  netBusy = true;
  try {
    const t = await netTotals();
    if (t) {
      const now = Date.now();
      if (netPrev) {
        const dt = (now - netPrev.at) / 1000;
        netRate = { in: Math.max(0, (t.rx - netPrev.rx) / dt), out: Math.max(0, (t.tx - netPrev.tx) / dt), totalIn: t.rx, totalOut: t.tx };
      }
      netPrev = { ...t, at: now };
    }
  } finally { netBusy = false; }
  return netRate;
}

let swapCache = { at: 0, used: 0, total: 0 };
async function swap() {
  if (Date.now() - swapCache.at < 10000) return swapCache;
  let used = 0, total = 0;
  if (process.platform === 'linux') {
    try {
      const mi = fs.readFileSync('/proc/meminfo', 'utf8');
      const kb = (k) => Number((new RegExp(`^${k}:\\s+(\\d+)`, 'm').exec(mi) || [])[1] || 0) * 1024;
      total = kb('SwapTotal'); used = total - kb('SwapFree');
    } catch { /* none */ }
  } else if (process.platform === 'darwin') {
    const m = /total = ([\d.]+)M\s+used = ([\d.]+)M/.exec(await run('sysctl', ['vm.swapusage']));
    if (m) { total = Number(m[1]) * 1048576; used = Number(m[2]) * 1048576; }
  }
  swapCache = { at: Date.now(), used, total };
  return swapCache;
}

// Used memory. macOS counts its file cache as used, so ask vm_stat like Activity Monitor does.
let memCache = { at: 0, used: 0 };
async function memoryUsed() {
  const total = os.totalmem();
  if (process.platform !== 'darwin') return total - os.freemem();
  if (Date.now() - memCache.at < 3000) return memCache.used;
  const out = await run('vm_stat', []);
  const page = Number((/page size of (\d+)/.exec(out) || [])[1] || 4096);
  const pages = (label) => Number((new RegExp(`${label}:\\s+(\\d+)`).exec(out) || [])[1] || 0);
  const used = (pages('Pages active') + pages('Pages wired down') + pages('Pages occupied by compressor')) * page;
  memCache = { at: Date.now(), used: used > 0 && used <= total ? used : total - os.freemem() };
  return memCache.used;
}

// Rainmeter names drives by letter. Windows has real ones; elsewhere C: is the main disk.
function disks() {
  const out = {};
  const add = (letter, root, label) => {
    try {
      const s = fs.statfsSync(root);
      out[letter] = { free: s.bavail * s.bsize, total: s.blocks * s.bsize, label };
    } catch { /* not mounted */ }
  };
  if (process.platform === 'win32') { for (const l of 'CDEFGHIJKLMNOPQRSTUVWXYZ') if (fs.existsSync(`${l}:\\`)) add(`${l}:`, `${l}:\\`, ''); }
  else add('C:', '/', process.platform === 'darwin' ? 'Macintosh HD' : '/');
  return out;
}

function lanIp() {
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) return a.address;
  return '';
}

module.exports = {
  localOnly: ['POST /import', 'POST /delete'],
  routes: {
    'GET /skins': (req, url, local, kit) => {
      const out = [];
      for (const d of fs.readdirSync(kit.dataDir, { withFileTypes: true })) if (d.isDirectory()) out.push(listPackage(path.join(kit.dataDir, d.name), d.name));
      return { packages: out.sort((a, b) => a.name.localeCompare(b.name)) };
    },

    'POST /import': async (req, url, local, kit) => {
      const file = String(req.headers['x-filename'] || 'skin.rmskin');
      const buf = await kit.readBody(req, 150 * 1024 * 1024);
      const entries = readZip(buf);
      const metaEntry = entries.find((e) => /^rmskin\.ini$/i.test(e.name));
      const meta = {};
      if (metaEntry) {
        for (const line of decodeText(metaEntry.read()).split(/\r?\n/)) {
          const m = /^\s*(Name|Author|Version)\s*=\s*(.*)$/i.exec(line);
          if (m) meta[m[1].toLowerCase()] = m[2].trim();
        }
      }
      const name = meta.name || file.replace(/\.(rmskin|zip)$/i, '');
      const placed = placeFiles(entries, name.replace(/[\\/:*?"<>|]/g, '').trim() || 'Skin')
        .filter(({ to }) => KEEP.has(path.extname(to).toLowerCase()));
      if (!placed.some(({ to }) => /\.ini$/i.test(to) && !to.split('/').includes('@Resources'))) throw kit.httpError(400, 'No Rainmeter skins found in this file');
      const id = (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'skin') + '-' + crypto.randomBytes(3).toString('hex');
      const dir = path.join(kit.dataDir, id);
      for (const { e, to } of placed) {
        const target = path.join(dir, to);
        if (!target.startsWith(dir + path.sep)) continue;
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, e.read());
      }
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ name, author: meta.author || '', version: meta.version || '', imported: new Date().toISOString() }));
      return listPackage(dir, id);
    },

    'POST /delete': async (req, url, local, kit) => {
      const { id } = await kit.readJSON(req);
      if (!/^[a-z0-9-]+$/.test(String(id || ''))) throw kit.httpError(400, 'Unknown skin package');
      fs.rmSync(path.join(kit.dataDir, id), { recursive: true, force: true });
      return { ok: true };
    },

    // A file from a package: /file?p=<package>/Skins/... Text files come back as UTF-8.
    'GET /file': (req, url, local, kit) => {
      const rel = String(url.searchParams.get('p') || '');
      const full = path.normalize(path.join(kit.dataDir, rel));
      if (!full.startsWith(kit.dataDir + path.sep) || path.basename(full) === 'meta.json') throw kit.httpError(403, 'Not allowed');
      const ext = path.extname(full).toLowerCase();
      let buf;
      try { buf = fs.readFileSync(full); } catch { throw kit.httpError(404, 'Not found'); }
      if (ext === '.ini' || ext === '.inc' || ext === '.txt') return kit.raw(decodeText(buf), TYPES[ext]);
      return kit.raw(buf, TYPES[ext] || 'application/octet-stream');
    },

    'GET /system': async (req, url, local) => {
      const c = cpu();
      const total = os.totalmem();
      const [n, s, used] = await Promise.all([net(), swap(), memoryUsed()]);
      return {
        cpu: c.total, cores: c.cores,
        memory: { used, total },
        swap: { used: s.used, total: s.total },
        disks: disks(),
        net: n,
        uptime: os.uptime(),
        host: os.hostname().replace(/\.local$/, ''),
        user: local ? os.userInfo().username : '',
        os: `${os.type()} ${os.release()}`,
        ip: lanIp(),
      };
    },
  },
  // for the add-on's tests
  _internal: { decodeText, placeFiles },
};
