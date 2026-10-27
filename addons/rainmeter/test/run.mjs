// Tests for the Rainmeter add-on. Run with `node addons/rainmeter/test/run.mjs`
// (FrameDeck's `npm run check` runs every add-on's test/run.mjs).
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const F = require('../client/formula.js');
const E = require('../client/engine.js');
const server = require('../server.js');
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} rainmeter: ${msg}`); if (!cond) failed++; };

// ---------- helpers ----------
ok(F.evaluate('(2.5 + 100) * 2') === 205 && F.evaluate('2 ** 3') === 8 && F.evaluate('5 ^ 1') === 4, 'formula operators (** is power, ^ is XOR)');
ok(F.evaluate('A > 1 ? 10 : 20', (n) => ({ A: 2 }[n])) === 10, 'formula conditions read measures');
ok((() => { try { F.evaluate('constructor("x")()'); return false; } catch { return true; } })(), 'formulas never run code');
ok(F.resolveParens('(255*0.5),255,255', () => 0) === '127.5,255,255', 'formulas inside option values');
const f = { y: 2026, mo: 0, d: 5, h: 14, mi: 3, s: 9, wd: 1, yd: 5 };
ok(E.strftime('%A %#d %B %Y, %#I:%M %p', f) === 'Monday 5 January 2026, 2:03 PM', 'time formats, with # removing leading zeros');
ok(E.toJsRegex('(?siU)<b>(.*)</b>').exec('<B>1</b><b>2</b>')[1] === '1', 'WebParser (?siU) patterns become lazy and case-insensitive');
ok(JSON.stringify(E.parseBangs('[!SetOption M FontColor "1,2,3"][!HideMeter X]["notepad.exe"]')) === '[["!setoption","M","FontColor","1,2,3"],["!hidemeter","X"]]', 'actions keep bangs and skip programs');
ok(E.formatNumber(1536, { autoScale: 1 }) === '1.5k' && E.formatNumber(42.6, {}) === '43', 'number formatting with AutoScale');
ok(E.uptimeFormat('%4!i!d %3!i!:%2!02i!', 200000) === '2d 7:33', 'uptime format');

// ---------- skins ----------
const readText = async (p) => fs.readFileSync(path.join(here, 'skins', p.replace(/^Skins\//, '')), 'utf8');
const measureText = (css, text, px) => ({ w: Math.max(...String(text).split('\n').map((l) => l.length)) * px * 0.5, h: String(text).split('\n').length * px * 1.2 });
const system = { cpu: 37, cores: [30, 44], memory: { used: 8e9, total: 16e9 }, disks: { 'C:': { free: 120e9, total: 500e9 } }, net: { in: 1000, out: 10 }, uptime: 200000 };
const now = new Date(2026, 9, 27, 14, 0, 5).getTime();

const clock = await E.Skin.load('Skins/FrameDeckTest/Clock/Clock.ini', readText);
clock.tick({ now, system });
clock.layout(measureText);
const meter = (skin, name) => skin.meters.find((m) => m.name === name);
ok(meter(clock, 'MeterLabel').text === "14 o'clock", '@Include variables, MeterStyle and %1 text');
ok(JSON.stringify(clock.color('meterlabel', 'FontColor')) === '[255,140,60,255]', 'IfCondition runs !SetOption');
ok(meter(clock, 'MeterHidden').hidden === true, '!HideMeter hides a meter');
ok(meter(clock, 'MeterGreeting').text === 'Hello', 'OnRefreshAction sets a variable');
ok(meter(clock, 'MeterLabel').box.y === 115, 'relative positions (5R below the previous meter)');
ok(Math.abs(clock.meterValue(meter(clock, 'MeterSecondHand')) - 5 / 60) < 1e-9, 'Roundline with ValueRemainder follows the seconds');
ok(meter(clock, 'MeterFace').box.w === 111 && clock.unsupported.size === 0, 'Shape meters size themselves; nothing unsupported');

const sys = await E.Skin.load('Skins/FrameDeckTest/System/System.ini', readText);
const page = '<TITLE>A &amp; B</title> filler <title>Second</title> <title>Third</title>';
sys.tick({ now, system, fetchText: async () => page });
await new Promise((r) => setTimeout(r, 5));
sys.tick({ now: now + 1000, system, fetchText: async () => page });
sys.layout(measureText);
ok(meter(sys, 'MeterWeb').text === 'A & B / Second', 'WebParser: lazy regex, child StringIndex, Substitute');
ok([...sys.unsupported].join() === 'Plugin=AudioLevel', 'unsupported plugins are reported');
ok(meter(sys, 'MeterDisk').text === '353.9GB used', 'FreeDiskSpace with InvertMeasure and AutoScale');
ok(meter(sys, 'MeterUptime').text === '2d 7:33', 'Uptime measure');
ok(Math.abs(sys.meterValue(meter(sys, 'MeterBar')) - 0.37) < 1e-9, 'Bar shows CPU from 0 to 100');
ok(meter(sys, 'MeterGraph').history.length === 2 && meter(sys, 'MeterGraph').history[1].length === 2, 'Line meter keeps a history per line');
const disk = meter(sys, 'MeterDisk').box;
ok(Math.abs(disk.x + disk.w - 110) < 1e-9, 'right-aligned text ends at X');

// ---------- server ----------
const { decodeText, placeFiles } = server._internal;
ok(decodeText(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Text=héllo', 'utf16le')])) === 'Text=héllo', 'UTF-16 skins are decoded');
ok(decodeText(Buffer.from([0x54, 0x3d, 0xbb])) === 'T=»', 'Windows-1252 skins are decoded');
const names = (list) => placeFiles(list.map((name) => ({ name })), 'Pkg').map((x) => x.to).join('|');
ok(names(['Skins/A/B/x.ini', 'Plugins/64bit/x.dll']) === 'Skins/A/B/x.ini', '.rmskin packages keep only Skins/');
ok(names(['Suite/@Resources/a.png', 'Suite/Clock/c.ini']) === 'Skins/Suite/@Resources/a.png|Skins/Suite/Clock/c.ini', 'a zipped suite folder');
ok(names(['clock.ini']) === 'Skins/Pkg/clock.ini', 'a loose skin file');

// Import a real zip (deflated) into a temporary folder, including files that must be refused.
function makeZip(files) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content), packed = zlib.deflateRawSync(data), nameBuf = Buffer.from(name);
    const crc = zlib.crc32 ? zlib.crc32(data) : 0;
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x800, 6); head.writeUInt16LE(8, 8);
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nameBuf.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x800, 8); cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(packed.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(nameBuf.length, 28); cd.writeUInt32LE(offset, 42);
    local.push(head, nameBuf, packed);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const cdBuf = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cdBuf, end, Buffer.from('RMSKIN\0\0\0\0\0\0\0\0\0\0')]); // plus an .rmskin-style footer
}
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'framedeck-rm-'));
const kit = {
  dataDir,
  readBody: async (req) => req.body,
  readJSON: async (req) => JSON.parse(req.body),
  httpError: (status, message) => Object.assign(new Error(message), { status }),
  raw: (body, type) => ({ raw: true, body, type }),
};
try {
  const zip = makeZip({
    'RMSKIN.ini': '[rmskin]\nName=Test Pack\nAuthor=Me\n',
    'Skins/Test Pack/Clock/Clock.ini': '[Rainmeter]\nUpdate=1000\n[M]\nMeter=String\nText=Hi\n',
    'Skins/Test Pack/@Resources/Fonts/readme.txt': 'fonts go here',
    'Skins/Test Pack/@Resources/run.exe': 'MZ',
    'Skins/../escape.ini': '[x]',
    'Plugins/64bit/AudioLevel.dll': 'MZ',
  });
  const pkg = await server.routes['POST /import']({ headers: { 'x-filename': 'test.rmskin' }, body: zip }, null, true, kit);
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(path.relative(dataDir, p)); } };
  walk(dataDir);
  ok(pkg.name === 'Test Pack' && pkg.skins.length === 1 && pkg.skins[0].file === 'Clock', 'importing an .rmskin lists its skins');
  ok(!files.some((f) => /\.(exe|dll)$/.test(f) || f.includes('escape')), 'imports skip programs, plugins and paths outside the package');
  const got = await server.routes['GET /file']({}, new URL('http://x/?p=' + encodeURIComponent(pkg.skins[0].id)), true, kit);
  ok(String(got.body).includes('Text=Hi'), 'skin files are served');
  let blocked = false;
  try { await server.routes['GET /file']({}, new URL('http://x/?p=' + encodeURIComponent('../../etc/passwd')), true, kit); } catch (e) { blocked = e.status === 403; }
  ok(blocked, 'files outside the add-on folder are refused');
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}

// Rainmeter's own default skins, when a copy is available locally (they aren't part of this repo).
if (process.env.RM_FIXTURES) {
  for (const ini of ['illustro/System/System.ini', 'illustro/Clock/Clock.ini', 'illustro/Network/Network.ini', 'illustro/Disk/2 Disks.ini', 'illustro/Welcome/Welcome.ini']) {
    const read = async (p) => decodeText(fs.readFileSync(path.join(process.env.RM_FIXTURES, p.replace(/^Skins\//, ''))));
    const skin = await E.Skin.load('Skins/' + ini, read);
    skin.tick({ now, system, fetchText: async () => '203.0.113.7' });
    const size = skin.layout(measureText);
    ok(size.w > 0 && size.h > 0, `illustro ${ini} lays out (${size.w}×${size.h})`);
  }
}

console.log(failed ? `\n${failed} Rainmeter check(s) failed` : '\nAll Rainmeter checks passed');
process.exit(failed ? 1 : 0);
