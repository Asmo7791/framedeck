// User-written widgets (and edited copies of built-ins).
// Their code runs in a sandboxed frame per widget, so a widget you import from
// someone else can't touch your layouts or the rest of the app.
(function () {
  const FD = window.FD;
  const frames = new Set();

  // Data endpoints a widget frame may ask the app for.
  const API_ALLOW = /^\/api\/(weather|geocode|hn|system|crypto|rss|ics|scores|air|nowplaying|fetch)(\?|$)/;

  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

  function srcdoc(css, attrs) {
    const safeCss = String(css || '').replace(/<\/(style)/gi, '<\\/$1');
    return `<!doctype html><html class="fd-stage fd-frame-root" data-color="${attrs.color}" data-shape="${attrs.shape}" data-card="${attrs.card}"><head><meta charset="utf-8">
<link rel="stylesheet" href="shared/stage.css">
<style>
:root { color-scheme: normal; }
html.fd-frame-root { position: static; height: 100%; border-radius: 0 !important; background: transparent !important; overflow: hidden; }
body { margin: 0; height: 100%; background: transparent; }
#root { position: absolute; inset: 0; container-type: size; display: flex; overflow: hidden; }
#root > * { flex: 1; min-width: 0; min-height: 0; }
</style>
<style id="user-css">${safeCss}</style>
</head><body><div id="root"></div>
<script src="shared/profiles.js"></script><script src="shared/widget-css.js"></script><script src="shared/widgets.js"></script>
<script src="shared/widgets-extra.js"></script><script src="shared/runtime.js"></script>
</body></html>`;
  }

  function plainCtx(ctx) {
    const o = {};
    for (const k of ['w', 'h', 'cls', 'aspect', 'cols', 'rows', 'shape', 'color', 'editor', 'widgetId']) o[k] = ctx[k];
    return o;
  }
  function stageVars(el) {
    const stage = el.closest('.fd-stage');
    const cs = stage ? getComputedStyle(stage) : null;
    const vars = {};
    for (const k of ['--bg', '--fg', '--muted', '--accent', '--card-bg', '--radius', '--gap', '--font']) vars[k] = cs ? cs.getPropertyValue(k) : '';
    return { vars, card: stage ? stage.dataset.card : 'filled' };
  }

  // Turn a saved code entry into a widget definition the renderer understands.
  FD.makeFrameDef = function (entry) {
    const meta = entry.meta || {};
    return {
      name: meta.name || entry.name || 'Custom widget',
      icon: meta.icon || entry.icon || '🧩',
      desc: meta.desc || '',
      def: meta.def || [4, 3],
      min: meta.min || [1, 1],
      settings: meta.settings || [],
      css: entry.css || '',
      frame: true,
      themed: true,
      custom: true,
      version: hash((entry.source || '') + '\n' + (entry.css || '')),
      entry,
      render(el, s, ctx) {
        let rec = el._frameRec;
        if (!rec || !rec.iframe.isConnected) {
          el.innerHTML = '<div class="fd-frame-wrap"><iframe class="fd-frame" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" title="widget"></iframe></div>';
          const iframe = el.querySelector('iframe');
          const sv = stageVars(el);
          rec = el._frameRec = { iframe, entry, settings: s, ctx: plainCtx(ctx), sv, ready: false };
          frames.add(rec);
          iframe.srcdoc = srcdoc(entry.css, { color: ctx.color, shape: ctx.shape, card: sv.card });
          return;
        }
        rec.ctx = plainCtx(ctx);
        if (rec.ready) post(rec, { kind: 'resize', ctx: rec.ctx });
      },
    };
  };

  function post(rec, msg) {
    try { rec.iframe.contentWindow.postMessage({ fd: 1, ...msg }, '*'); } catch { /* frame gone */ }
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || m.fd !== 1) return;
    let rec = null;
    for (const r of frames) {
      if (!r.iframe.isConnected) { frames.delete(r); continue; }
      if (r.iframe.contentWindow === e.source) { rec = r; break; }
    }
    if (!rec) return;
    const tell = (detail) => window.dispatchEvent(new CustomEvent('fd-frame', { detail: { widgetId: rec.ctx.widgetId, ...detail } }));
    if (m.kind === 'ready') {
      rec.ready = true;
      post(rec, { kind: 'init', source: rec.entry.source || '', settings: rec.settings, ctx: rec.ctx, vars: rec.sv.vars });
    } else if (m.kind === 'api') {
      const path = String(m.path || '');
      if (!API_ALLOW.test(path)) { post(rec, { kind: 'apiResult', reqId: m.reqId, ok: false, error: 'Not allowed: ' + path }); return; }
      FD.fetchJSON(path).then((data) => post(rec, { kind: 'apiResult', reqId: m.reqId, ok: true, data }))
        .catch((err) => post(rec, { kind: 'apiResult', reqId: m.reqId, ok: false, error: err.message }));
    } else if (m.kind === 'meta') {
      rec.meta = m.meta;
      tell({ kind: 'meta', meta: m.meta });
    } else if (m.kind === 'log' || m.kind === 'error') {
      tell({ kind: m.kind, text: String(m.text || ''), line: m.line || null });
    }
  });

  // Run code in a hidden frame just to read its name, sizes and settings.
  FD.extractMeta = function (entry, timeout = 5000) {
    return new Promise((resolve) => {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:300px;height:200px;';
      const body = document.createElement('div');
      host.appendChild(body);
      document.body.appendChild(host);
      const id = 'meta-' + Math.random().toString(36).slice(2);
      const done = (meta) => { window.removeEventListener('fd-frame', on); host.remove(); resolve(meta); };
      const on = (ev) => { if (ev.detail.widgetId !== id) return; if (ev.detail.kind === 'meta') done(ev.detail.meta); else if (ev.detail.kind === 'error') done(null); };
      window.addEventListener('fd-frame', on);
      setTimeout(() => done(null), timeout);
      FD.makeFrameDef(entry).render(body, {}, { w: 300, h: 200, cls: 'm', aspect: 'wide', cols: 3, rows: 2, shape: 'rect', color: 'full', editor: true, widgetId: id });
    });
  };

  // Put the user's widgets and edited built-ins into the registry.
  FD.registerUserWidgets = function (cfg) {
    const W = FD.WIDGETS;
    for (const k of Object.keys(W)) if (k.startsWith('custom:')) delete W[k];
    for (const [k, v] of Object.entries(FD.BUILTIN)) W[k] = v;
    for (const [type, entry] of Object.entries(cfg.widgetOverrides || {})) {
      if (FD.BUILTIN[type]) W[type] = { ...FD.makeFrameDef(entry), overrides: type };
    }
    for (const entry of cfg.customWidgets || []) W['custom:' + entry.id] = FD.makeFrameDef(entry);
  };

  // ---------- source code for built-in widgets ----------
  function dedent(text) {
    const lines = text.split('\n');
    if (lines.length < 2) return text;
    const rest = lines.slice(1).filter((l) => l.trim());
    const ind = Math.min(...rest.map((l) => l.match(/^ */)[0].length));
    return [lines[0], ...lines.slice(1).map((l) => l.slice(Math.min(ind, l.match(/^ */)[0].length)))].join('\n');
  }
  const indent = (text, n) => text.split('\n').map((l, i) => (i && l ? ' '.repeat(n) + l : l)).join('\n');

  FD.sourceOf = function (type) {
    const def = FD.BUILTIN[type];
    if (!def) return '';
    const out = [];
    for (const k of ['name', 'icon', 'desc', 'def', 'min', 'tick', 'dataEvery']) if (def[k] !== undefined && def[k] !== 0) out.push(`${k}: ${JSON.stringify(def[k])},`);
    if (def.settings && def.settings.length) {
      // One setting per line reads better than fully expanded JSON.
      const line = (f) => '{ ' + Object.entries(f).map(([k, v]) => `${k}: ${JSON.stringify(v).replace(/","/g, '", "').replace(/\],\[/g, '], [')}`).join(', ') + ' }';
      out.push(`settings: [\n${def.settings.map((f) => '  ' + line(f) + ',').join('\n')}\n],`);
    }
    for (const k of ['data', 'render']) {
      if (typeof def[k] !== 'function') continue;
      let t = dedent(def[k].toString());
      if (!new RegExp(`^(async\\s+)?${k}\\s*\\(`).test(t)) t = `${k}: ${t}`;
      out.push(t + ',');
    }
    return `// ${def.name}: a built-in FrameDeck widget. Change anything you like, then Save or Save as.\n` +
      `widget({\n  ${out.map((x) => indent(x, 2)).join('\n  ')}\n});\n`;
  };

  FD.TEMPLATES = {
    blank: { name: 'Blank', css: `.hello { display: flex; align-items: center; justify-content: center; font-size: min(14cqw, 30cqh); font-weight: 700; }
.hello span { color: var(--accent); }\n`, source: `// Describe your widget, then draw it in render().
widget({
  name: 'My widget',
  icon: '✨',
  desc: 'Something new',
  def: [4, 2],           // default size in grid blocks
  settings: [
    { key: 'text', label: 'Text', type: 'text', default: 'Hello' },
  ],
  render(el, s, ctx) {
    // el: the box to draw in · s: settings · ctx.w/ctx.h: size in px · ctx.cls: 'xs' | 's' | 'm' | 'l'
    el.innerHTML = \`<div class="hello">\${esc(s.text)} <span>\${ctx.cls}</span></div>\`;
  },
});
` },
    quote: { name: 'Quote of the day (from an API)', css: `.q { display: flex; flex-direction: column; justify-content: center; gap: .6em; font-size: min(6cqw, 12cqh); }
.q p { margin: 0; font-weight: 600; line-height: 1.25; }
.q p::before { content: '“'; color: var(--accent); } .q p::after { content: '”'; color: var(--accent); }
.q span { color: var(--muted); font-size: .8em; }\n`, source: `// Loads JSON from a public API. fetchJSON('/api/fetch?url=...') works for any web address.
widget({
  name: 'Daily quote',
  icon: '💡',
  def: [6, 3],
  dataEvery: 6 * 60 * 60 * 1000,   // refresh every 6 hours
  async data(s, ctx) {
    const r = await ctx.fetchText('https://zenquotes.io/api/today');
    return JSON.parse(r)[0];
  },
  render(el, s, ctx) {
    if (ctx.error) { el.innerHTML = \`<div class="fd-empty"><b>Couldn't load</b><span>\${esc(ctx.error)}</span></div>\`; return; }
    if (!ctx.data) { el.innerHTML = '<div class="fd-loading"></div>'; return; }
    el.innerHTML = \`<div class="q"><p>\${esc(ctx.data.q)}</p><span>— \${esc(ctx.data.a)}</span></div>\`;
  },
});
` },
    bignum: { name: 'Big number from any JSON', css: `.big { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.big .v { font-size: min(30cqw, 55cqh); font-weight: 800; line-height: 1; }
.big .l { color: var(--muted); font-size: min(7cqw, 12cqh); text-transform: uppercase; letter-spacing: .1em; }\n`, source: `// Point it at any JSON address and pick a value with a path like "data.count".
widget({
  name: 'Big number',
  icon: '🔢',
  def: [3, 3],
  dataEvery: 60 * 1000,
  settings: [
    { key: 'label', label: 'Label', type: 'text', default: 'GitHub stars' },
    { key: 'url', label: 'JSON address', type: 'text', default: 'https://api.github.com/repos/Feeengyuuu/EpaperSystem' },
    { key: 'path', label: 'Value path', type: 'text', default: 'stargazers_count' },
  ],
  async data(s, ctx) {
    const json = JSON.parse(await ctx.fetchText(s.url));
    return String(s.path).split('.').reduce((o, k) => (o == null ? o : o[k]), json);
  },
  render(el, s, ctx) {
    const v = ctx.error ? '!' : ctx.data == null ? '…' : Number(ctx.data).toLocaleString();
    el.innerHTML = \`<div class="big"><div class="v">\${esc(v)}</div><div class="l">\${esc(s.label)}</div></div>\`;
  },
});
` },
    canvas: { name: 'Drawing with canvas', css: `canvas { width: 100%; height: 100%; display: block; }\n`, source: `// Animated drawing. tick: 50 redraws about 20 times a second.
widget({
  name: 'Pulse',
  icon: '🌀',
  def: [4, 4],
  tick: 50,
  render(el, s, ctx) {
    let c = el.querySelector('canvas');
    if (!c) { el.innerHTML = '<canvas></canvas>'; c = el.querySelector('canvas'); }
    const dpr = devicePixelRatio || 1;
    c.width = ctx.w * dpr; c.height = ctx.h * dpr;
    const g = c.getContext('2d');
    const t = Date.now() / 1000;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    g.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < 6; i++) {
      const r = ((t * 40 + i * 30) % 180) / 180;
      g.beginPath();
      g.arc(c.width / 2, c.height / 2, r * Math.min(c.width, c.height) / 2, 0, Math.PI * 2);
      g.strokeStyle = accent; g.globalAlpha = 1 - r; g.lineWidth = 3 * dpr;
      g.stroke();
    }
  },
});
` },
  };
})();
