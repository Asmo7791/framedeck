// Runs inside each custom widget's sandboxed frame.
// The widget's code calls widget({...}) with the same shape as the built-in widgets.
(function () {
  const FD = window.FD;
  const root = document.getElementById('root');
  const post = (m) => parent.postMessage({ fd: 1, ...m }, '*');

  // Helpers available to widget code as plain globals.
  for (const [k, v] of Object.entries(FD.h)) window[k] = v;

  let def = null, settings = {}, timers = [], started = false;
  const pending = new Map(); let reqSeq = 0;
  function api(path) {
    return new Promise((resolve, reject) => {
      const reqId = ++reqSeq;
      pending.set(reqId, { resolve, reject });
      post({ kind: 'api', reqId, path });
      setTimeout(() => { if (pending.delete(reqId)) reject(new Error('Timed out')); }, 20000);
    });
  }
  const ctx = {
    fetchJSON: (path) => api(path),
    fetchText: (url) => api('/api/fetch?url=' + encodeURIComponent(url)).then((r) => r.text),
    every: (ms, fn) => { const t = setInterval(fn, Math.max(16, ms)); timers.push(t); return t; },
  };
  FD.fetchJSON = ctx.fetchJSON;

  // Forward console output and errors to the Widget Studio.
  const fmt = (a) => a.map((x) => { try { return typeof x === 'string' ? x : JSON.stringify(x); } catch { return String(x); } }).join(' ');
  for (const lvl of ['log', 'info', 'warn', 'error']) {
    const orig = console[lvl].bind(console);
    console[lvl] = (...a) => { orig(...a); post({ kind: lvl === 'error' ? 'error' : 'log', text: fmt(a) }); };
  }
  window.addEventListener('error', (e) => post({ kind: 'error', text: e.message, line: e.filename && e.filename.includes('widget.js') ? e.lineno : null }));
  window.addEventListener('unhandledrejection', (e) => post({ kind: 'error', text: 'Unhandled: ' + ((e.reason && e.reason.message) || e.reason) }));

  window.widget = function (d) {
    if (!d || typeof d.render !== 'function') throw new Error('widget({...}) needs a render(el, settings, ctx) function');
    def = d;
  };

  function showError(err) {
    root.innerHTML = `<div class="fd-empty"><b>Widget error</b><span>${FD.esc(err && err.message || err)}</span></div>`;
  }
  function draw() {
    if (!def) return;
    try { def.render(root, settings, ctx); } catch (err) { showError(err); post({ kind: 'error', text: err.message, line: lineOf(err) }); }
  }
  function lineOf(err) {
    const m = String(err && err.stack || '').match(/widget\.js:(\d+)/);
    return m ? Number(m[1]) : null;
  }
  async function load() {
    try { ctx.data = await def.data(settings, ctx); ctx.error = null; }
    catch (err) { ctx.error = err.message; post({ kind: 'error', text: 'data(): ' + err.message, line: lineOf(err) }); }
    draw();
  }

  function start(source) {
    const tag = document.createElement('script');
    tag.textContent = source + '\n//# sourceURL=widget.js';
    document.head.appendChild(tag); // runs synchronously; syntax errors go to the error listener
    if (!def) { showError('The code must call widget({ ... })'); post({ kind: 'meta', meta: null }); return; }
    const meta = {};
    for (const k of ['name', 'icon', 'desc', 'def', 'min', 'tick', 'dataEvery']) if (def[k] !== undefined) meta[k] = def[k];
    meta.settings = Array.isArray(def.settings) ? def.settings.map((f) => ({ key: f.key, label: f.label || f.key, type: f.type || 'text', default: f.default ?? '', options: f.options })) : [];
    post({ kind: 'meta', meta: JSON.parse(JSON.stringify(meta)) });
    settings = { ...Object.fromEntries(meta.settings.map((f) => [f.key, f.default])), ...settings };
    draw();
    if (def.tick) timers.push(setInterval(draw, Math.max(16, def.tick)));
    if (typeof def.data === 'function') { load(); timers.push(setInterval(load, Math.max(5000, def.dataEvery || 60000))); }
  }

  window.addEventListener('message', (e) => {
    if (e.source !== parent) return;
    const m = e.data;
    if (!m || m.fd !== 1) return;
    if (m.kind === 'init' && !started) {
      started = true;
      for (const [k, v] of Object.entries(m.vars || {})) if (v) document.documentElement.style.setProperty(k, v);
      document.documentElement.style.fontFamily = 'var(--font)';
      document.documentElement.style.color = 'var(--fg)';
      settings = m.settings || {};
      Object.assign(ctx, m.ctx || {});
      start(m.source || '');
    } else if (m.kind === 'resize') {
      Object.assign(ctx, m.ctx || {});
      draw();
    } else if (m.kind === 'apiResult') {
      const p = pending.get(m.reqId);
      if (!p) return;
      pending.delete(m.reqId);
      m.ok ? p.resolve(m.data) : p.reject(new Error(m.error));
    }
  });
  post({ kind: 'ready' });
})();
