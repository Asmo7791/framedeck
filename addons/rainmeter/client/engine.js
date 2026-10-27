// The Rainmeter skin interpreter: reads a skin's .ini, keeps its variables, measures and meters,
// and works out what to draw where. Drawing itself is in draw.js, so this file runs anywhere
// (including Node, for the add-on's tests). Reference: docs.rainmeter.net/manual.
(function (root) {
  const F = typeof module !== 'undefined' && module.exports ? require('./formula.js') : root.RainmeterAddon.formula;

  // ---------- .ini files ----------
  // Comments start with ";". Keys are case-insensitive.
  function parseIni(text) {
    const out = [];
    let section = null;
    for (let line of String(text).replace(/^﻿/, '').split(/\r?\n/)) {
      line = line.trim();
      if (!line || line[0] === ';') continue;
      const sec = /^\[([^\]]+)\]$/.exec(line);
      if (sec) { section = sec[1].trim(); out.push({ section }); continue; }
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      let value = line.slice(eq + 1).trim();
      // A value that is one quoted string loses its quotes (but not Substitute="a":"b").
      if (value.length > 1 && value[0] === '"' && value[value.length - 1] === '"' && !value.slice(1, -1).includes('"')) value = value.slice(1, -1);
      out.push({ section, key: line.slice(0, eq).trim(), value });
    }
    return out;
  }

  // Paths are kept relative to the package folder, with forward slashes: "Skins/Suite/Clock/".
  const dirOf = (p) => p.replace(/[^/]*$/, '');
  function joinPath(base, rel) {
    rel = String(rel || '').replace(/\\/g, '/');
    if (/^[a-z]:\//i.test(rel) || rel.startsWith('//')) return null; // an absolute Windows path: not part of the skin
    const parts = (rel.startsWith('Skins/') ? rel : base + rel).split('/');
    const out = [];
    for (const p of parts) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
    return out.join('/');
  }

  // ---------- time formats (strftime, plus "#" to drop leading zeros) ----------
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  // d holds the wall-clock fields to show: { y, mo, d, h, mi, s, wd, yd }.
  function strftime(fmt, d) {
    const pad = (n, w, nopad) => (nopad ? String(n) : String(n).padStart(w, '0'));
    return String(fmt).replace(/%(#?)([a-zA-Z%])/g, (m, hash, c) => {
      const np = !!hash;
      switch (c) {
        case 'a': return DAYS[d.wd].slice(0, 3);
        case 'A': return DAYS[d.wd];
        case 'b': case 'h': return MONTHS[d.mo].slice(0, 3);
        case 'B': return MONTHS[d.mo];
        case 'd': return pad(d.d, 2, np);
        case 'e': return String(d.d).padStart(2, ' ');
        case 'H': return pad(d.h, 2, np);
        case 'I': return pad(d.h % 12 || 12, 2, np);
        case 'j': return pad(d.yd, 3, np);
        case 'm': return pad(d.mo + 1, 2, np);
        case 'M': return pad(d.mi, 2, np);
        case 'p': return d.h < 12 ? 'AM' : 'PM';
        case 'S': return pad(d.s, 2, np);
        case 'w': return String(d.wd);
        case 'u': return String(d.wd || 7);
        case 'y': return pad(d.y % 100, 2, np);
        case 'Y': return String(d.y);
        case 'D': return `${pad(d.mo + 1, 2)}/${pad(d.d, 2)}/${pad(d.y % 100, 2)}`;
        case 'F': return `${d.y}-${pad(d.mo + 1, 2)}-${pad(d.d, 2)}`;
        case 'R': return `${pad(d.h, 2)}:${pad(d.mi, 2)}`;
        case 'T': return `${pad(d.h, 2)}:${pad(d.mi, 2)}:${pad(d.s, 2)}`;
        case 'c': return `${pad(d.mo + 1, 2)}/${pad(d.d, 2)}/${pad(d.y % 100, 2)} ${pad(d.h, 2)}:${pad(d.mi, 2)}:${pad(d.s, 2)}`;
        case 'x': return `${pad(d.mo + 1, 2)}/${pad(d.d, 2)}/${pad(d.y % 100, 2)}`;
        case 'X': return `${pad(d.h, 2)}:${pad(d.mi, 2)}:${pad(d.s, 2)}`;
        case 'Z': case 'z': return '';
        case '%': return '%';
        default: return m;
      }
    });
  }
  // Wall-clock fields for a moment, in local time or at a fixed offset in hours.
  function clockFields(ms, tzHours) {
    const dt = tzHours == null ? new Date(ms) : new Date(ms + tzHours * 3600000);
    const g = tzHours == null
      ? { y: dt.getFullYear(), mo: dt.getMonth(), d: dt.getDate(), h: dt.getHours(), mi: dt.getMinutes(), s: dt.getSeconds(), wd: dt.getDay() }
      : { y: dt.getUTCFullYear(), mo: dt.getUTCMonth(), d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), s: dt.getUTCSeconds(), wd: dt.getUTCDay() };
    g.yd = Math.floor((Date.UTC(g.y, g.mo, g.d) - Date.UTC(g.y, 0, 1)) / 86400000) + 1;
    // Windows timestamp: seconds since 1601-01-01 in the shown time zone (what Rainmeter returns).
    g.stamp = Date.UTC(g.y, g.mo, g.d, g.h, g.mi, g.s) / 1000 + 11644473600;
    return g;
  }

  // ---------- numbers ----------
  function parseColor(v, fallback = [0, 0, 0, 0]) {
    v = String(v || '').trim();
    if (!v) return fallback;
    if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) {
      const n = (i) => parseInt(v.slice(i, i + 2), 16);
      return [n(0), n(2), n(4), v.length === 8 ? n(6) : 255];
    }
    const p = v.split(',').map((x) => parseFloat(x));
    if (p.length < 3 || p.some((x) => isNaN(x))) return fallback;
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 255];
  }
  // AutoScale: 1 = 1024-based (k, M, G, T), 2 = 1000-based. Rainmeter writes "k" without a space.
  function formatNumber(value, { autoScale = 0, decimals, scale = 1, percentual = false, min = 0, max = 1 } = {}) {
    let v = value;
    if (percentual) v = max > min ? ((v - min) / (max - min)) * 100 : 0;
    else if (scale && scale !== 1) v = v / scale;
    let suffix = '';
    if (autoScale) {
      const base = autoScale === 2 ? 1000 : 1024;
      for (const s of ['k', 'M', 'G', 'T']) { if (Math.abs(v) >= base) { v /= base; suffix = s; } else break; }
    }
    const dp = decimals == null ? (autoScale ? 1 : 0) : decimals;
    return v.toFixed(Math.max(0, Math.min(10, dp))) + suffix;
  }
  // Uptime's format: %1 seconds, %2 minutes, %3 hours, %4 days, each with an optional printf part.
  function uptimeFormat(fmt, secs) {
    const days = Math.floor(secs / 86400);
    const parts = [0, secs % 60, Math.floor(secs / 60) % 60, Math.floor(secs / 3600) % 24, days];
    return String(fmt).replace(/%(\d)(?:!(0?)(\d*)[a-z]!)?/gi, (m, n, zero, width) => {
      const v = String(Math.trunc(parts[Number(n)] || 0));
      return width ? v.padStart(Number(width), zero ? '0' : ' ') : v;
    });
  }

  // PCRE as used by WebParser ("(?siU)...") to a JavaScript RegExp. U makes quantifiers lazy.
  function toJsRegex(src) {
    let flags = 'g';
    let ungreedy = false;
    src = String(src).replace(/^\(\?([a-zA-Z]+)\)/, (m, f) => {
      if (/i/.test(f)) flags += 'i';
      if (/s/.test(f)) flags += 's';
      if (/m/.test(f)) flags += 'm';
      if (/U/.test(f)) ungreedy = true;
      return '';
    });
    if (ungreedy) {
      let out = '', inClass = false;
      for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c === '\\') { out += c + (src[i + 1] || ''); i++; continue; }
        if (inClass) { if (c === ']') inClass = false; out += c; continue; }
        if (c === '[') { inClass = true; out += c; continue; }
        let q = '';
        if (c === '*' || c === '+' || (c === '?' && i > 0 && !/[(*+?}]/.test(src[i - 1]))) q = c;
        else if (c === '{' && /^\{\d+(,\d*)?\}/.test(src.slice(i))) { q = /^\{\d+(,\d*)?\}/.exec(src.slice(i))[0]; i += q.length - 1; }
        if (!q) { out += c; continue; }
        if (src[i + 1] === '?') { out += q; i++; } else out += q + '?';
      }
      src = out;
    }
    return new RegExp(src, flags.replace('g', ''));
  }

  // ---------- bangs ----------
  // "[!SetOption Meter Key "Value"][!UpdateMeter Meter]" -> [['!setoption', 'Meter', 'Key', 'Value'], ...]
  function parseBangs(action) {
    const out = [];
    const s = String(action || '');
    let i = 0;
    while (i < s.length) {
      if (s[i] !== '[') { i++; continue; }
      let depth = 0, j = i, quote = false;
      for (; j < s.length; j++) {
        if (s[j] === '"') quote = !quote;
        else if (!quote && s[j] === '[') depth++;
        else if (!quote && s[j] === ']' && --depth === 0) break;
      }
      const body = s.slice(i + 1, j).trim();
      i = j + 1;
      if (!body.startsWith('!')) continue; // programs and links don't run on a display
      const args = [];
      body.replace(/"""(.*?)"""|"([^"]*)"|(\S+)/g, (m, a, b, c) => { args.push(a ?? b ?? c); return ''; });
      args[0] = args[0].toLowerCase();
      out.push(args);
    }
    if (!out.length && /^\s*!/.test(s)) { // an action without brackets: "!SetOption ..."
      const args = [];
      s.trim().replace(/"([^"]*)"|(\S+)/g, (m, b, c) => { args.push(b ?? c); return ''; });
      args[0] = args[0].toLowerCase();
      out.push(args);
    }
    return out;
  }

  // ---------- the skin ----------
  const STRING_MEASURES = new Set(['time', 'string', 'webparser', 'uptime', 'nowplaying', 'sysinfo']);
  const SUPPORTED_MEASURES = new Set(['time', 'cpu', 'physicalmemory', 'swapmemory', 'memory', 'freediskspace', 'netin', 'netout', 'nettotal',
    'uptime', 'calc', 'string', 'loop', 'webparser', 'nowplaying', 'sysinfo', 'plugin']);
  const SUPPORTED_METERS = new Set(['string', 'image', 'bar', 'line', 'histogram', 'roundline', 'rotator', 'shape', 'button', 'bitmap']);

  class Skin {
    // iniPath: "Skins/Suite/Config/File.ini". readText(path) gives a file's text (for @Include).
    static async load(iniPath, readText) {
      const skin = new Skin(iniPath);
      await skin.read(iniPath, readText, null, 0);
      skin.init();
      return skin;
    }

    constructor(iniPath) {
      this.iniPath = iniPath;
      const parts = iniPath.split('/');
      this.suitePath = parts.slice(0, 2).join('/') + '/'; // "Skins/Suite/"
      this.sections = new Map(); // lower name -> { name, keys: Map(lower key -> value) }
      this.order = [];
      this.variables = new Map();
      this.overrides = new Map(); // from !SetOption: lower section -> Map(lower key -> value)
      this.unsupported = new Set();
      this.updates = 0;
      const cur = dirOf(iniPath);
      for (const [k, v] of Object.entries({
        '@': this.suitePath + '@Resources/', CURRENTPATH: cur, CURRENTFILE: parts[parts.length - 1], ROOTCONFIGPATH: this.suitePath,
        SKINSPATH: 'Skins/', CURRENTCONFIG: parts.slice(1, -1).join('\\'), ROOTCONFIG: parts[1], PROGRAMPATH: '', SETTINGSPATH: '', CRLF: '\n',
        SCREENAREAWIDTH: '1920', SCREENAREAHEIGHT: '1080', WORKAREAWIDTH: '1920', WORKAREAHEIGHT: '1040', SCREENAREAX: '0', SCREENAREAY: '0',
        WORKAREAX: '0', WORKAREAY: '0', VSCREENAREAWIDTH: '1920', VSCREENAREAHEIGHT: '1080', CURRENTCONFIGX: '0', CURRENTCONFIGY: '0',
        CURRENTCONFIGWIDTH: '0', CURRENTCONFIGHEIGHT: '0', PIXELWIDTH: '1', PIXELHEIGHT: '1',
      })) this.variables.set(k.toLowerCase(), v);
    }

    async read(path, readText, into, depth) {
      if (depth > 10) return;
      let text;
      try { text = await readText(path); } catch { if (depth) return; throw new Error('Skin file not found'); }
      let current = into;
      for (const e of parseIni(text)) {
        if (!e.key) { current = this.section(e.section); continue; }
        // Keys before any [Section] in an included file belong to the section that included it.
        const sec = e.section != null ? this.section(e.section) : current;
        if (!sec) continue;
        if (e.section != null) current = sec;
        if (/^@include\d*$/i.test(e.key)) {
          const p = joinPath(dirOf(this.iniPath), this.vars(e.value));
          if (p) await this.read(p, readText, current, depth + 1);
          continue;
        }
        sec.keys.set(e.key.toLowerCase(), e.value);
        if (sec.name.toLowerCase() === 'variables') this.variables.set(e.key.toLowerCase(), e.value);
      }
    }
    section(name) {
      const k = name.toLowerCase();
      if (!this.sections.has(k)) { this.sections.set(k, { name, keys: new Map() }); this.order.push(k); }
      return this.sections.get(k);
    }

    // ---------- options ----------
    // A section's own value, then its MeterStyle styles (later styles win), then the default.
    raw(sec, key, def) {
      const k = key.toLowerCase();
      const o = this.overrides.get(sec);
      if (o && o.has(k)) return o.get(k);
      const s = this.sections.get(sec);
      if (!s) return def;
      if (s.keys.has(k)) return s.keys.get(k);
      const styles = this.vars(s.keys.get('meterstyle') || '').split('|').map((x) => x.trim().toLowerCase()).filter(Boolean).reverse();
      for (const st of styles) { const ss = this.sections.get(st); if (ss && ss.keys.has(k)) return ss.keys.get(k); }
      return def;
    }
    // Replace #Variables#, and with DynamicVariables also [Measure] and [Meter:X] section variables.
    vars(text, dynamic = false) {
      let s = String(text ?? '');
      for (let n = 0; n < 10 && s.includes('#'); n++) {
        const next = s.replace(/#(?!\*)([^#\s\n]+?)#/g, (m, name) => (this.variables.has(name.toLowerCase()) ? this.variables.get(name.toLowerCase()) : m));
        if (next === s) break;
        s = next;
      }
      s = s.replace(/\[#([^\]\s]+)\]/g, (m, name) => (this.variables.has(name.toLowerCase()) ? this.variables.get(name.toLowerCase()) : m));
      if (dynamic || /\[&/.test(s)) s = s.replace(/\[&?([^\[\]#!"\s][^\[\]"]*?)(?::([^\]]*))?\]/g, (m, name, param) => this.sectionVar(name, param, m, dynamic || m.startsWith('[&')));
      return s.replace(/#\*([^#]+?)\*#/g, '#$1#');
    }
    sectionVar(name, param, whole, allowed) {
      if (!allowed) return whole;
      const ms = this.measures && this.measures.get(name.toLowerCase());
      if (ms) {
        if (param === undefined) return ms.str;
        const p = param.trim().toLowerCase();
        if (p === '') return String(ms.value);
        if (p === 'maxvalue') return String(ms.max);
        if (p === 'minvalue') return String(ms.min);
        if (p === 'timestamp') return String(ms.stamp || 0);
        const pct = /^%(?:,\s*(\d+))?$/.exec(p);
        if (pct) return formatNumber(ms.value, { percentual: true, min: ms.min, max: ms.max, decimals: pct[1] ? Number(pct[1]) : 0 });
        const sc = /^\/(\d+(?:\.\d+)?)(?:,\s*(\d+))?$/.exec(p);
        if (sc) return formatNumber(ms.value, { scale: Number(sc[1]), decimals: sc[2] ? Number(sc[2]) : 0 });
        if (/^\d+$/.test(p)) return ms.value.toFixed(Number(p));
        return whole;
      }
      const mt = this.meters && this.meters.find((m) => m.key === name.toLowerCase());
      if (mt && mt.box) {
        const b = mt.box;
        const v = { x: b.x, y: b.y, w: b.w, h: b.h, xw: b.x + b.w, yh: b.y + b.h }[String(param || '').trim().toLowerCase()];
        if (v !== undefined) return String(v);
      }
      return whole;
    }
    dynamic(sec) { return this.raw(sec, 'DynamicVariables', '0').trim() === '1'; }
    str(sec, key, def = '') { const r = this.raw(sec, key, null); return r == null ? def : this.vars(r, this.dynamic(sec)); }
    num(sec, key, def = 0) {
      const r = this.raw(sec, key, null);
      if (r == null || r === '') return def;
      const v = parseFloat(F.resolveParens(this.vars(r, this.dynamic(sec)), this.lookup));
      return isNaN(v) ? def : v;
    }
    color(sec, key, def) {
      const r = this.raw(sec, key, null);
      return r == null ? def : parseColor(F.resolveParens(this.vars(r, this.dynamic(sec)), this.lookup), def);
    }
    path(sec, key, folderKey) {
      const v = this.str(sec, key, '');
      if (!v) return null;
      // ImagePath is a folder the image name is inside.
      const folder = folderKey ? this.str(sec, folderKey, '').replace(/[\\/]+$/, '') : '';
      const p = joinPath(dirOf(this.iniPath), folder ? folder + '/' + v : v);
      return p && !/\.[a-z0-9]{2,4}$/i.test(p) ? p + '.png' : p; // Rainmeter assumes .png
    }

    // ---------- measures and meters ----------
    init() {
      this.lookup = (name) => { const m = this.measures.get(String(name).toLowerCase()); return m ? m.value : undefined; };
      this.measures = new Map();
      this.meters = [];
      for (const key of this.order) {
        const s = this.sections.get(key);
        if (['rainmeter', 'variables', 'metadata'].includes(key)) continue;
        const measure = s.keys.get('measure');
        const meter = s.keys.get('meter');
        if (measure) {
          const type = this.vars(measure).trim().toLowerCase();
          let kind = type;
          if (type === 'plugin') kind = this.pluginKind(key);
          if (!SUPPORTED_MEASURES.has(type) || kind === 'unsupported') this.unsupported.add(type === 'plugin' ? `Plugin=${this.str(key, 'Plugin', '?')}` : `Measure=${measure}`);
          this.measures.set(key, { key, name: s.name, type: kind, value: 0, str: '', min: 0, max: 1, counter: 0, prevCond: {}, loop: null, web: null, history: [] });
        } else if (meter) {
          const type = this.vars(meter).trim().toLowerCase();
          if (!SUPPORTED_METERS.has(type) && type !== 'container') this.unsupported.add(`Meter=${meter}`);
          this.meters.push({ key, name: s.name, type, history: [], hidden: false, box: null });
        }
      }
      for (const m of this.meters) m.hidden = this.num(m.key, 'Hidden', 0) === 1;
      this.update = Math.max(16, this.num('rainmeter', 'Update', 1000));
      if (this.update < 0) this.update = 1000;
      this.runAction('rainmeter', 'OnRefreshAction');
    }
    pluginKind(key) {
      const p = this.str(key, 'Plugin', '').replace(/^.*[\\/]/, '').replace(/\.dll$/i, '').toLowerCase();
      if (p === 'webparser') return 'webparser';
      if (p === 'nowplaying') return 'nowplaying';
      if (p === 'sysinfo') return 'sysinfo';
      return 'unsupported';
    }

    // Run one update. data: { now, system, nowPlaying, fetchText(url) }.
    tick(data) {
      this.updates++;
      this.data = data;
      for (const m of this.measures.values()) {
        if (this.num(m.key, 'Disabled', 0) === 1 || this.num(m.key, 'Paused', 0) === 1) continue;
        const div = this.num(m.key, 'UpdateDivider', 1);
        if (div === -1 ? this.updates > 1 : div > 1 && (this.updates - 1) % Math.round(div) !== 0) continue;
        const before = m.str + '|' + m.value;
        try { this.measure(m, data); } catch { /* a broken measure shows 0 */ }
        if (this.num(m.key, 'InvertMeasure', 0) === 1 && m.type !== 'freediskspace' && m.type !== 'physicalmemory') m.value = m.max - m.value + m.min;
        this.substitute(m);
        this.conditions(m);
        if (before !== m.str + '|' + m.value && this.updates > 1) this.runAction(m.key, 'OnChangeAction');
        this.runAction(m.key, 'OnUpdateAction');
      }
      // Line and Histogram meters keep a history per measure (LineCount, MeasureName2...).
      for (const mt of this.meters) {
        if (mt.type !== 'line' && mt.type !== 'histogram') continue;
        const count = Math.max(1, Math.min(10, this.num(mt.key, 'LineCount', 1)));
        for (let i = 1; i <= count; i++) {
          const m = this.measureFor(mt, i);
          const h = (mt.history[i - 1] = mt.history[i - 1] || []);
          h.push(m ? { raw: m.value, min: m.min, max: m.max } : { raw: 0, min: 0, max: 1 });
          if (h.length > 2048) h.shift();
        }
      }
      this.runAction('rainmeter', 'OnUpdateAction');
    }

    measure(m, data) {
      const sys = data.system || {};
      const k = m.key;
      const num = (key, def) => this.num(k, key, def);
      switch (m.type) {
        case 'time': {
          const tz = this.str(k, 'TimeZone', 'local').trim().toLowerCase();
          const offset = tz === '' || tz === 'local' ? null : parseFloat(tz) + (num('DaylightSavingTime', 1) && isDst(data.now) ? 1 : 0);
          const stampOpt = this.str(k, 'TimeStamp', '');
          const ms = stampOpt && !isNaN(parseFloat(stampOpt)) ? (parseFloat(stampOpt) - 11644473600) * 1000 : data.now;
          const f = clockFields(ms, stampOpt ? 0 : offset);
          const fmt = this.raw(k, 'Format', null);
          m.str = strftime(fmt == null ? '%H:%M:%S' : this.vars(fmt), f);
          m.stamp = f.stamp;
          m.value = fmt == null ? f.stamp : (isNaN(Number(m.str)) || m.str.trim() === '' ? 0 : Number(m.str));
          m.min = 0; m.max = 1;
          break;
        }
        case 'cpu': {
          const p = num('Processor', 0);
          m.value = p > 0 ? ((sys.cores || [])[p - 1] || 0) : (sys.cpu || 0);
          m.min = 0; m.max = 100;
          break;
        }
        case 'physicalmemory': case 'memory': case 'swapmemory': {
          const src = m.type === 'swapmemory' ? sys.swap || {} : sys.memory || {};
          const total = src.total || 0, used = src.used || 0;
          m.value = num('Total', 0) === 1 ? total : num('InvertMeasure', 0) === 1 ? total - used : used;
          m.min = 0; m.max = total || 1;
          break;
        }
        case 'freediskspace': {
          const drive = this.str(k, 'Drive', 'C:').trim().toUpperCase().replace(/\\$/, '');
          const d = (sys.disks || {})[drive] || { free: 0, total: 0, label: '' };
          if (num('Type', 0) === 1 || num('Label', 0) === 1) { m.str = d.label || drive; m.value = 0; }
          else m.value = num('Total', 0) === 1 ? d.total : num('InvertMeasure', 0) === 1 ? d.total - d.free : d.free;
          m.min = 0; m.max = d.total || 1;
          break;
        }
        case 'netin': case 'netout': case 'nettotal': {
          const net = sys.net || {};
          const v = m.type === 'netin' ? net.in : m.type === 'netout' ? net.out : (net.in || 0) + (net.out || 0);
          m.value = num('Cumulative', 0) === 1 ? (m.type === 'netin' ? net.totalIn : m.type === 'netout' ? net.totalOut : (net.totalIn || 0) + (net.totalOut || 0)) || 0 : v || 0;
          const speed = num({ netin: 'NetInSpeed', netout: 'NetOutSpeed', nettotal: 'NetTotalSpeed' }[m.type], 0);
          m.min = 0; m.max = speed > 0 ? speed : Math.max(m.max || 1, m.value);
          break;
        }
        case 'uptime': {
          const secs = Math.floor(sys.uptime || 0);
          m.value = secs;
          m.str = uptimeFormat(this.str(k, 'Format', '%4!i!d %3!i!:%2!02i!'), secs);
          m.min = 0; m.max = 1;
          break;
        }
        case 'calc': {
          m.counter++;
          const lookup = (name) => {
            const n = name.toLowerCase();
            if (n === 'counter') return m.counter;
            if (n === 'random') return num('LowBound', 0) + Math.floor(Math.random() * (num('HighBound', 100) - num('LowBound', 0) + 1));
            return this.lookup(name);
          };
          m.value = F.evaluate(this.vars(this.raw(k, 'Formula', '0'), this.dynamic(k)), lookup);
          m.min = num('MinValue', 0); m.max = num('MaxValue', 1);
          break;
        }
        case 'string': m.str = this.str(k, 'String', ''); m.value = isNaN(parseFloat(m.str)) ? 0 : parseFloat(m.str); break;
        case 'loop': {
          const start = num('StartValue', 1), end = num('EndValue', 100), inc = num('Increment', 1) || 1, count = num('LoopCount', 0);
          if (!m.loop) m.loop = { v: start, loops: 0 };
          else if (!(count > 0 && m.loop.loops >= count)) {
            m.loop.v += inc;
            if ((inc > 0 && m.loop.v > end) || (inc < 0 && m.loop.v < end)) { m.loop.loops++; m.loop.v = count > 0 && m.loop.loops >= count ? end : start; }
          }
          m.value = m.loop.v; m.min = Math.min(start, end); m.max = Math.max(start, end);
          break;
        }
        case 'webparser': this.webparser(m, data); break;
        case 'nowplaying': {
          const np = data.nowPlaying || {};
          const t = this.str(k, 'PlayerType', 'TITLE').trim().toUpperCase();
          const map = { TITLE: np.title, ARTIST: np.artist, ALBUM: np.album, COVER: '', FILE: '', DURATION: fmtMinSec(np.duration), POSITION: fmtMinSec(np.position) };
          if (t === 'PROGRESS') { m.value = np.duration ? (np.position / np.duration) * 100 : 0; m.max = 100; m.str = String(Math.round(m.value)); }
          else if (t === 'STATE' || t === 'STATUS') { m.value = np.state === 'playing' ? 1 : np.state === 'paused' ? 2 : 0; m.str = String(m.value); }
          else { m.str = map[t] || ''; m.value = t === 'DURATION' ? np.duration || 0 : t === 'POSITION' ? np.position || 0 : 0; m.max = np.duration || 1; }
          break;
        }
        case 'sysinfo': {
          const t = this.str(k, 'SysInfoType', '').trim().toUpperCase();
          const info = { COMPUTER_NAME: sys.host, USER_NAME: sys.user, OS_VERSION: sys.os, IP_ADDRESS: sys.ip, HOST_NAME: sys.host, NUM_MONITORS: '1' };
          m.str = info[t] || ''; m.value = isNaN(parseFloat(m.str)) ? 0 : parseFloat(m.str);
          break;
        }
        default: m.value = 0; m.str = '';
      }
      if (this.raw(k, 'MinValue', null) != null && m.type !== 'calc') m.min = num('MinValue', m.min);
      if (this.raw(k, 'MaxValue', null) != null && m.type !== 'calc') m.max = num('MaxValue', m.max);
      if (!STRING_MEASURES.has(m.type) && m.type !== 'freediskspace') m.str = formatNumber(m.value, { decimals: m.value % 1 ? 1 : 0 });
    }

    // WebParser: the parent fetches URL every UpdateRate updates and runs RegExp; children
    // (URL=[Parent]) take StringIndex from the parent's matches.
    webparser(m, data) {
      const k = m.key;
      const urlOpt = this.raw(k, 'URL', '');
      const parentRef = /^\[([^\]]+)\]$/.exec(String(urlOpt).trim());
      const index = this.num(k, 'StringIndex', 0);
      const parent = parentRef ? this.measures.get(parentRef[1].toLowerCase()) : null;
      if (parent && parent.type === 'webparser') {
        const caps = (parent.web && parent.web.caps) || [];
        m.str = caps[index] || '';
      } else {
        if (!m.web) m.web = { caps: [], next: 0, busy: false };
        const rate = Math.max(this.num(k, 'UpdateRate', 600) * this.update, 60000); // be kind to web sites
        if (!m.web.busy && data.now >= m.web.next && data.fetchText) {
          const url = this.vars(urlOpt, true).trim();
          m.web.busy = true;
          m.web.next = data.now + rate;
          data.fetchText(url).then((text) => {
            let caps = [];
            try { const re = toJsRegex(this.str(k, 'RegExp', '(?s)^(.*)$')); const r = re.exec(text); caps = r ? [...r] : []; } catch { caps = []; }
            if (this.num(k, 'DecodeCharacterReference', 0)) caps = caps.map(decodeEntities);
            m.web.caps = caps;
            this.runAction(k, 'FinishAction');
          }, () => { this.runAction(k, 'OnConnectErrorAction'); }).finally(() => { m.web.busy = false; });
        }
        m.str = (m.web.caps[index] || '');
      }
      m.value = isNaN(parseFloat(m.str)) ? 0 : parseFloat(m.str);
    }

    // Substitute="old":"new","x":"y" (RegExpSubstitute=1 uses regular expressions).
    substitute(m) {
      const sub = this.raw(m.key, 'Substitute', null);
      if (sub == null) return;
      const pairs = [];
      String(this.vars(sub)).replace(/(?:"([^"]*)"|'([^']*)')\s*:\s*(?:"([^"]*)"|'([^']*)')/g, (x, a, b, c, d) => { pairs.push([a ?? b, c ?? d]); return ''; });
      const useRe = this.num(m.key, 'RegExpSubstitute', 0) === 1;
      let s = m.str;
      for (const [from, to] of pairs) {
        if (useRe) { try { const re = toJsRegex(from); s = s.replace(new RegExp(re.source, re.flags + 'g'), to.replace(/\\(\d)/g, '$$1')); } catch { /* a broken pattern is skipped */ } }
        else if (from === '') { if (s === '') s = to; }
        else s = s.split(from).join(to);
      }
      m.str = s;
    }

    conditions(m) {
      const k = m.key;
      const run = (key) => this.runAction(k, key);
      for (let n = 1; n < 30; n++) {
        const suf = n === 1 ? '' : String(n);
        const cond = this.raw(k, 'IfCondition' + suf, null);
        if (cond == null) { if (n > 1) break; continue; }
        let ok = false;
        try { ok = !!F.evaluate(this.vars(cond, true), this.lookup); } catch { ok = false; }
        const repeat = this.num(k, 'IfConditionMode', 0) === 1;
        if (repeat || m.prevCond['c' + n] !== ok) run((ok ? 'IfTrueAction' : 'IfFalseAction') + suf);
        m.prevCond['c' + n] = ok;
      }
      for (let n = 1; n < 30; n++) {
        const suf = n === 1 ? '' : String(n);
        const pat = this.raw(k, 'IfMatch' + suf, null);
        if (pat == null) { if (n > 1) break; continue; }
        let ok = false;
        try { ok = toJsRegex(this.vars(pat, true)).test(m.str); } catch { ok = false; }
        if (this.num(k, 'IfMatchMode', 0) === 1 || m.prevCond['m' + n] !== ok) run((ok ? 'IfMatchAction' : 'IfNotMatchAction') + suf);
        m.prevCond['m' + n] = ok;
      }
      for (const [opt, test] of [['IfAbove', (v, x) => v > x], ['IfBelow', (v, x) => v < x], ['IfEqual', (v, x) => v === x]]) {
        const r = this.raw(k, opt + 'Value', null);
        if (r == null) continue;
        const ok = test(m.value, this.num(k, opt + 'Value', 0));
        if (ok && !m.prevCond[opt]) run(opt + 'Action');
        m.prevCond[opt] = ok;
      }
    }

    runAction(sec, key) {
      const a = this.raw(sec, key, null);
      if (a == null || this.runDepth > 5) return;
      this.runDepth = (this.runDepth || 0) + 1;
      try { for (const b of parseBangs(this.vars(a, true))) this.bang(b); } finally { this.runDepth--; }
    }
    bang([name, ...args]) {
      const setOpt = (sec, key, value) => {
        const s = sec.toLowerCase();
        if (!this.overrides.has(s)) this.overrides.set(s, new Map());
        this.overrides.get(s).set(key.toLowerCase(), value ?? '');
      };
      const meter = (n) => this.meters.find((m) => m.key === String(n || '').toLowerCase());
      const group = (g) => this.meters.filter((m) => this.str(m.key, 'Group', '').split('|').map((x) => x.trim().toLowerCase()).includes(String(g).toLowerCase()));
      switch (name) {
        case '!setoption': if (args.length >= 2) setOpt(args[0], args[1], args[2]); break;
        case '!setoptiongroup': for (const m of group(args[0])) setOpt(m.key, args[1], args[2]); break;
        case '!writekeyvalue': if (String(args[0]).toLowerCase() === 'variables') this.variables.set(String(args[1]).toLowerCase(), args[2] ?? ''); break;
        case '!setvariable': if (args[0]) this.variables.set(args[0].toLowerCase(), args[1] ?? ''); break;
        case '!showmeter': { const m = meter(args[0]); if (m) m.hidden = false; break; }
        case '!hidemeter': { const m = meter(args[0]); if (m) m.hidden = true; break; }
        case '!togglemeter': { const m = meter(args[0]); if (m) m.hidden = !m.hidden; break; }
        case '!showmetergroup': for (const m of group(args[0])) m.hidden = false; break;
        case '!hidemetergroup': for (const m of group(args[0])) m.hidden = true; break;
        case '!togglemetergroup': for (const m of group(args[0])) m.hidden = !m.hidden; break;
        case '!enablemeasure': setOpt(args[0] || '', 'Disabled', '0'); break;
        case '!disablemeasure': setOpt(args[0] || '', 'Disabled', '1'); break;
        default: break; // !Update, !Redraw, !UpdateMeter...: everything redraws each update anyway
      }
    }

    // ---------- meters ----------
    // The value a meter shows, from 0 to 1 for bars and gauges (index picks MeasureName2, 3...).
    meterValue(mt, index = 1) {
      const name = this.str(mt.key, index === 1 ? 'MeasureName' : 'MeasureName' + index, '');
      const m = name && this.measures.get(name.toLowerCase());
      if (!m) return 0;
      if (mt.type === 'roundline' || mt.type === 'rotator') {
        const rem = this.num(mt.key, 'ValueRemainder', 0);
        if (rem > 0) return (m.value % rem) / rem;
      }
      return m.max > m.min ? Math.min(1, Math.max(0, (m.value - m.min) / (m.max - m.min))) : 0;
    }
    measureFor(mt, index = 1) {
      const name = this.str(mt.key, index === 1 ? 'MeasureName' : 'MeasureName' + index, '');
      return name ? this.measures.get(name.toLowerCase()) || null : null;
    }
    // The text a String meter shows.
    meterText(mt) {
      const k = mt.key;
      const values = [];
      for (let i = 1; i < 10; i++) {
        const m = this.measureFor(mt, i);
        if (!m) { if (i > 1) break; continue; }
        if (STRING_MEASURES.has(m.type) || (m.type === 'freediskspace' && m.str && isNaN(Number(m.str))) || this.raw(m.key, 'Substitute', null) != null) values[i] = m.str;
        else {
          const auto = this.num(k, 'AutoScale', 0);
          const dec = this.raw(k, 'NumOfDecimals', null);
          values[i] = formatNumber(m.value, {
            autoScale: auto, decimals: dec == null ? undefined : this.num(k, 'NumOfDecimals', 0), scale: this.num(k, 'Scale', 1),
            percentual: this.num(k, 'Percentual', 0) === 1, min: m.min, max: m.max,
          });
        }
      }
      let text = this.raw(k, 'Text', null);
      if (text == null) text = values[1] != null ? '%1' : '';
      text = this.vars(text, this.dynamic(k)).replace(/%(\d)/g, (x, n) => (values[n] != null ? values[n] : x));
      text = this.str(k, 'Prefix', '') + text + this.str(k, 'Postfix', '');
      text = text.replace(/#CRLF#/gi, '\n');
      const sc = this.str(k, 'StringCase', 'None').toLowerCase();
      if (sc === 'upper') text = text.toUpperCase();
      else if (sc === 'lower') text = text.toLowerCase();
      else if (sc === 'proper') text = text.replace(/\b\w/g, (c) => c.toUpperCase());
      return text;
    }
    // A String meter's font as CSS ("bold 13.33px "Trebuchet MS"") and its line height.
    font(mt) {
      const k = mt.key;
      const px = (this.num(k, 'FontSize', 10) * 96) / 72;
      const style = this.str(k, 'StringStyle', 'Normal').toLowerCase();
      const weight = this.num(k, 'FontWeight', 0) || (style.includes('bold') ? 700 : 400);
      const face = this.str(k, 'FontFace', 'Arial').replace(/"/g, '');
      return { css: `${style.includes('italic') ? 'italic ' : ''}${weight} ${px}px "${face}", "Segoe UI", Arial, sans-serif`, px };
    }

    // Work out every meter's box. measureText(fontCss, text) gives { w, h } for String meters.
    layout(measureText) {
      let prev = null;
      let maxW = 0, maxH = 0;
      for (const mt of this.meters) {
        const k = mt.key;
        const pad = String(this.str(k, 'Padding', '0,0,0,0')).split(',').map((x) => parseFloat(x) || 0);
        let w = this.num(k, 'W', NaN), h = this.num(k, 'H', NaN);
        if (mt.type === 'string') {
          mt.text = this.meterText(mt);
          const f = this.font(mt);
          mt.fontCss = f.css; mt.fontPx = f.px;
          const size = measureText(f.css, mt.text || ' ', f.px);
          if (isNaN(w)) w = size.w + (pad[0] || 0) + (pad[2] || 0);
          if (isNaN(h)) h = size.h + (pad[1] || 0) + (pad[3] || 0);
        } else if (mt.type === 'image' || mt.type === 'button' || mt.type === 'bitmap' || mt.type === 'rotator') {
          mt.image = this.path(k, mt.type === 'button' ? 'ButtonImage' : mt.type === 'bitmap' ? 'BitmapImage' : 'ImageName', 'ImagePath');
          if (mt.type === 'image' && !mt.image) { const m = this.measureFor(mt); if (m && m.str) mt.image = joinPath(dirOf(this.iniPath), m.str); }
          if (isNaN(w)) w = mt.naturalW || 0;
          if (isNaN(h)) h = mt.naturalH || 0;
          if (mt.type === 'image' && mt.naturalW && mt.naturalH) {
            if (isNaN(this.num(k, 'W', NaN)) && !isNaN(this.num(k, 'H', NaN))) w = (mt.naturalW * h) / mt.naturalH;
            if (isNaN(this.num(k, 'H', NaN)) && !isNaN(this.num(k, 'W', NaN))) h = (mt.naturalH * w) / mt.naturalW;
          }
        } else if (mt.type === 'shape') {
          mt.shapes = this.shapes(mt);
          const b = mt.shapes.reduce((a, s) => ({ w: Math.max(a.w, s.right), h: Math.max(a.h, s.bottom) }), { w: 0, h: 0 });
          if (isNaN(w)) w = b.w;
          if (isNaN(h)) h = b.h;
        }
        if (isNaN(w)) w = 0;
        if (isNaN(h)) h = 0;
        // Relative positions: "10r" from the previous meter's position, "10R" from its far edge.
        const axis = (key, prevPos, prevSize) => {
          const r = this.raw(k, key, null);
          if (r == null) return 0;
          const s = this.vars(r, this.dynamic(k)).trim();
          const rel = /([rR])$/.exec(s);
          const v = parseFloat(F.resolveParens(rel ? s.slice(0, -1) : s, this.lookup)) || 0;
          if (!rel || !prev) return v;
          return rel[1] === 'r' ? prevPos + v : prevPos + prevSize + v;
        };
        let x = axis('X', prev ? prev.box.x : 0, prev ? prev.box.w : 0);
        let y = axis('Y', prev ? prev.box.y : 0, prev ? prev.box.h : 0);
        // A String meter's X/Y is where its alignment point goes, so its box starts left/up of it.
        if (mt.type === 'string') {
          const align = this.str(k, 'StringAlign', 'Left').toLowerCase();
          if (align.startsWith('right')) x -= w; else if (align.startsWith('center')) x -= w / 2;
          if (align.endsWith('bottom')) y -= h; else if (align.endsWith('center') && align !== 'center') y -= h / 2;
        }
        mt.box = { x, y, w, h, pad };
        prev = mt;
        if (!mt.hidden && mt.type !== 'container') { maxW = Math.max(maxW, x + w); maxH = Math.max(maxH, y + h); }
      }
      const sw = this.num('rainmeter', 'SkinWidth', 0), sh = this.num('rainmeter', 'SkinHeight', 0);
      this.size = { w: Math.ceil(sw || maxW), h: Math.ceil(sh || maxH) };
      if (this.bgSize && this.num('rainmeter', 'BackgroundMode', 1) === 0) this.size = { w: this.bgSize.w, h: this.bgSize.h };
      return this.size;
    }

    // Shape meter: Shape=Rectangle 0,0,100,50,5 | Fill Color 255,0,0 | StrokeWidth 2, plus Shape2, Shape3...
    shapes(mt) {
      const out = [];
      for (let n = 1; n < 50; n++) {
        const def = this.raw(mt.key, n === 1 ? 'Shape' : 'Shape' + n, null);
        if (def == null) { if (n > 1) break; continue; }
        const parts = this.vars(def, this.dynamic(mt.key)).split('|').map((x) => x.trim());
        const head = /^(\w+)\s*(.*)$/.exec(parts[0]);
        if (!head) continue;
        const kind = head[1].toLowerCase();
        const nums = F.resolveParens(head[2], this.lookup).split(',').map((x) => parseFloat(x) || 0);
        const s = { kind, nums, fill: [255, 255, 255, 255], stroke: [0, 0, 0, 255], strokeWidth: 1, rotate: 0, offset: [0, 0] };
        for (const mod of parts.slice(1)) {
          const m = /^(\w+)\s*(.*)$/.exec(mod);
          if (!m) continue;
          const name = m[1].toLowerCase(), val = F.resolveParens(m[2], this.lookup);
          if (name === 'fill') s.fill = parseColor(val.replace(/^color\s*/i, ''), s.fill);
          else if (name === 'stroke') s.stroke = parseColor(val.replace(/^color\s*/i, ''), s.stroke);
          else if (name === 'strokewidth') s.strokeWidth = parseFloat(val) || 0;
          else if (name === 'rotate') s.rotate = parseFloat(val) || 0;
          else if (name === 'offset') s.offset = val.split(',').map((x) => parseFloat(x) || 0);
        }
        const [a = 0, b = 0, c = 0, d = 0] = nums;
        const sw = s.strokeWidth / 2;
        if (kind === 'rectangle') { s.right = a + c + sw; s.bottom = b + d + sw; }
        else if (kind === 'ellipse') { s.right = a + c + sw; s.bottom = b + (nums.length > 3 ? d : c) + sw; }
        else if (kind === 'line' || kind === 'arc' || kind === 'curve') { s.right = Math.max(a, c) + sw; s.bottom = Math.max(b, d) + sw; }
        else { s.right = 0; s.bottom = 0; }
        s.right += s.offset[0] || 0; s.bottom += s.offset[1] || 0;
        out.push(s);
      }
      return out;
    }
  }

  function fmtMinSec(s) { s = Math.floor(s || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function decodeEntities(s) {
    return String(s || '').replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
      const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      if (map[e.toLowerCase()]) return map[e.toLowerCase()];
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isFinite(n) ? String.fromCodePoint(n) : m;
    });
  }
  function isDst(ms) {
    const d = new Date(ms);
    const jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset(), jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset();
    return d.getTimezoneOffset() < Math.max(jan, jul);
  }

  const api = { Skin, parseIni, strftime, clockFields, formatNumber, uptimeFormat, toJsRegex, parseBangs, parseColor, joinPath };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RainmeterAddon = root.RainmeterAddon || {}).engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
