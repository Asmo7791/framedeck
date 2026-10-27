// Rainmeter add-on, browser side: loads the interpreter and adds the "Rainmeter skin" widget.
// FrameDeck's core only knows this as an add-on (src/addons.js, app/shared/addons.js).
(function () {
  const FD = window.FD;
  const BASE = '/addons/rainmeter/';
  const API = '/api/addons/rainmeter';
  const tr = (s) => (FD.tr ? FD.tr(s) : s);
  let packages = [];

  FD.addonReady = FD.addonReady || {};
  FD.addonReady.rainmeter = (async () => {
    for (const f of ['formula.js', 'engine.js', 'draw.js', 'i18n.js']) await FD.loadScript(BASE + f);
    await refreshPackages();
    register();
  })();

  async function refreshPackages() {
    try { packages = (await FD.fetchJSON(API + '/skins')).packages || []; } catch { packages = []; }
  }
  const fileUrl = (p) => `${API}/file?p=${encodeURIComponent(p)}`;

  // ---------- shared data: system stats (once a second), now playing, web pages ----------
  let sys = { at: 0, value: {}, busy: null };
  function system() {
    if (Date.now() - sys.at < 900) return Promise.resolve(sys.value);
    if (!sys.busy) sys.busy = FD.fetchJSON(API + '/system').then((v) => { sys = { at: Date.now(), value: v, busy: null }; return v; }, () => { sys.busy = null; return sys.value; });
    return sys.busy;
  }
  let np = { at: 0, value: {} };
  async function nowPlaying() {
    if (Date.now() - np.at > 2000) { np.at = Date.now(); try { np.value = await FD.fetchJSON('/api/nowplaying'); } catch { /* keep the last one */ } }
    return np.value;
  }
  // Skins are downloads from strangers, so their web requests go out marked like custom widgets':
  // FrameDeck only lets them reach public addresses.
  const fetchText = (url) => FD.fetchJSON('/api/fetch?url=' + encodeURIComponent(url), { 'x-framedeck-sandbox': '1' }).then((r) => r.text || '');

  const loadedFonts = new Set();
  async function loadFonts(pkgId) {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg || typeof FontFace === 'undefined') return;
    await Promise.all(pkg.fonts.filter((f) => !loadedFonts.has(f.path)).map(async (f) => {
      loadedFonts.add(f.path);
      try { const face = new FontFace(f.family, `url("${fileUrl(f.path)}")`); document.fonts.add(await face.load()); } catch { /* the skin falls back to a system font */ }
    }));
  }

  // ---------- one widget on screen ----------
  function start(el, id, ctx) {
    el.innerHTML = '<div class="rm-wrap"><canvas class="rm-canvas"></canvas><div class="rm-note"></div></div>';
    const st = { id, el, canvas: el.querySelector('canvas'), note: el.querySelector('.rm-note'), skin: null, images: new Map(), dead: false, ctx };
    if (!id) { st.note.textContent = tr('Choose a skin in this widget\'s settings, or import one.'); st.note.classList.add('big'); return st; }
    const pkg = id.split('/')[0];
    const ini = id.slice(pkg.length + 1);
    const readText = (p) => fetch(fileUrl(`${pkg}/${p}`), { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('missing'))));
    st.image = (p) => {
      if (!p) return null;
      let rec = st.images.get(p);
      if (!rec) {
        const img = new Image();
        rec = { img, ok: false };
        img.onload = () => { rec.ok = true; if (!st.dead) draw(st); };
        img.src = fileUrl(`${pkg}/${p}`);
        st.images.set(p, rec);
      }
      return rec.ok ? rec.img : null;
    };
    (async () => {
      await loadFonts(pkg);
      st.skin = await RainmeterAddon.engine.Skin.load(ini, readText);
      if (st.dead) return;
      const needsNowPlaying = [...st.skin.measures.values()].some((m) => m.type === 'nowplaying');
      st.step = async () => {
        if (st.dead || st.busy) return;
        st.busy = true;
        try {
          const [system_, nowPlaying_] = await Promise.all([system(), needsNowPlaying ? nowPlaying() : null]);
          st.skin.tick({ now: Date.now(), system: system_, nowPlaying: nowPlaying_, fetchText });
          draw(st);
        } finally { st.busy = false; }
      };
      await st.step();
      st.ctx.every(Math.max(250, st.skin.update), () => st.step());
      const missing = [...st.skin.unsupported];
      if (missing.length && st.ctx.editor) st.note.textContent = tr('Not supported here:') + ' ' + missing.slice(0, 4).join(', ') + (missing.length > 4 ? '…' : '');
    })().catch((err) => { st.note.textContent = tr("This skin couldn't be loaded.") + ' ' + (err.message || ''); st.note.classList.add('big'); });
    return st;
  }

  const measureCanvas = document.createElement('canvas').getContext('2d');
  function measureText(css, text, px) {
    measureCanvas.font = css;
    const lines = String(text).split('\n');
    return { w: Math.ceil(Math.max(...lines.map((l) => measureCanvas.measureText(l).width))), h: Math.ceil(lines.length * px * 1.2) };
  }

  function draw(st) {
    const skin = st.skin;
    if (!skin) return;
    // Image meters without W/H take the image's own size.
    for (const mt of skin.meters) {
      const rec = mt.image && st.images.get(mt.image);
      if (rec && rec.ok) { mt.naturalW = rec.img.naturalWidth; mt.naturalH = rec.img.naturalHeight; }
    }
    const bg = skin.path('rainmeter', 'Background');
    const bgRec = bg && st.images.get(bg);
    if (bgRec && bgRec.ok) skin.bgSize = { w: bgRec.img.naturalWidth, h: bgRec.img.naturalHeight };
    const size = skin.layout(measureText);
    if (!size.w || !size.h) { st.image(bg); return; }
    const W = Math.max(1, st.ctx.w || st.el.clientWidth), H = Math.max(1, st.ctx.h || st.el.clientHeight);
    const fit = st.fit || 'contain';
    const scale = fit === 'native' ? 1 : fit === 'cover' ? Math.max(W / size.w, H / size.h) : Math.min(W / size.w, H / size.h);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cw = Math.round(size.w * scale), ch = Math.round(size.h * scale);
    const c = st.canvas;
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    const g = c.getContext('2d');
    g.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    RainmeterAddon.draw.drawSkin(g, skin, st.image);
  }

  // ---------- the widget ----------
  function skinOptions(s) {
    const opts = [['', tr('Choose a skin…')]];
    for (const p of packages) for (const sk of p.skins) opts.push([sk.id, [sk.suite, sk.config, sk.file].filter(Boolean).join(' › ')]);
    if (s && s.skin && !opts.some((o) => o[0] === s.skin)) opts.push([s.skin, tr('(missing)') + ' ' + s.skin.split('/').pop()]);
    return opts;
  }

  function importSkin(api) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.rmskin,.zip';
      input.onchange = async () => {
        const f = input.files[0];
        if (!f) return resolve();
        api.toast(tr('Importing…'));
        try {
          const r = await fetch(API + '/import', { method: 'POST', headers: { 'x-framedeck': '1', 'x-filename': f.name }, body: f });
          const pkg = await r.json();
          if (!r.ok) throw new Error(pkg.error || 'HTTP ' + r.status);
          await refreshPackages();
          if (pkg.skins[0]) api.set('skin', pkg.skins[0].id);
          api.toast(`${tr('Imported')} ${pkg.name} (${pkg.skins.length})`);
        } catch (err) { api.toast(tr('Import failed:') + ' ' + err.message); }
        api.refresh();
        resolve();
      };
      input.click();
    });
  }

  async function removePackage(api) {
    const id = String(api.settings.skin || '').split('/')[0];
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) { api.toast(tr('Choose a skin first')); return; }
    if (!window.confirm(tr('Remove the imported package "{0}" and all its skins from FrameDeck?').replace('{0}', pkg.name))) return;
    await fetch(API + '/delete', { method: 'POST', headers: { 'x-framedeck': '1', 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    await refreshPackages();
    api.set('skin', '');
    api.refresh();
  }

  function register() {
    FD.BUILTIN.rainmeter = {
      name: 'Rainmeter skin', icon: '🌧️', desc: 'Shows a Rainmeter skin you import (.rmskin or .zip)',
      def: [6, 3], min: [1, 1], tick: 0, noEdit: true,
      settings: [
        { key: 'skin', label: 'Skin', type: 'select', default: '', options: skinOptions },
        { key: 'import', label: 'Import a skin (.rmskin or .zip)…', type: 'action', run: importSkin,
          note: 'Download skins from sites like DeviantArt or VisualSkins. Plugins and Lua scripts in skins aren\'t supported.' },
        { key: 'fit', label: 'Size', type: 'select', default: 'contain', options: [['contain', 'Fit inside the widget'], ['cover', 'Fill the widget'], ['native', 'Actual size']] },
        { key: 'remove', label: 'Remove this skin package…', type: 'action', run: removePackage },
      ],
      render(el, s, ctx) {
        let st = el._rm;
        if (!st || st.id !== (s.skin || '') || !st.canvas.isConnected) {
          if (st) st.dead = true;
          st = el._rm = start(el, s.skin || '', ctx);
        }
        st.ctx = ctx;
        st.fit = s.fit;
        if (st.skin) draw(st);
      },
      css: `
.rm-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rm-canvas { display: block; flex: none; }
.rm-note { position: absolute; left: 4px; right: 4px; bottom: 2px; font-size: 11px; color: var(--muted); text-align: center; pointer-events: none; }
.rm-note.big { position: static; font-size: min(5cqw, 14px); padding: 6px; }
`,
    };
    if (!FD.WIDGET_ORDER.includes('rainmeter')) FD.WIDGET_ORDER.push('rainmeter');
  }
})();
