// FrameDeck layout editor.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = FD.esc;
  const W = FD.WIDGETS;

  let cfg = null;
  let sel = { screen: null, page: null, widget: null };
  let view = null;           // mounted stage for the canvas
  let scale = 1;
  let displays = { displays: [], open: [] };
  let info = {};
  const undoStack = [], redoStack = [];

  // ---------- helpers ----------
  const screenOf = () => cfg.screens.find((s) => s.id === sel.screen) || cfg.screens[0];
  const pageOf = () => { const s = screenOf(); return s && (s.pages.find((p) => p.id === sel.page) || s.pages[0]); };
  const widgetOf = () => { const p = pageOf(); return p && p.widgets.find((w) => w.id === sel.widget); };
  const confirm = (msg) => window.confirm(FD.tr(msg));
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }
  function api(url, opts = {}) {
    return fetch(url, { ...opts, headers: { 'content-type': 'application/json', 'x-framedeck': '1', ...(opts.headers || {}) } }).then(async (r) => {
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`);
      return b;
    });
  }

  // ---------- saving & undo ----------
  let saveT = null;
  function scheduleSave() {
    const st = $('#saveState'); st.textContent = 'Saving…'; st.className = 'save-state dirty';
    clearTimeout(saveT);
    saveT = setTimeout(async () => {
      try {
        await api('/api/config', { method: 'PUT', body: JSON.stringify({ config: cfg }) });
        st.textContent = 'Saved'; st.className = 'save-state';
      } catch (err) { st.textContent = 'Not saved: ' + err.message; st.className = 'save-state err'; }
    }, 300);
  }
  function snapshot() {
    undoStack.push(JSON.stringify(cfg));
    if (undoStack.length > 150) undoStack.shift();
    redoStack.length = 0;
    updateUndo();
  }
  function commit(fn, { skipSnapshot = false, rerender = 'all' } = {}) {
    if (!skipSnapshot) snapshot();
    fn();
    scheduleSave();
    if (rerender === 'all') renderAll();
    else if (rerender === 'canvas') { renderCanvas(); renderInspector(); }
    else if (rerender === 'lite') { renderCanvas(); }
  }
  function restore(json) { cfg = JSON.parse(json); fixSelection(); scheduleSave(); renderAll(); }
  function undo() { if (!undoStack.length) return; redoStack.push(JSON.stringify(cfg)); restore(undoStack.pop()); updateUndo(); }
  function redo() { if (!redoStack.length) return; undoStack.push(JSON.stringify(cfg)); restore(redoStack.pop()); updateUndo(); }
  function updateUndo() { $('#undo').disabled = !undoStack.length; $('#redo').disabled = !redoStack.length; }

  function fixSelection() {
    if (!cfg.screens.length) { sel = { screen: null, page: null, widget: null }; return; }
    const s = cfg.screens.find((x) => x.id === sel.screen) || cfg.screens[0];
    sel.screen = s.id;
    const p = s.pages.find((x) => x.id === sel.page) || s.pages[0];
    sel.page = p ? p.id : null;
    if (!p || !p.widgets.some((w) => w.id === sel.widget)) sel.widget = null;
  }

  // ---------- left column ----------
  function renderScreens() {
    const openIds = new Set(displays.open.map((o) => o.screenId));
    $('#screenList').innerHTML = cfg.screens.map((s) => `
      <li data-id="${s.id}" class="${s.id === sel.screen ? 'sel' : ''}">
        <span class="shape ${s.profile.shape} ${s.profile.color}"></span>
        <span class="nm" data-i18n-skip>${esc(s.name)}</span>
        ${openIds.has(s.id) ? '<span class="live" title="Showing on a display"></span>' : ''}
        <span class="sub">${s.profile.w}×${s.profile.h}</span>
      </li>`).join('') || '<li class="muted">No screens yet</li>';
  }
  function renderPages() {
    const s = screenOf();
    if (!s) { $('#pageList').innerHTML = ''; return; }
    $('#pageList').innerHTML = s.pages.map((p, i) => `
      <li data-id="${p.id}" class="${p.id === sel.page ? 'sel' : ''}">
        <span class="pnum">${i + 1}</span><span class="nm" data-i18n-skip>${esc(p.name)}</span>
        <span class="sub">${s.rotate && s.pages.length > 1 ? fmtDur(p.duration) : ''}</span>
      </li>`).join('');
  }
  const fmtDur = (sec) => (sec >= 3600 ? `${Math.round(sec / 360) / 10}h` : sec >= 60 ? `${Math.round(sec / 6) / 10}m` : `${sec}s`);
  function renderPalette() {
    const tile = (t, edited) => `<div class="tile" draggable="true" data-type="${esc(t)}" title="${esc(W[t].desc || '')}"><span class="ic">${esc(W[t].icon || '🧩')}</span><span class="tn">${esc(W[t].name)}</span>${edited ? '<span class="edited" title="Code edited">●</span>' : ''}${W[t].noEdit ? '' : `<button class="edit" data-edit="${esc(t)}" title="Edit code" aria-label="Edit ${esc(W[t].name)} code">✎</button>`}</div>`;
    const custom = (cfg.customWidgets || []).map((c) => 'custom:' + c.id).filter((t) => W[t]);
    $('#palette').innerHTML = FD.WIDGET_ORDER.map((t) => tile(t, !!(cfg.widgetOverrides || {})[t])).join('') +
      `<div class="pal-sub"><h2>My widgets</h2><span><button class="mini" id="importWidget">Import</button><button class="mini" id="newWidget">+ New</button></span></div>` +
      (custom.length ? custom.map((t) => tile(t)).join('') : '<p class="pal-empty">Write your own in HTML, CSS and JavaScript. Click + New.</p>') +
      '<input type="file" id="widgetFile" accept=".json,application/json" hidden>';
  }

  // ---------- canvas ----------
  function fitScale(scr) {
    const vp = $('#viewport');
    const pad = 64;
    return Math.min((vp.clientWidth - pad) / scr.profile.w, (vp.clientHeight - pad) / scr.profile.h, 3);
  }

  function renderCanvas() {
    const scr = screenOf();
    const frame = $('#frame');
    if (!scr) { frame.style.display = 'none'; $('#canvasTitle').textContent = 'Add a screen to start'; return; }
    frame.style.display = '';
    const page = pageOf();
    scale = fitScale(scr);
    frame.style.width = scr.profile.w * scale + 'px';
    frame.style.height = scr.profile.h * scale + 'px';
    frame.classList.toggle('round', scr.profile.shape === 'round');
    $('#scaler').style.transform = `scale(${scale})`;
    if (!view) view = FD.mountStage($('#scaler'), scr, page, { editor: true });
    else view.update(scr, page);

    const colorChip = scr.profile.color === 'eink6' ? '<span class="chip warn">E-ink · 6 colors</span>' : scr.profile.color === 'mono' ? '<span class="chip warn">E-ink · black & white</span>' : '';
    $('#canvasTitle').innerHTML = `<span data-i18n-skip>${esc(scr.name)}</span><span class="chip">${scr.profile.w} × ${scr.profile.h}${scr.profile.shape === 'round' ? ' · round' : ''}</span>${colorChip}<span class="chip">${scr.cols} × ${scr.rows} grid</span>`;
    $('#emptyNote').hidden = !!(page && page.widgets.length);
    renderOverlay();
  }

  function cellPx(scr) { return { cw: (scr.profile.w / scr.cols) * scale, ch: (scr.profile.h / scr.rows) * scale }; }

  function outsideCircle(scr, wd) {
    if (scr.profile.shape !== 'round') return false;
    const { w, h } = scr.profile;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
    const cw = w / scr.cols, ch = h / scr.rows;
    const inset = Math.min(cw, ch) * 0.25; // a little tolerance: card padding absorbs the edge
    const pts = [[wd.x * cw + inset, wd.y * ch + inset], [(wd.x + wd.w) * cw - inset, wd.y * ch + inset],
      [wd.x * cw + inset, (wd.y + wd.h) * ch - inset], [(wd.x + wd.w) * cw - inset, (wd.y + wd.h) * ch - inset]];
    return pts.some(([x, y]) => Math.hypot(x - cx, y - cy) > r);
  }

  function renderOverlay() {
    const scr = screenOf(), page = pageOf();
    const ov = $('#overlay');
    const { cw, ch } = cellPx(scr);
    ov.classList.toggle('grid', $('#gridToggle').checked);
    ov.style.backgroundSize = `${cw}px ${ch}px`;
    let html = '';
    if (scr.profile.shape === 'round') html += '<div class="round-mask"></div><div class="round-ring"></div>';
    for (const wd of (page ? page.widgets : [])) {
      const def = W[wd.type] || { name: wd.type };
      const warn = outsideCircle(scr, wd);
      html += `<div class="ov ${wd.id === sel.widget ? 'sel' : ''} ${warn ? 'warn' : ''}" data-id="${wd.id}"
        style="left:${wd.x * cw}px;top:${wd.y * ch}px;width:${wd.w * cw}px;height:${wd.h * ch}px"
        title="${esc(def.name)}${warn ? ' — partly outside the round screen' : ''}">
        <span class="tag">${esc(def.name)} · ${wd.w}×${wd.h}</span>
        ${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((d) => `<i class="h ${d}" data-dir="${d}"></i>`).join('')}
      </div>`;
    }
    ov.innerHTML = html;
  }

  // Drag to move, drag handles to resize, in whole grid cells.
  function onOverlayDown(e) {
    const ovEl = e.target.closest('.ov');
    if (!ovEl) { if (sel.widget) { sel.widget = null; renderOverlay(); renderInspector(); } return; }
    e.preventDefault();
    const scr = screenOf(), page = pageOf();
    const wd = page.widgets.find((w) => w.id === ovEl.dataset.id);
    if (sel.widget !== wd.id) { sel.widget = wd.id; renderOverlay(); renderInspector(); }
    const dir = e.target.dataset.dir || 'move';
    const start = { x: e.clientX, y: e.clientY, wd: { ...wd } };
    const { cw, ch } = cellPx(scr);
    const min = (W[wd.type] && W[wd.type].min) || [1, 1];
    let snapped = false;
    const move = (ev) => {
      const dx = Math.round((ev.clientX - start.x) / cw), dy = Math.round((ev.clientY - start.y) / ch);
      const n = { ...start.wd };
      if (dir === 'move') { n.x += dx; n.y += dy; }
      else {
        if (dir.includes('e')) n.w = start.wd.w + dx;
        if (dir.includes('s')) n.h = start.wd.h + dy;
        if (dir.includes('w')) { n.w = start.wd.w - dx; n.x = start.wd.x + dx; if (n.w < min[0]) { n.x -= min[0] - n.w; n.w = min[0]; } }
        if (dir.includes('n')) { n.h = start.wd.h - dy; n.y = start.wd.y + dy; if (n.h < min[1]) { n.y -= min[1] - n.h; n.h = min[1]; } }
        if (n.x < 0) { n.w += n.x; n.x = 0; }
        if (n.y < 0) { n.h += n.y; n.y = 0; }
      }
      FD.clampWidget(n, scr.cols, scr.rows, min);
      if (n.x === wd.x && n.y === wd.y && n.w === wd.w && n.h === wd.h) return;
      if (!snapped) { snapshot(); snapped = true; }
      Object.assign(wd, { x: n.x, y: n.y, w: n.w, h: n.h });
      view.update(scr, page);
      renderOverlay();
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      if (snapped) { scheduleSave(); renderInspector(); }
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  function freeSpot(scr, page, w, h) {
    const taken = (x, y) => page.widgets.some((o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
    for (let y = 0; y <= scr.rows - h; y++) for (let x = 0; x <= scr.cols - w; x++) if (!taken(x, y)) return { x, y };
    return null;
  }

  function addWidget(type, at) {
    const scr = screenOf(), page = pageOf();
    if (!scr || !page) return;
    const def = W[type];
    // Default sizes are written for a 16-column grid; scale them to this screen.
    const f = Math.max(scr.cols, scr.rows) / 16;
    let w = Math.max(def.min[0], Math.min(scr.cols, Math.round(def.def[0] * Math.max(f, 0.5))));
    let h = Math.max(def.min[1], Math.min(scr.rows, Math.round(def.def[1] * Math.max(f, 0.5))));
    let pos = at || freeSpot(scr, page, w, h);
    if (!pos) { w = Math.max(def.min[0], Math.ceil(w / 2)); h = Math.max(def.min[1], Math.ceil(h / 2)); pos = freeSpot(scr, page, w, h) || { x: 0, y: 0 }; }
    const wd = FD.clampWidget({ id: FD.uid(), type, x: pos.x, y: pos.y, w, h, settings: FD.widgetDefaults(type) }, scr.cols, scr.rows, def.min);
    commit(() => { page.widgets.push(wd); sel.widget = wd.id; });
  }

  // ---------- inspector ----------
  function field(label, inner, inline) { return `<div class="field ${inline ? 'inline' : ''}"><span>${esc(label)}</span>${inner}</div>`; }
  function toggleHtml(key, on) { return `<label class="switch"><input type="checkbox" data-k="${key}" ${on ? 'checked' : ''}><i></i></label>`; }
  function selectHtml(key, options, value) {
    return `<select data-k="${key}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }

  function renderInspector() {
    const el = $('#inspector');
    const scr = screenOf();
    if (!scr) { el.innerHTML = '<div class="grp"><p class="note">Add a screen with the + button on the left.</p></div>'; return; }
    const wd = widgetOf();
    el.innerHTML = wd ? widgetInspector(scr, wd) : screenInspector(scr, pageOf());
    bindInspector(el, scr, wd);
  }

  function widgetInspector(scr, wd) {
    const def = W[wd.type];
    if (!def) return `<div class="insp-head"><span class="ic">⚠️</span><div><b>Missing widget</b><span>This widget's code was deleted.</span></div></div>
      <div class="grp"><div class="btn-row"><button class="btn small danger" data-act="del">Delete</button></div></div>`;
    const s = { ...FD.widgetDefaults(wd.type), ...wd.settings };
    if (wd.type === 'rss' && !s.feed) s.feed = s.url ? 'custom' : 'bbc-world';
    const fields = def.settings.filter((f) => !f.showIf || (f.showIf.in ? f.showIf.in.includes(s[f.showIf.key]) : s[f.showIf.key] === f.showIf.is)).map((f) => {
      const v = s[f.key];
      switch (f.type) {
        case 'toggle': return field(f.label, toggleHtml(f.key, v), true);
        case 'select': return field(f.label, selectHtml(f.key, typeof f.options === 'function' ? f.options(s) : f.options, v));
        case 'action': return field('', `<button class="btn small" data-action-setting="${esc(f.key)}">${esc(f.label)}</button>${f.note ? `<p class="note">${esc(f.note)}</p>` : ''}`);
        case 'textarea': return field(f.label, `<textarea data-k="${f.key}">${esc(v)}</textarea>`);
        case 'datetime': return field(f.label, `<input type="datetime-local" data-k="${f.key}" value="${esc(v)}">`);
        case 'media': return field(f.label, `${v && /\.(mp4|m4v|mov|webm)(\?|$)/i.test(v) ? `<video class="media-prev" src="${esc(v)}" muted autoplay loop playsinline></video>` : `<div class="media-prev" style="${v ? `background-image:url('${esc(v)}')` : ''}"></div>`}
            <div class="btn-row"><button class="btn small" data-act="pick-image">Choose picture or video…</button>${v ? '<button class="btn small ghost" data-act="clear-image">Remove</button>' : ''}</div>
            <input type="url" data-k="${f.key}" placeholder="or paste a link to a picture, GIF or video" value="${v && !String(v).startsWith('/media/') ? esc(v) : ''}">
            <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm,.mov,.m4v" id="imgFile" hidden>
            <p class="note">GIFs animate. Videos play muted on a loop, up to ${FD.MAX_VIDEO_SECONDS} seconds.</p>`);
        case 'place': return field(f.label, `${v ? `<div class="place-cur">${esc(v.label)}</div>` : '<div class="note">No city set</div>'}
            <div class="btn-row" style="flex-wrap:nowrap"><input type="text" id="placeQ" placeholder="Search for a city"><button class="btn small" data-act="place-search">Find</button></div>
            <div class="place-results" id="placeResults"></div>`);
        default: return field(f.label, `<input type="text" data-k="${f.key}" value="${esc(v)}">`);
      }
    }).join('');
    const style = (wd.style && wd.style.card) || '';
    const otherPages = screenOf().pages.filter((p) => p.id !== sel.page);
    const g = view && view.stage.querySelector(`.fd-w[data-id="${wd.id}"]`);
    const px = g ? `${Math.round(g.offsetWidth)} × ${Math.round(g.offsetHeight)} px` : '';
    const tiny = g && Math.min(g.offsetWidth, g.offsetHeight) < 70;
    return `
      <div class="insp-head"><span class="ic">${def.icon}</span><div><b>${esc(def.name)}</b><span>${esc(def.desc)}</span></div></div>
      ${fields ? `<div class="grp"><h2>Settings</h2>${fields}</div>` : ''}
      <div class="grp"><h2>Position & size</h2>
        <div class="quad">${['x', 'y', 'w', 'h'].map((k) => `<label>${{ x: 'Column', y: 'Row', w: 'Width', h: 'Height' }[k]}<input type="number" data-geo="${k}" value="${wd[k]}" min="${k === 'w' || k === 'h' ? 1 : 0}"></label>`).join('')}</div>
        <div class="note">${px}${outsideCircle(scr, wd) ? ' · <span class="note warn">corners fall outside the round screen</span>' : ''}${tiny ? ' · <span class="note warn">very small for this screen</span>' : ''}</div>
        ${field('Background', selectHtml('card', [['', 'Theme default'], ['filled', 'Card'], ['outline', 'Outline'], ['none', 'None']], style))}
      </div>
      <div class="grp"><h2>Arrange</h2>
        <div class="btn-row">
          ${def.noEdit ? '' : '<button class="btn small" data-act="edit-code">✎ Edit code</button>'}
          <button class="btn small" data-act="dup">Duplicate</button>
          <button class="btn small" data-act="front">Bring to front</button>
          <button class="btn small danger" data-act="del">Delete</button>
        </div>
        ${otherPages.length ? field('Move to page', `<select data-act="move-page"><option value="">Choose…</option>${otherPages.map((p) => `<option value="${p.id}" data-i18n-skip>${esc(p.name)}</option>`).join('')}</select>`) : ''}
      </div>`;
  }

  function colorInputs(scr) {
    const pal = FD.PALETTES[scr.profile.color];
    const t = FD.effectiveTheme(scr);
    const keys = [['bg', 'Back'], ['fg', 'Text'], ['muted', 'Muted'], ['accent', 'Accent'], ['cardBg', 'Card']];
    return `<div class="colors">${keys.map(([k, l]) => pal
      ? `<label>${l}<div class="swatches">${pal.map((c) => `<button data-sw="${k}" data-c="${c}" class="${t[k] === c ? 'on' : ''}" style="background:${c}" title="${c}"></button>`).join('')}</div></label>`
      : `<label>${l}<input type="color" data-color="${k}" value="${t[k]}"></label>`).join('')}</div>
      ${pal ? `<p class="note">This screen can only show ${pal.length} colors, so choices are limited to what the panel can display.</p>` : ''}`;
  }

  function screenInspector(scr, page) {
    const t = { ...FD.THEMES.midnight, ...scr.theme };
    const profileOpts = [['', 'Change size…']].concat(FD.PROFILES.flatMap((g) => g.items.filter((i) => !i.dynamic && !i.custom).map((i) => [i.key, i.name])));
    const displayOpts = displays.displays.map((d) => [`disp:${d.id}`, `Match ${d.label} (${d.w}×${d.h})`]);
    return `
      ${page ? `<div class="grp"><h2>Page</h2>
        ${field('Name', `<input type="text" data-page="name" value="${esc(page.name)}">`)}
        ${scr.pages.length > 1 && scr.rotate ? field('Show for', selectHtml('pageDuration', [[10, '10 seconds'], [20, '20 seconds'], [30, '30 seconds'], [45, '45 seconds'], [60, '1 minute'], [120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes'], [1800, '30 minutes'], [3600, '1 hour']].concat(
          [10, 20, 30, 45, 60, 120, 300, 600, 1800, 3600].includes(Number(page.duration)) ? [] : [[page.duration, fmtDur(page.duration)]]), page.duration)) : ''}
        ${(() => {
          const src = page.presetId && FD.allPresets(cfg).find((p) => p.id === page.presetId);
          return src ? `<div class="preset-link"><span>From preset <b>${esc(src.icon || '')} ${esc(src.name)}</b></span>
              <div class="btn-row"><button class="btn small" data-act="page-preset-update">Save to preset</button><button class="btn small" data-act="page-preset-new">Save as new preset…</button></div></div>`
            : '<div class="btn-row"><button class="btn small" data-act="page-preset-new">Save as preset…</button></div>';
        })()}
        <div class="btn-row">
          <button class="btn small" data-act="page-dup">Duplicate</button>
          ${cfg.screens.length > 1 ? `<select data-act="page-copy" style="width:auto;flex:1"><option value="">Copy to screen…</option>${cfg.screens.filter((s) => s.id !== scr.id).map((s) => `<option value="${s.id}" data-i18n-skip>${esc(s.name)}</option>`).join('')}</select>` : ''}
          ${scr.pages.length > 1 ? '<button class="btn small danger" data-act="page-del">Delete</button>' : ''}
        </div></div>` : ''}
      <div class="grp"><h2>Screen</h2>
        ${field('Name', `<input type="text" data-scr="name" value="${esc(scr.name)}">`)}
        ${field('Size', `<select data-act="profile">${profileOpts.concat(displayOpts).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`)}
        <div class="pair"><label>Width px<input type="number" data-prof="w" value="${scr.profile.w}" min="64" max="8000"></label><label>Height px<input type="number" data-prof="h" value="${scr.profile.h}" min="64" max="8000"></label></div>
        <div class="pair"><label>Shape${selectHtml('shape', [['rect', 'Rectangle'], ['round', 'Round']], scr.profile.shape)}</label>
          <label>Colors${selectHtml('color', [['full', 'Full color'], ['eink6', 'E-ink 6-color'], ['mono', 'Black & white']], scr.profile.color)}</label></div>
        ${field('Block size', selectHtml('density', [['', 'Custom (' + scr.cols + ' × ' + scr.rows + ')']].concat(DENSITIES.map(([k, l]) => { const g = gridForDensity(scr, k); return [k, `${l} (${g.cols} × ${g.rows})`]; })), currentDensity(scr)))}
        <div class="pair"><label>Grid columns<input type="number" data-grid="cols" value="${scr.cols}" min="2" max="96"></label><label>Grid rows<input type="number" data-grid="rows" value="${scr.rows}" min="2" max="96"></label></div>
        <p class="note">Widgets are placed on the grid, so changing the size or grid stretches the layout instead of breaking it.</p>
        ${field('Rotate through pages', toggleHtml('rotate', scr.rotate), true)}
      </div>
      <div class="grp"><h2>Look</h2>
        <div class="themes">${Object.entries(FD.THEMES).map(([k, th]) => `<button class="theme-chip ${th.supporter && !isSupporter() ? 'locked' : ''}" data-theme="${k}" style="background:${th.bg};color:${th.fg};--a:${th.accent}" title="${th.supporter ? 'Supporter theme' : ''}">${th.supporter && !isSupporter() ? '<i>♥</i>' : ''}${esc(th.name)}</button>`).join('')}</div>
        ${colorInputs(scr)}
        <div class="pair"><label>Font${selectHtml('font', [['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Monospace'], ['condensed', 'Condensed']], t.font)}</label>
          <label>Widget background${selectHtml('cardStyle', [['filled', 'Cards'], ['outline', 'Outlines'], ['none', 'None']], t.card)}</label></div>
        <label class="field"><span>Corner roundness</span><input type="range" min="0" max="30" data-range="radius" value="${t.radius}"></label>
        <label class="field"><span>Spacing between widgets</span><input type="range" min="0" max="4" step="0.25" data-range="gap" value="${t.gap}"></label>
      </div>
      <div class="grp"><h2>Share & back up</h2>
        <div class="btn-row">
          <button class="btn small" data-act="export">Export layout</button>
          <button class="btn small" data-act="import">Import layout</button>
          <button class="btn small" data-act="scr-dup">Duplicate screen</button>
          <button class="btn small danger" data-act="scr-del">Delete screen</button>
        </div>
        <input type="file" id="importFile" accept="application/json,.json" hidden>
      </div>`;
  }

  function bindInspector(el, scr, wd) {
    const page = pageOf();
    // Setting buttons (type 'action'): the widget runs its own code, then can save settings.
    el.querySelectorAll('[data-action-setting]').forEach((b) => b.addEventListener('click', () => {
      const f = W[wd.type].settings.find((x) => x.key === b.dataset.actionSetting);
      if (!f || !f.run) return;
      Promise.resolve(f.run({
        settings: { ...FD.widgetDefaults(wd.type), ...wd.settings },
        set: (k, v) => commit(() => { wd.settings = { ...(wd.settings || {}), [k]: v }; }, { rerender: 'canvas' }),
        refresh: renderInspector,
        toast,
      })).catch((err) => toast(err.message));
    }));
    // Widget settings
    el.querySelectorAll('[data-k]').forEach((inp) => {
      const k = inp.dataset.k;
      const evt = inp.tagName === 'SELECT' || inp.type === 'checkbox' || inp.type === 'datetime-local' ? 'change' : 'input';
      inp.addEventListener(evt, () => {
        const v = inp.type === 'checkbox' ? inp.checked : inp.value;
        if (wd) {
          if (k === 'card') return commit(() => { wd.style = { ...(wd.style || {}), card: v || undefined }; if (!v) delete wd.style.card; }, { rerender: 'lite' });
          const typing = evt === 'input';
          if (typing && !inp._snap) { snapshot(); inp._snap = true; }
          commit(() => { wd.settings = { ...(wd.settings || {}), [k]: v }; }, { skipSnapshot: typing, rerender: typing ? 'lite' : 'canvas' });
        } else {
          // Screen-level selects and toggles
          const theme = { ...scr.theme };
          if (k === 'rotate') return commit(() => { scr.rotate = v; });
          if (k === 'shape' || k === 'color') return commit(() => {
            scr.profile[k] = v;
            if (k === 'color' && v !== 'full') Object.assign(scr.theme, FD.THEMES[v]);
          });
          if (k === 'font') return commit(() => { scr.theme = { ...theme, font: v }; view && requestAnimationFrame(() => view.redrawAll()); }, { rerender: 'canvas' });
          if (k === 'cardStyle') return commit(() => { scr.theme = { ...theme, card: v }; }, { rerender: 'canvas' });
          if (k === 'pageDuration') return commit(() => { page.duration = Number(v); });
          if (k === 'density') { if (!v) return; const g = gridForDensity(scr, v); return commit(() => FD.regridScreen(scr, g.cols, g.rows)); }
        }
      });
    });
    el.querySelectorAll('[data-geo]').forEach((inp) => inp.addEventListener('change', () => {
      commit(() => { wd[inp.dataset.geo] = Number(inp.value); FD.clampWidget(wd, scr.cols, scr.rows, W[wd.type].min); }, { rerender: 'canvas' });
    }));
    el.querySelectorAll('[data-page]').forEach((inp) => inp.addEventListener('input', () => {
      if (!inp._snap) { snapshot(); inp._snap = true; }
      commit(() => { page.name = inp.value; }, { skipSnapshot: true, rerender: 'none' }); renderPages();
    }));
    el.querySelectorAll('[data-scr]').forEach((inp) => inp.addEventListener('input', () => {
      if (!inp._snap) { snapshot(); inp._snap = true; }
      commit(() => { scr.name = inp.value; }, { skipSnapshot: true, rerender: 'none' }); renderScreens();
      $('#canvasTitle span').textContent = scr.name;
    }));
    el.querySelectorAll('[data-prof]').forEach((inp) => inp.addEventListener('change', () => {
      const v = Math.max(64, Math.min(8000, Number(inp.value) || 64));
      commit(() => { scr.profile[inp.dataset.prof] = v; });
    }));
    el.querySelectorAll('[data-grid]').forEach((inp) => inp.addEventListener('change', () => {
      const v = Math.max(2, Math.min(96, Number(inp.value) || 2));
      commit(() => FD.regridScreen(scr, inp.dataset.grid === 'cols' ? v : scr.cols, inp.dataset.grid === 'rows' ? v : scr.rows));
    }));
    el.querySelectorAll('[data-color]').forEach((inp) => {
      inp.addEventListener('input', () => {
        if (!inp._snap) { snapshot(); inp._snap = true; }
        commit(() => { scr.theme = { ...scr.theme, [inp.dataset.color]: inp.value }; }, { skipSnapshot: true, rerender: 'none' });
        FD.applyTheme(view.stage, scr); view.stage.style.background = FD.effectiveTheme(scr).bg; view.stage.style.color = FD.effectiveTheme(scr).fg;
      });
    });
    el.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => commit(() => { scr.theme = { ...scr.theme, [b.dataset.sw]: b.dataset.c }; }, { rerender: 'canvas' })));
    el.querySelectorAll('[data-range]').forEach((inp) => inp.addEventListener('input', () => {
      if (!inp._snap) { snapshot(); inp._snap = true; }
      commit(() => { scr.theme = { ...scr.theme, [inp.dataset.range]: Number(inp.value) }; }, { skipSnapshot: true, rerender: 'lite' });
    }));
    el.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
      if (FD.THEMES[b.dataset.theme].supporter && !isSupporter()) { openDonate(`The ${FD.THEMES[b.dataset.theme].name} theme is a thank-you for supporters.`); return; }
      const th = { ...FD.THEMES[b.dataset.theme] }; delete th.name; delete th.supporter;
      commit(() => { scr.theme = th; }, { rerender: 'canvas' });
      requestAnimationFrame(() => view && view.redrawAll());
    }));

    const act = (name, fn) => { const b = el.querySelector(`[data-act="${name}"]`); if (b) b.addEventListener(b.tagName === 'SELECT' ? 'change' : 'click', (e) => fn(e, b)); };
    act('dup', () => {
      const copy = JSON.parse(JSON.stringify(wd)); copy.id = FD.uid();
      const spot = freeSpot(scr, page, copy.w, copy.h); if (spot) Object.assign(copy, spot); else { copy.x = Math.min(scr.cols - copy.w, copy.x + 1); copy.y = Math.min(scr.rows - copy.h, copy.y + 1); }
      commit(() => { page.widgets.push(copy); sel.widget = copy.id; });
    });
    act('front', () => commit(() => { page.widgets = page.widgets.filter((x) => x !== wd).concat(wd); }, { rerender: 'canvas' }));
    act('del', () => deleteSelected());
    act('move-page', (e, s) => {
      const target = scr.pages.find((p) => p.id === s.value); if (!target) return;
      commit(() => { page.widgets = page.widgets.filter((x) => x !== wd); target.widgets.push(wd); sel.page = target.id; });
    });
    act('pick-image', () => $('#imgFile').click());
    act('edit-code', () => openStudio({ type: wd.type, fromWidget: wd.id }));
    act('page-preset-new', () => savePageAsPreset(page, scr));
    act('page-preset-update', () => savePageAsPreset(page, scr, { update: true }));
    act('clear-image', () => commit(() => { wd.settings = { ...wd.settings, src: '' }; }));
    const imgFile = $('#imgFile');
    if (imgFile) imgFile.addEventListener('change', async () => {
      const f = imgFile.files[0]; if (!f) return;
      try {
        if (f.type.startsWith('video/') || /\.(mov|m4v|mp4|webm)$/i.test(f.name)) {
          if (f.size > 150 * 1024 * 1024) throw new Error('Videos can be up to 150 MB');
          const secs = await new Promise((res) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { res(v.duration); URL.revokeObjectURL(v.src); }; v.onerror = () => res(NaN); v.src = URL.createObjectURL(f); });
          if (!Number.isFinite(secs)) throw new Error("This video format can't be played. Try an MP4 (H.264).");
          if (secs > FD.MAX_VIDEO_SECONDS + 0.5) throw new Error(`That video is ${Math.round(secs)} seconds long. Use one up to ${FD.MAX_VIDEO_SECONDS} seconds.`);
        }
        toast('Uploading…');
        const r = await fetch('/api/media', { method: 'POST', headers: { 'x-filename': f.name, 'x-framedeck': '1' }, body: f });
        const b = await r.json(); if (!r.ok) throw new Error(b.error);
        commit(() => { wd.settings = { ...wd.settings, src: b.url }; });
      } catch (err) { toast('Upload failed: ' + err.message); }
    });
    act('place-search', async () => {
      const q = $('#placeQ').value.trim(); if (!q) return;
      const box = $('#placeResults'); box.innerHTML = '<span class="note">Searching…</span>';
      try {
        const r = await api('/api/geocode?q=' + encodeURIComponent(q));
        box.innerHTML = r.results.length ? r.results.map((p, i) => `<button data-i="${i}">${esc(p.label)}</button>`).join('') : '<span class="note">No matches</span>';
        box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => commit(() => { wd.settings = { ...wd.settings, place: r.results[b.dataset.i] }; })));
      } catch (err) { box.innerHTML = `<span class="note warn">${esc(err.message)}</span>`; }
    });
    const pq = $('#placeQ'); if (pq) pq.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('[data-act="place-search"]').click(); });

    // Screen and page actions
    act('profile', (e, s) => {
      const v = s.value; if (!v) return;
      let p;
      if (v.startsWith('disp:')) { const d = displays.displays.find((x) => `disp:${x.id}` === v); p = { w: d.w, h: d.h, shape: 'rect', color: 'full' }; }
      else p = FD.PROFILES.flatMap((g) => g.items).find((i) => i.key === v);
      commit(() => {
        const colorChanged = p.color !== scr.profile.color;
        scr.profile = { w: p.w, h: p.h, shape: p.shape, color: p.color };
        const g = FD.gridFor(p.w, p.h, p.shape);
        FD.regridScreen(scr, g.cols, g.rows);
        if (colorChanged) { const th = { ...(FD.THEMES[p.color] || FD.THEMES.midnight) }; delete th.name; scr.theme = th; }
      });
    });
    act('page-dup', () => {
      const copy = JSON.parse(JSON.stringify(page)); copy.id = FD.uid(); copy.name = page.name + ' copy';
      copy.widgets.forEach((w) => { w.id = FD.uid(); });
      commit(() => { scr.pages.splice(scr.pages.indexOf(page) + 1, 0, copy); sel.page = copy.id; sel.widget = null; });
    });
    act('page-copy', (e, s) => {
      const target = cfg.screens.find((x) => x.id === s.value); if (!target) return;
      const copy = JSON.parse(JSON.stringify(page)); copy.id = FD.uid();
      // Re-map positions onto the other screen's grid so the layout keeps its shape.
      const tmp = { cols: scr.cols, rows: scr.rows, pages: [copy] };
      FD.regridScreen(tmp, target.cols, target.rows);
      copy.widgets.forEach((w) => { w.id = FD.uid(); });
      commit(() => { target.pages.push(copy); });
      toast(`Copied "${page.name}" to ${target.name}`);
      s.value = '';
    });
    act('page-del', () => {
      if (!confirm(`Delete the page "${page.name}"?`)) return;
      commit(() => { scr.pages = scr.pages.filter((p) => p !== page); sel.page = scr.pages[0].id; sel.widget = null; });
    });
    act('scr-dup', () => {
      const copy = JSON.parse(JSON.stringify(scr)); copy.id = FD.uid(); copy.name = scr.name + ' copy';
      copy.pages.forEach((p) => { p.id = FD.uid(); p.widgets.forEach((w) => { w.id = FD.uid(); }); });
      commit(() => { cfg.screens.push(copy); selectScreen(copy.id); });
    });
    act('scr-del', () => {
      if (!confirm(`Delete the screen "${scr.name}" and all its pages?`)) return;
      api('/api/close-display', { method: 'POST', body: JSON.stringify({ screenId: scr.id }) }).catch(() => {});
      commit(() => { cfg.screens = cfg.screens.filter((s) => s !== scr); sel.screen = null; fixSelection(); });
    });
    act('export', () => {
      download(`${slug(scr.name)}.framedeck.json`, { framedeck: 1, screen: scr, customWidgets: customWidgetsUsedBy(scr.pages.map((p) => p.widgets)) });
    });
    act('import', () => $('#importFile').click());
    const imp = $('#importFile');
    if (imp) imp.addEventListener('change', async () => {
      try {
        const data = JSON.parse(await imp.files[0].text());
        imp.value = '';
        const s = data.screen;
        if (!s || !s.profile || !Array.isArray(s.pages)) throw new Error('Not a FrameDeck layout file');
        if (data.customWidgets && data.customWidgets.length && !(await confirmCode(data.customWidgets.length))) return;
        commit(() => {
          const map = adoptCustomWidgets(data.customWidgets);
          FD.registerUserWidgets(cfg);
          s.id = FD.uid();
          s.pages.forEach((p) => { p.id = FD.uid(); p.widgets = p.widgets || []; remapTypes(p.widgets, map); p.widgets = p.widgets.filter((w) => W[w.type]); p.widgets.forEach((w) => { w.id = FD.uid(); }); });
          cfg.screens.push(s); selectScreen(s.id);
        });
        toast(`Imported "${s.name}"`);
      } catch (err) { toast('Import failed: ' + err.message); }
    });
  }

  function deleteSelected() {
    const page = pageOf(), wd = widgetOf(); if (!wd) return;
    commit(() => { page.widgets = page.widgets.filter((x) => x !== wd); sel.widget = null; });
  }

  // ---------- add screen dialog ----------
  let chosenProfile = null;
  function openScreenDialog() {
    chosenProfile = null;
    const list = $('#profileList');
    const dyn = displays.displays.map((d) => ({ key: 'disp:' + d.id, name: `${d.label} ${d.w} × ${d.h}${d.hz ? ` · ${d.hz} Hz` : ''}`, w: d.w, h: d.h, shape: 'rect', color: 'full' }));
    list.innerHTML = FD.PROFILES.map((g) => {
      const items = g.items.flatMap((i) => (i.dynamic ? dyn : [i]));
      if (!items.length) return '';
      return `<div><h4>${esc(g.group)}</h4><div class="profile-grid">${items.map((i) => {
        const ar = i.w && i.h ? i.w / i.h : 1.5;
        const pw = ar >= 1 ? 30 : Math.round(24 * ar), ph = ar >= 1 ? Math.max(8, Math.round(30 / ar)) : 24;
        return `<button type="button" class="profile" data-key="${esc(i.key)}"><span class="pv"><i class="${i.shape === 'round' ? 'round' : ''}" style="width:${i.custom ? 26 : pw}px;height:${i.custom ? 18 : ph}px;${i.color === 'eink6' ? 'border-color:#d40000' : ''}"></i></span><span>${esc(i.name)}</span></button>`;
      }).join('')}</div></div>`;
    }).join('');
    list.querySelectorAll('.profile').forEach((b) => b.addEventListener('click', () => {
      list.querySelectorAll('.profile').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      const k = b.dataset.key;
      chosenProfile = dyn.find((d) => d.key === k) || FD.PROFILES.flatMap((g) => g.items).find((i) => i.key === k);
      $('#customFields').hidden = !chosenProfile.custom;
      if (!$('#sname').dataset.touched) $('#sname').value = chosenProfile.custom ? 'Custom screen' : chosenProfile.name.replace(/\s*\(.*\)/, '');
    }));
    $('#sname').value = ''; delete $('#sname').dataset.touched;
    $('#customFields').hidden = true;
    $('#screenDialog').showModal();
  }
  function createScreen() {
    if (!chosenProfile) { toast('Pick a screen type first'); return false; }
    let p = chosenProfile;
    if (p.custom) p = { w: Number($('#cw').value) || 1024, h: Number($('#ch').value) || 600, shape: $('#cshape').value, color: $('#ccolor').value };
    p = { w: Math.max(64, Math.min(8000, p.w)), h: Math.max(64, Math.min(8000, p.h)), shape: p.shape, color: p.color };
    const g = FD.gridFor(p.w, p.h, p.shape);
    const themeKey = p.color !== 'full' ? p.color : p.shape === 'round' ? 'ring' : 'midnight';
    const theme = { ...FD.THEMES[themeKey] }; delete theme.name;
    const scr = { id: FD.uid(), name: $('#sname').value.trim() || 'New screen', profile: p, cols: g.cols, rows: g.rows, theme, rotate: true, pages: [] };
    // Start with a clock and the date so the screen isn't blank.
    const cw = p.shape === 'round' ? g.cols - 2 * Math.max(1, Math.round(g.cols * 0.12)) : Math.max(1, Math.round(g.cols * 0.5));
    const x = Math.floor((g.cols - cw) / 2);
    const clockH = Math.max(1, Math.round(g.rows * 0.4)), dateH = Math.max(1, Math.round(g.rows * 0.18));
    const y = Math.max(0, Math.floor((g.rows - clockH - dateH) / 2));
    scr.pages.push({ id: FD.uid(), name: 'Page 1', duration: 60, widgets: [
      { id: FD.uid(), type: 'clock', x, y, w: cw, h: clockH, settings: FD.widgetDefaults('clock') },
      { id: FD.uid(), type: 'date', x, y: Math.min(g.rows - dateH, y + clockH), w: cw, h: dateH, settings: { ...FD.widgetDefaults('date'), format: 'short' } },
    ] });
    commit(() => { cfg.screens.push(scr); selectScreen(scr.id); });
    return true;
  }

  // ---------- show-on-display popover ----------
  function positionPop(pop, anchor) {
    const r = anchor.getBoundingClientRect();
    pop.style.top = r.bottom + 8 + 'px';
    pop.style.left = Math.max(10, Math.min(innerWidth - 350, r.right - 340)) + 'px';
  }
  async function refreshDisplays() {
    try { displays = await api('/api/displays'); } catch { displays = { displays: [], open: [] }; }
    checkNewDisplays();
    renderScreens();
    if (!$('#showPop').hidden) renderShowPop();
  }
  function renderShowPop() {
    const scr = screenOf(); if (!scr) return;
    const pop = $('#showPop');
    const openHere = displays.open.filter((o) => o.screenId === scr.id);
    const localUrl = `${location.origin}/display.html?screen=${scr.id}`;
    const lan = info.shareOnLan && info.lanUrls && info.lanUrls.length ? `${info.lanUrls[0]}/display.html?screen=${scr.id}` : '';
    pop.innerHTML = `
      <h3>Show "${esc(scr.name)}"</h3>
      ${displays.displays.length ? displays.displays.map((d) => {
        const on = openHere.find((o) => o.displayId === d.id && o.mode === 'fullscreen');
        const fits = Math.abs(d.w / d.h - scr.profile.w / scr.profile.h) < 0.05;
        return `<div class="disp"><div class="dn"><b>${esc(d.label)}${d.primary ? ' · main' : ''}</b><span>${d.w} × ${d.h}${d.hz ? ` · ${d.hz} Hz` : ''}${fits ? ' · same shape' : ' · will letterbox'}</span></div>
          ${on ? `<button class="btn small" data-close="${esc(on.key)}">Stop</button>` : `<button class="btn small primary" data-open="${d.id}">Fullscreen</button>`}</div>`;
      }).join('') : '<p class="note">Connected displays show up here when FrameDeck runs as the app.</p>'}
      <div class="btn-row"><button class="btn small" data-window="1">Open in a window</button>
        ${openHere.length ? `<button class="btn small ghost" data-closeall="1">Stop all (${openHere.length})</button>` : ''}</div>
      <div class="field"><span>Link for a browser on this computer</span><div class="link-box"><input readonly value="${esc(localUrl)}"><button class="btn small" data-copy="${esc(localUrl)}">Copy</button></div></div>
      ${lan ? `<div class="field"><span>Link for a phone, tablet or other computer on your Wi-Fi</span><div class="link-box"><input readonly value="${esc(lan)}"><button class="btn small" data-copy="${esc(lan)}">Copy</button></div></div>`
        : '<p class="note">Turn on network sharing in Settings to show this screen on a tablet, old phone or another computer.</p>'}
      <p class="note">In a display window: ← → changes page, Esc closes it.</p>`;
    const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) }).then(refreshDisplays).catch((err) => toast(err.message));
    pop.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => post('/api/open-display', { screenId: scr.id, displayId: b.dataset.open, mode: 'fullscreen' }));
    pop.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => post('/api/close-display', { key: b.dataset.close }));
    pop.querySelectorAll('[data-closeall]').forEach((b) => b.onclick = () => post('/api/close-display', { screenId: scr.id }));
    pop.querySelectorAll('[data-window]').forEach((b) => b.onclick = () => {
      const primary = (displays.displays.find((d) => d.primary) || {}).id;
      if (primary) post('/api/open-display', { screenId: scr.id, displayId: primary, mode: 'window' });
      else window.open(localUrl, '_blank');
    });
    pop.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { navigator.clipboard.writeText(b.dataset.copy).then(() => toast('Link copied')); });
  }

  async function renderSettingsPop() {
    try { info = await api('/api/info'); } catch {}
    const pop = $('#settingsPop');
    pop.innerHTML = `
      <h3>Settings</h3>
      <div class="field"><span>Language</span><select id="langSel" data-i18n-skip>${FD.LANGUAGES.map(([k, l]) => `<option value="${k}" ${k === (cfg.language || 'en') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field inline"><span>Share displays on my network</span><label class="switch"><input type="checkbox" id="lanToggle" ${cfg.shareOnLan ? 'checked' : ''}><i></i></label></div>
      <p class="note">Lets phones, tablets and other computers on your Wi-Fi open display links. The editor stays on this computer only.</p>
      ${info.loginItem !== null && info.loginItem !== undefined ? `<div class="field inline"><span>Open FrameDeck when I log in</span><label class="switch"><input type="checkbox" id="loginToggle" ${info.loginItem ? 'checked' : ''}><i></i></label></div>
      <p class="note">Displays that were showing when you quit open again automatically.</p>` : ''}
      ${isSupporter() ? `<p class="note">♥ Supporter: ${esc(info.supporter.name)}</p>` : ''}
      <p class="note">FrameDeck ${esc(info.version || '')}${FD.PROJECT && FD.PROJECT.github ? ` · <a href="${esc(FD.PROJECT.github)}" target="_blank" style="color:var(--ui-accent)">GitHub</a>` : ''} · inspired by <a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank" style="color:var(--ui-accent)">EpaperSystem</a> by Feeengyuuu, which builds on <a href="https://github.com/fatihak/InkyPi" target="_blank" style="color:var(--ui-accent)">InkyPi</a>. Weather from Open-Meteo.</p>`;
    $('#langSel').onchange = (e) => setLanguage(e.target.value);
    $('#lanToggle').onchange = (e) => {
      commit(() => { cfg.shareOnLan = e.target.checked; }, { rerender: 'none' });
      setTimeout(async () => { try { info = await api('/api/info'); } catch {} renderSettingsPop(); }, 800);
    };
    const lt = $('#loginToggle');
    if (lt) lt.onchange = (e) => api('/api/login-item', { method: 'POST', body: JSON.stringify({ enabled: e.target.checked }) }).catch((err) => toast(err.message));
  }

  function togglePop(id, anchor, render) {
    const pop = $(id);
    const other = id === '#showPop' ? '#settingsPop' : '#showPop';
    $(other).hidden = true;
    if (!pop.hidden) { pop.hidden = true; return; }
    pop.hidden = false;
    render();
    positionPop(pop, anchor);
  }

  // ---------- selection & rendering ----------
  function selectScreen(id) {
    sel.screen = id;
    const s = screenOf();
    sel.page = s && s.pages[0] ? s.pages[0].id : null;
    sel.widget = null;
  }
  function renderAll() {
    FD.registerUserWidgets(cfg);
    renderPalette();
    fixSelection();
    renderScreens();
    renderPages();
    renderCanvas();
    renderInspector();
    if (!$('#showPop').hidden) renderShowPop();
  }

  // ---------- events ----------
  function bind() {
    $('#screenList').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-id]'); if (!li || li.dataset.id === sel.screen) return;
      selectScreen(li.dataset.id);
      if (view) { view.destroy(); view = null; }
      renderAll();
    });
    $('#pageList').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-id]'); if (!li) return;
      sel.page = li.dataset.id; sel.widget = null; renderAll();
    });
    $('#addPage').onclick = openPageDialog;
    $('#addScreen').onclick = openScreenDialog;
    $('#sname').addEventListener('input', (e) => { e.target.dataset.touched = '1'; });
    $('#screenCreate').addEventListener('click', (e) => { if (!createScreen()) e.preventDefault(); else if (view) { view.destroy(); view = null; renderAll(); } });

    $('#palette').addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { openStudio({ type: ed.dataset.edit }); return; }
      if (e.target.closest('#newWidget')) { openStudio({}); return; }
      if (e.target.closest('#importWidget')) { $('#widgetFile').click(); return; }
      const t = e.target.closest('.tile'); if (t) addWidget(t.dataset.type);
    });
    $('#palette').addEventListener('change', (e) => { if (e.target.id === 'widgetFile' && e.target.files[0]) { importWidgetFile(e.target.files[0]); e.target.value = ''; } });
    bindStudio();
    bindPageDialog();
    bindGuides();
    bindNewDisplay();
    bindDonate();
    $('#palette').addEventListener('dragstart', (e) => {
      const t = e.target.closest('.tile'); if (!t) return;
      e.dataTransfer.setData('text/framedeck-widget', t.dataset.type);
      e.dataTransfer.effectAllowed = 'copy';
    });
    const ov = $('#overlay');
    let ghost = null;
    const dropCell = (e) => {
      const scr = screenOf(); const r = ov.getBoundingClientRect(); const { cw, ch } = cellPx(scr);
      return { x: Math.floor((e.clientX - r.left) / cw), y: Math.floor((e.clientY - r.top) / ch) };
    };
    ov.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('text/framedeck-widget')) return;
      e.preventDefault();
      const scr = screenOf(); const c = dropCell(e); const { cw, ch } = cellPx(scr);
      if (!ghost) { ghost = document.createElement('div'); ghost.className = 'drop-ghost'; ov.appendChild(ghost); }
      Object.assign(ghost.style, { left: c.x * cw + 'px', top: c.y * ch + 'px', width: cw * 2 + 'px', height: ch * 2 + 'px' });
    });
    ov.addEventListener('dragleave', () => { if (ghost) { ghost.remove(); ghost = null; } });
    ov.addEventListener('drop', (e) => {
      e.preventDefault(); if (ghost) { ghost.remove(); ghost = null; }
      const type = e.dataTransfer.getData('text/framedeck-widget'); if (!W[type]) return;
      addWidget(type, dropCell(e));
    });
    ov.addEventListener('pointerdown', onOverlayDown);
    ov.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.ov')) return;
      const first = $('#inspector').querySelector('textarea, input[type=text]');
      if (first) { first.focus(); first.select && first.select(); }
    });

    $('#gridToggle').onchange = renderOverlay;
    $('#liveToggle').onchange = (e) => { $('#scaler').style.visibility = e.target.checked ? '' : 'hidden'; };
    $('#undo').onclick = undo;
    $('#redo').onclick = redo;
    $('#showBtn').onclick = (e) => { refreshDisplays(); togglePop('#showPop', e.currentTarget, renderShowPop); };
    $('#settingsBtn').onclick = (e) => togglePop('#settingsPop', e.currentTarget, renderSettingsPop);
    document.addEventListener('pointerdown', (e) => {
      for (const id of ['#showPop', '#settingsPop']) {
        const p = $(id);
        if (!p.hidden && !p.contains(e.target) && !e.target.closest('#showBtn, #settingsBtn')) p.hidden = true;
      }
    });

    document.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (typing) return;
      const wd = widgetOf(); const scr = screenOf();
      if (!wd) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); deleteSelected(); }
      else if (e.key === 'Escape') { sel.widget = null; renderOverlay(); renderInspector(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); $('#inspector [data-act="dup"]').click(); }
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        commit(() => {
          if (e.shiftKey) { wd.w += d[0]; wd.h += d[1]; } else { wd.x += d[0]; wd.y += d[1]; }
          FD.clampWidget(wd, scr.cols, scr.rows, W[wd.type].min);
        }, { rerender: 'canvas' });
      }
    });

    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderCanvas, 60); });

    const es = new EventSource('/api/events');
    es.addEventListener('displays', refreshDisplays);
  }

  // ======================================================================
  // Small text prompt (Electron has no window.prompt)
  // ======================================================================
  function askText(title, value = '', note = '') {
    return new Promise((resolve) => {
      const d = $('#askDialog');
      $('#askTitle').textContent = title;
      $('#askNote').textContent = note;
      $('#askNote').hidden = !note;
      const inp = $('#askInput');
      inp.value = value;
      const done = () => { d.removeEventListener('close', done); resolve(d.returnValue === 'ok' ? inp.value.trim() : null); };
      d.addEventListener('close', done);
      d.returnValue = '';
      d.showModal();
      inp.select();
    });
  }

  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.replace(/[^\w\- .]+/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const slug = (s) => String(s || 'untitled').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'untitled';

  // Custom widgets used by a list of widgets, for bundling into exports.
  function customWidgetsUsedBy(widgetLists) {
    const ids = new Set();
    for (const list of widgetLists) for (const w of list) if (w.type.startsWith('custom:')) ids.add(w.type.slice(7));
    return (cfg.customWidgets || []).filter((c) => ids.has(c.id)).map((c) => JSON.parse(JSON.stringify(c)));
  }
  // Add imported custom widgets under fresh ids; returns old-id -> new-type map.
  function adoptCustomWidgets(list) {
    const map = {};
    cfg.customWidgets = cfg.customWidgets || [];
    for (const c of list || []) {
      if (!c || typeof c.source !== 'string') continue;
      const id = FD.uid();
      cfg.customWidgets.push({ id, source: c.source, css: c.css || '', meta: c.meta || null });
      map['custom:' + c.id] = 'custom:' + id;
    }
    return map;
  }
  const remapTypes = (widgets, map) => widgets.forEach((w) => { if (map[w.type]) w.type = map[w.type]; });

  async function confirmCode(n) {
    return confirm(`This file contains ${n} custom widget${n > 1 ? 's' : ''} with code. Widgets run in a sandbox and can only load data from the public internet, but only import files from people you trust.\n\nImport it?`);
  }

  // ======================================================================
  // Widget Studio
  // ======================================================================
  const studio = { open: false };
  const HELP = `
<h4>How a widget works</h4>
<p>Your code calls <code>widget({ ... })</code> once. FrameDeck calls <code>render(el, s, ctx)</code> whenever it needs to draw: when the widget appears, when it's resized, every <code>tick</code> ms, and after <code>data()</code> loads.</p>
<pre>widget({
  name: 'My widget', icon: '✨', desc: 'Shown in the list',
  def: [8, 4],        // default size in grid blocks
  min: [2, 2],        // smallest size
  tick: 1000,         // optional: redraw every second
  dataEvery: 60000,   // optional: how often data() reloads
  settings: [         // fields in the settings panel
    { key: 'city', label: 'City', type: 'text', default: 'Paris' },
  ],
  async data(s, ctx) { return ctx.fetchJSON('/api/...'); },
  render(el, s, ctx) { el.innerHTML = '...'; },
});</pre>
<h4>Setting types</h4>
<p><code>text</code>, <code>textarea</code>, <code>select</code> (with <code>options: [['value','Label'], ...]</code>), <code>toggle</code>, <code>datetime</code>, <code>place</code> (city search, gives <code>{ label, lat, lon }</code>), <code>media</code> (picture or video).</p>
<h4>ctx</h4>
<p><code>ctx.w</code>, <code>ctx.h</code>: size in pixels · <code>ctx.cls</code>: <code>'xs' | 's' | 'm' | 'l'</code> · <code>ctx.aspect</code>: <code>'wide' | 'tall' | 'square'</code> · <code>ctx.shape</code>: <code>'rect' | 'round'</code> · <code>ctx.color</code>: <code>'full' | 'eink6' | 'mono'</code> · <code>ctx.data</code>, <code>ctx.error</code>: result of <code>data()</code> · <code>ctx.editor</code>: true while editing.</p>
<p><code>ctx.fetchText(url)</code>: load any public web address (no CORS problems; local network addresses are blocked) · <code>ctx.fetchJSON(path)</code>: FrameDeck's own data: <code>/api/weather?lat=&amp;lon=&amp;units=f</code>, <code>/api/air</code>, <code>/api/system</code>, <code>/api/hn</code>, <code>/api/rss?url=</code>, <code>/api/ics?url=</code>, <code>/api/scores?league=nba</code>, <code>/api/crypto?ids=bitcoin</code>, <code>/api/nowplaying</code>, <code>/api/geocode?q=</code> · <code>ctx.every(ms, fn)</code>: a timer that stops with the widget.</p>
<h4>Helpers</h4>
<p><code>esc(text)</code> escapes text for HTML · <code>ring(percent, label, sub)</code> draws a progress ring · <code>spark(numbers)</code> draws a sparkline · <code>wxIcon(code)</code>, <code>wxLabel(code)</code> weather icons · <code>fitText(el)</code> shrinks text to fit · <code>newsList(el, items, {title, per, every, ctx})</code> a tappable headline list · <code>moonSvg(moonPhase())</code>.</p>
<h4>Styling</h4>
<p>Use the theme colors so your widget matches every screen: <code>var(--fg)</code>, <code>var(--muted)</code>, <code>var(--accent)</code>, <code>var(--bg)</code>, <code>var(--radius)</code>, <code>var(--font)</code>. Size text with container units like <code>min(10cqw, 20cqh)</code> so it scales with the widget.</p>
<p><code>console.log()</code> shows up in the Console on the right. Links opened with <code>window.open()</code> open in your browser.</p>`;

  function openStudio({ type = null, fromWidget = null, template = null } = {}) {
    let mode, js, css, meta = null;
    if (type && type.startsWith('custom:')) {
      const c = (cfg.customWidgets || []).find((x) => 'custom:' + x.id === type);
      if (!c) return toast('That widget no longer exists');
      mode = 'custom'; js = c.source; css = c.css || ''; meta = c.meta;
    } else if (type && FD.BUILTIN[type]) {
      mode = 'builtin';
      const o = (cfg.widgetOverrides || {})[type];
      js = o ? o.source : FD.sourceOf(type);
      css = o ? o.css : (FD.BUILTIN[type].css || '');
      meta = o ? o.meta : null;
    } else {
      mode = 'new';
      const t = FD.TEMPLATES[template || 'blank'];
      js = t.source; css = t.css;
    }
    Object.assign(studio, { open: true, mode, type, fromWidget, js, css, meta, tab: 'js', saved: { js, css }, views: [], logs: [] });
    const tplSel = $('#stTemplate');
    tplSel.innerHTML = '<option value="">Start from a template…</option>' + Object.entries(FD.TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('');
    tplSel.hidden = mode !== 'new';
    $('#stReset').hidden = !(mode === 'builtin' && (cfg.widgetOverrides || {})[type]);
    $('#stDelete').hidden = mode !== 'custom';
    $('#stKind').textContent = mode === 'builtin' ? ((cfg.widgetOverrides || {})[type] ? 'Built-in · edited' : 'Built-in') : mode === 'custom' ? 'Your widget' : 'New widget';
    $('#stHelp').innerHTML = FD.i18nHelp() || HELP;
    setTab('js');
    $('#stLog').innerHTML = '';
    $('#studio').showModal();
    runStudio();
  }

  function setTab(tab) {
    studio.tab = tab;
    document.querySelectorAll('#stTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $('#stCodeWrap').hidden = tab === 'help';
    $('#stHelp').hidden = tab !== 'help';
    if (tab !== 'help') { $('#stCode').value = tab === 'js' ? studio.js : studio.css; updateGutter(); }
  }
  function updateGutter() {
    const n = $('#stCode').value.split('\n').length;
    $('#stGutter').textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
    $('#stGutter').scrollTop = $('#stCode').scrollTop;
  }
  function dirty() { return studio.js !== studio.saved.js || studio.css !== studio.saved.css; }
  function updateStudioState() {
    const st = $('#stState');
    st.textContent = dirty() ? 'Unsaved changes' : (studio.mode === 'new' ? 'Not saved yet' : 'Saved');
    st.className = 'save-state' + (dirty() || studio.mode === 'new' ? ' dirty' : '');
  }

  function studioLog(kind, text, line) {
    const box = $('#stLog');
    const row = document.createElement('div');
    row.className = 'log ' + kind;
    row.innerHTML = `${line ? `<button class="ln" data-line="${line}">line ${line}</button>` : ''}<span>${esc(text)}</span>`;
    box.appendChild(row);
    while (box.children.length > 200) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
  }

  // Run the code in three preview sizes.
  let runSeq = 0, metaWait = null;
  function runStudio() {
    const seq = ++runSeq;
    for (const v of studio.views) v.destroy();
    studio.views = [];
    studio.meta = null;
    $('#stLog').innerHTML = '';
    FD.WIDGETS.__studio = FD.makeFrameDef({ source: studio.js, css: studio.css, meta: { name: 'Preview', settings: [] } });
    // Settings come from the widget's own defaults (via meta), plus the instance it was opened from.
    const inst = studio.fromWidget && pageOf() && pageOf().widgets.find((w) => w.id === studio.fromWidget);
    const scr = screenOf();
    const theme = scr ? scr.theme : FD.THEMES.midnight;
    const sizes = [];
    if (inst && scr) {
      const cw = scr.profile.w / scr.cols, ch = scr.profile.h / scr.rows;
      sizes.push({ label: `In your layout · ${Math.round(inst.w * cw)}×${Math.round(inst.h * ch)}`, w: Math.round(inst.w * cw), h: Math.round(inst.h * ch), shape: 'rect', color: scr.profile.color });
    }
    sizes.push({ label: 'Round 240', w: 240, h: 240, shape: 'round', color: 'full' });
    sizes.push({ label: 'Small 420×240', w: 420, h: 240, shape: 'rect', color: 'full' });
    if (!inst) sizes.push({ label: 'Large 960×540', w: 960, h: 540, shape: 'rect', color: 'full' });
    sizes.push({ label: 'E-ink 400×240', w: 400, h: 240, shape: 'rect', color: 'eink6' });
    const host = $('#stPreviews');
    host.innerHTML = '';
    const maxW = host.clientWidth - 24 || 360;
    sizes.forEach((sz, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'st-prev';
      const s = Math.min(1, maxW / sz.w, 300 / sz.h);
      wrap.innerHTML = `<div class="st-prev-label">${esc(sz.label)}</div><div class="st-prev-frame ${sz.shape}" style="width:${sz.w * s}px;height:${sz.h * s}px"><div class="st-prev-scale" style="transform:scale(${s})"></div></div>`;
      host.appendChild(wrap);
      const pscr = { profile: { w: sz.w, h: sz.h, shape: sz.shape, color: sz.color }, cols: 1, rows: 1,
        theme: sz.color === 'full' ? { ...theme } : { ...FD.THEMES[sz.color] } };
      const settings = inst ? JSON.parse(JSON.stringify(inst.settings || {})) : {};
      const page = { id: 'sp', widgets: [{ id: 'studio-' + i + '-' + seq, type: '__studio', x: 0, y: 0, w: 1, h: 1, settings }] };
      studio.views.push(FD.mountStage(wrap.querySelector('.st-prev-scale'), pscr, page, { editor: true }));
    });
    return new Promise((resolve) => { metaWait = { seq, resolve }; setTimeout(() => { if (metaWait && metaWait.seq === seq) { metaWait = null; resolve(studio.meta); } }, 5000); });
  }

  window.addEventListener('fd-frame', (e) => {
    const d = e.detail;
    if (!studio.open || !String(d.widgetId || '').startsWith('studio-')) return;
    const [, idx, seq] = d.widgetId.split('-');
    if (Number(seq) !== runSeq) return;
    if (d.kind === 'meta' && idx === '0') {
      studio.meta = d.meta;
      if (d.meta) { $('#stName').textContent = d.meta.name || 'Widget'; $('#stIcon').textContent = d.meta.icon || '🧩'; }
      if (metaWait && metaWait.seq === runSeq) { const w = metaWait; metaWait = null; w.resolve(d.meta); }
    }
    // Only show messages from the first preview so they don't repeat.
    if ((d.kind === 'log' || d.kind === 'error') && idx === '0') studioLog(d.kind, d.text, d.line);
    if (d.kind === 'error' && idx === '0' && metaWait && metaWait.seq === runSeq && !studio.meta) { /* wait: meta may still arrive */ }
  });

  async function freshMeta() {
    const meta = await runStudio();
    if (!meta) { toast('Fix the errors in the console before saving'); return null; }
    return meta;
  }

  async function studioSave() {
    const meta = await freshMeta(); if (!meta) return;
    if (studio.mode === 'new') return studioSaveAs(meta);
    commit(() => {
      if (studio.mode === 'builtin') {
        cfg.widgetOverrides = cfg.widgetOverrides || {};
        if (studio.js === FD.sourceOf(studio.type) && studio.css === (FD.BUILTIN[studio.type].css || '')) delete cfg.widgetOverrides[studio.type];
        else cfg.widgetOverrides[studio.type] = { source: studio.js, css: studio.css, meta };
      } else {
        const c = cfg.customWidgets.find((x) => 'custom:' + x.id === studio.type);
        Object.assign(c, { source: studio.js, css: studio.css, meta });
      }
    });
    studio.saved = { js: studio.js, css: studio.css };
    $('#stReset').hidden = !(studio.mode === 'builtin' && (cfg.widgetOverrides || {})[studio.type]);
    $('#stKind').textContent = studio.mode === 'builtin' ? ((cfg.widgetOverrides || {})[studio.type] ? 'Built-in · edited' : 'Built-in') : 'Your widget';
    updateStudioState();
    toast(studio.mode === 'builtin' ? `Saved: every ${meta.name} widget now uses your code` : `Saved ${meta.name}`);
  }

  async function studioSaveAs(knownMeta) {
    const meta = knownMeta || await freshMeta(); if (!meta) return;
    const name = await askText('Save as a new widget', studio.mode === 'new' ? meta.name : `${meta.name} copy`, 'The original stays as it is. Your new widget appears under My widgets.');
    if (!name) return;
    let js = studio.js;
    const re = /(\bname\s*:\s*)(['"`])((?:\\.|(?!\2).)*)\2/;
    if (re.test(js)) js = js.replace(re, (m, a, q) => `${a}${q}${name.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q)}${q}`);
    const id = FD.uid();
    const entry = { id, source: js, css: studio.css, meta: { ...meta, name } };
    commit(() => {
      cfg.customWidgets = cfg.customWidgets || [];
      cfg.customWidgets.push(entry);
      // The widget it was opened from now uses the new copy, like "Save as" in any editor.
      const inst = studio.fromWidget && pageOf() && pageOf().widgets.find((w) => w.id === studio.fromWidget);
      if (inst) inst.type = 'custom:' + id;
    });
    Object.assign(studio, { mode: 'custom', type: 'custom:' + id, js, saved: { js, css: studio.css } });
    $('#stCode').value = studio.tab === 'js' ? js : studio.css; updateGutter();
    $('#stTemplate').hidden = true; $('#stDelete').hidden = false; $('#stReset').hidden = true;
    $('#stKind').textContent = 'Your widget';
    $('#stName').textContent = name;
    updateStudioState();
    toast(`Saved as ${name}`);
  }

  function closeStudio() {
    if (dirty() && !confirm('Close without saving your changes?')) return;
    for (const v of studio.views) v.destroy();
    studio.views = [];
    delete FD.WIDGETS.__studio;
    studio.open = false;
    $('#studio').close();
    renderAll();
  }

  function bindStudio() {
    const code = $('#stCode');
    let t;
    code.addEventListener('input', () => {
      if (studio.tab === 'js') studio.js = code.value; else studio.css = code.value;
      updateGutter(); updateStudioState();
      clearTimeout(t); t = setTimeout(runStudio, 700);
    });
    code.addEventListener('scroll', () => { $('#stGutter').scrollTop = code.scrollTop; });
    code.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: a, selectionEnd: b, value } = code;
        code.value = value.slice(0, a) + '  ' + value.slice(b);
        code.selectionStart = code.selectionEnd = a + 2;
        code.dispatchEvent(new Event('input'));
      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        // keep the current indentation on a new line
        const { selectionStart: a, value } = code;
        const lineStart = value.lastIndexOf('\n', a - 1) + 1;
        const ind = value.slice(lineStart).match(/^ */)[0] + (/[{[(]\s*$/.test(value.slice(lineStart, a)) ? '  ' : '');
        e.preventDefault();
        code.setRangeText('\n' + ind, a, code.selectionEnd, 'end');
        code.dispatchEvent(new Event('input'));
      }
    });
    $('#studio').addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); e.shiftKey ? studioSaveAs() : studioSave(); }
      if (mod && e.key === 'Enter') { e.preventDefault(); runStudio(); }
    });
    $('#studio').addEventListener('cancel', (e) => { e.preventDefault(); closeStudio(); });
    $('#stTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
    $('#stRun').onclick = runStudio;
    $('#stSave').onclick = () => studioSave();
    $('#stSaveAs').onclick = () => studioSaveAs();
    $('#stClose').onclick = closeStudio;
    $('#stClear').onclick = () => { $('#stLog').innerHTML = ''; };
    $('#stTemplate').onchange = (e) => {
      const t = FD.TEMPLATES[e.target.value]; if (!t) return;
      if (dirty() && !confirm('Replace your code with this template?')) { e.target.value = ''; return; }
      studio.js = t.source; studio.css = t.css; setTab(studio.tab === 'help' ? 'js' : studio.tab); runStudio(); e.target.value = '';
    };
    $('#stReset').onclick = () => {
      if (!confirm('Go back to the original code for this widget? Your changes will be removed.')) return;
      commit(() => { delete cfg.widgetOverrides[studio.type]; });
      studio.js = FD.sourceOf(studio.type); studio.css = FD.BUILTIN[studio.type].css || '';
      studio.saved = { js: studio.js, css: studio.css };
      $('#stReset').hidden = true; $('#stKind').textContent = 'Built-in';
      setTab(studio.tab === 'help' ? 'js' : studio.tab); runStudio(); updateStudioState();
    };
    $('#stDelete').onclick = () => {
      const type = studio.type;
      const uses = cfg.screens.reduce((n, s) => n + s.pages.reduce((m, p) => m + p.widgets.filter((w) => w.type === type).length, 0), 0);
      if (!confirm(`Delete this widget${uses ? ` and remove it from ${uses} place${uses > 1 ? 's' : ''} in your layouts` : ''}?`)) return;
      commit(() => {
        cfg.customWidgets = cfg.customWidgets.filter((c) => 'custom:' + c.id !== type);
        for (const s of cfg.screens) for (const p of s.pages) p.widgets = p.widgets.filter((w) => w.type !== type);
        sel.widget = null;
      });
      studio.saved = { js: studio.js, css: studio.css };
      closeStudio();
    };
    $('#stExport').onclick = async () => {
      const meta = studio.meta || await freshMeta(); if (!meta) return;
      download(`${slug(meta.name)}.framedeck-widget.json`, { framedeck: 'widget', version: 1, widget: { source: studio.js, css: studio.css, meta } });
    };
    $('#stLog').addEventListener('click', (e) => {
      const b = e.target.closest('[data-line]'); if (!b) return;
      setTab('js');
      const lines = studio.js.split('\n');
      const n = Math.min(lines.length, Number(b.dataset.line));
      const pos = lines.slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0);
      code.focus(); code.setSelectionRange(pos, pos + lines[n - 1].length);
      code.scrollTop = Math.max(0, (n - 5) * 18);
    });
  }

  async function importWidgetFile(file) {
    try {
      const data = JSON.parse(await file.text());
      const w = data.widget;
      if (data.framedeck !== 'widget' || !w || typeof w.source !== 'string') throw new Error('Not a FrameDeck widget file');
      if (!(await confirmCode(1))) return;
      const meta = w.meta || await FD.extractMeta({ source: w.source, css: w.css || '' });
      if (!meta) throw new Error('The widget code has errors');
      commit(() => { cfg.customWidgets = cfg.customWidgets || []; cfg.customWidgets.push({ id: FD.uid(), source: w.source, css: w.css || '', meta }); });
      toast(`Imported ${meta.name}`);
    } catch (err) { toast('Import failed: ' + err.message); }
  }

  // ======================================================================
  // Pages: presets and custom
  // ======================================================================
  let pd = { mode: 'preset', chosen: null, thumbs: [] };
  function openPageDialog() {
    const scr = screenOf(); if (!scr) return;
    pd = { mode: 'preset', chosen: null, thumbs: [] };
    setPageMode('preset');
    $('#pdName').value = '';
    $('#pdCopyName').textContent = pageOf() ? `"${pageOf().name}" with all its widgets` : '';
    $('#pageDialog').showModal();
    renderPresetGrid();
  }
  function setPageMode(mode) {
    pd.mode = mode;
    document.querySelectorAll('#pdSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('#pdPreset').hidden = mode !== 'preset';
    $('#pdCustom').hidden = mode !== 'custom';
    $('#pdAdd').textContent = mode === 'preset' ? 'Add this preset' : 'Add page';
  }
  function closePageDialog() {
    for (const t of pd.thumbs) t.destroy();
    pd.thumbs = [];
    $('#pageDialog').close();
  }
  function renderPresetGrid() {
    const scr = screenOf();
    for (const t of pd.thumbs) t.destroy();
    pd.thumbs = [];
    const grid = $('#presetGrid');
    const presets = FD.allPresets(cfg);
    grid.innerHTML = presets.map((p) => {
      const mine = !p.builtin;
      return `<div class="preset ${pd.chosen === p.id ? 'sel' : ''}" data-id="${esc(p.id)}">
        <div class="thumb ${scr.profile.shape}"><div class="thumb-scale"></div></div>
        <div class="pinfo"><b>${esc(p.icon || '📄')} ${esc(p.name)}</b><span>${esc(p.desc || '')}</span>
          <div class="pacts">${mine ? `<span class="tagline">${p.replaces ? 'Edited preset' : 'Your preset'}</span>` : ''}
            <button type="button" class="mini" data-pact="export">Export</button>
            ${mine ? `<button type="button" class="mini danger" data-pact="delete">${p.replaces ? 'Reset' : 'Delete'}</button>` : ''}</div></div></div>`;
    }).join('');
    // Live thumbnails at this screen's shape.
    const tw = 196, s = Math.min(tw / scr.profile.w, 120 / scr.profile.h);
    grid.querySelectorAll('.preset').forEach((card) => {
      const p = presets.find((x) => x.id === card.dataset.id);
      const box = card.querySelector('.thumb');
      box.style.width = scr.profile.w * s + 'px';
      box.style.height = scr.profile.h * s + 'px';
      const host = card.querySelector('.thumb-scale');
      host.style.transform = `scale(${s})`;
      const page = { id: 'thumb', widgets: FD.presetToWidgets(p, scr) };
      pd.thumbs.push(FD.mountStage(host, scr, page, { editor: true }));
    });
  }
  function addPageFromPreset(p) {
    const scr = screenOf();
    const page = { id: FD.uid(), name: p.name, duration: 60, presetId: p.id, widgets: FD.presetToWidgets(p, scr) };
    commit(() => { scr.pages.push(page); sel.page = page.id; sel.widget = null; });
    toast(`Added "${p.name}". Change it, then use Save to preset on the right to update the preset.`);
  }
  function bindPageDialog() {
    $('#pdSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setPageMode(b.dataset.mode); });
    $('#pdCancel').onclick = closePageDialog;
    $('#pageDialog').addEventListener('cancel', (e) => { e.preventDefault(); closePageDialog(); });
    $('#presetGrid').addEventListener('click', async (e) => {
      const card = e.target.closest('.preset'); if (!card) return;
      const p = FD.allPresets(cfg).find((x) => x.id === card.dataset.id);
      const act = e.target.closest('[data-pact]');
      if (act && act.dataset.pact === 'export') {
        const widgets = p.widgets.map((w) => ({ ...w }));
        download(`${slug(p.name)}.framedeck-page.json`, { framedeck: 'page-preset', version: 1,
          preset: { name: p.name, icon: p.icon, desc: p.desc, widgets }, customWidgets: customWidgetsUsedBy([widgets]) });
        return;
      }
      if (act && act.dataset.pact === 'delete') {
        if (!confirm(p.replaces ? `Go back to the original "${p.name}" preset?` : `Delete the preset "${p.name}"? Pages already made from it stay.`)) return;
        commit(() => { cfg.pagePresets = cfg.pagePresets.filter((x) => x.id !== p.id); }, { rerender: 'none' });
        renderPresetGrid();
        return;
      }
      pd.chosen = p.id;
      document.querySelectorAll('#presetGrid .preset').forEach((c) => c.classList.toggle('sel', c === card));
    });
    $('#presetGrid').addEventListener('dblclick', (e) => {
      const card = e.target.closest('.preset'); if (!card || e.target.closest('[data-pact]')) return;
      const p = FD.allPresets(cfg).find((x) => x.id === card.dataset.id);
      closePageDialog(); addPageFromPreset(p);
    });
    $('#pdAdd').onclick = () => {
      const scr = screenOf();
      if (pd.mode === 'preset') {
        const p = FD.allPresets(cfg).find((x) => x.id === pd.chosen);
        if (!p) return toast('Pick a preset first, or switch to Custom');
        closePageDialog(); addPageFromPreset(p);
        return;
      }
      const name = $('#pdName').value.trim() || `Page ${scr.pages.length + 1}`;
      const copy = document.querySelector('input[name=pdStart]:checked').value === 'copy' && pageOf();
      const page = copy ? { ...JSON.parse(JSON.stringify(copy)), id: FD.uid(), name, presetId: undefined } : { id: FD.uid(), name, duration: 60, widgets: [] };
      page.widgets.forEach((w) => { w.id = FD.uid(); });
      closePageDialog();
      commit(() => { scr.pages.push(page); sel.page = page.id; sel.widget = null; });
    };
    $('#importPreset').onclick = () => $('#presetFile').click();
    $('#presetFile').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (data.framedeck !== 'page-preset' || !data.preset || !Array.isArray(data.preset.widgets)) throw new Error('Not a FrameDeck page preset');
        if (data.customWidgets && data.customWidgets.length && !(await confirmCode(data.customWidgets.length))) return;
        commit(() => {
          const map = adoptCustomWidgets(data.customWidgets);
          const widgets = data.preset.widgets.filter((w) => w && typeof w.type === 'string');
          remapTypes(widgets, map);
          cfg.pagePresets = cfg.pagePresets || [];
          cfg.pagePresets.push({ id: FD.uid(), name: data.preset.name || 'Imported preset', icon: data.preset.icon || '📄', desc: data.preset.desc || '', widgets });
        }, { rerender: 'none' });
        renderAll();
        renderPresetGrid();
        toast(`Imported "${data.preset.name}"`);
      } catch (err) { toast('Import failed: ' + err.message); }
    };
  }

  // Save the current page as a preset (new, or back into the preset it came from).
  async function savePageAsPreset(page, scr, { update = false } = {}) {
    const widgets = FD.pageToPresetWidgets(page, scr);
    const presets = FD.allPresets(cfg);
    const src = page.presetId && presets.find((p) => p.id === page.presetId);
    if (update && src) {
      commit(() => {
        cfg.pagePresets = cfg.pagePresets || [];
        if (src.builtin) {
          // Editing a built-in preset saves your version in its place; "Reset" brings the original back.
          const mine = { id: FD.uid(), replaces: src.id, name: src.name, icon: src.icon, desc: src.desc, widgets };
          cfg.pagePresets.push(mine);
          page.presetId = mine.id;
        } else Object.assign(cfg.pagePresets.find((p) => p.id === src.id), { widgets });
      });
      toast(`Updated the "${src.name}" preset`);
      return;
    }
    const name = await askText('Save page as a preset', page.name, 'You can pick it under Pages → + Add → Preset on any screen, and export it to share.');
    if (!name) return;
    commit(() => {
      cfg.pagePresets = cfg.pagePresets || [];
      const p = { id: FD.uid(), name, icon: '📄', desc: `${page.widgets.length} widget${page.widgets.length === 1 ? '' : 's'}`, widgets };
      cfg.pagePresets.push(p);
      page.presetId = p.id;
    });
    toast(`Saved preset "${name}"`);
  }

  // Grid density: how big each block is.
  const DENSITIES = [['large', 'Large blocks', 0.5], ['medium', 'Medium blocks', 0.75], ['small', 'Small blocks', 1], ['tiny', 'Tiny blocks', 1.6]];
  function gridForDensity(scr, k) {
    const base = FD.gridFor(scr.profile.w, scr.profile.h, scr.profile.shape);
    const f = DENSITIES.find((d) => d[0] === k)[2];
    return { cols: Math.max(2, Math.min(96, Math.round(base.cols * f))), rows: Math.max(2, Math.min(96, Math.round(base.rows * f))) };
  }
  function currentDensity(scr) {
    const hit = DENSITIES.find(([k]) => { const g = gridForDensity(scr, k); return g.cols === scr.cols && g.rows === scr.rows; });
    return hit ? hit[0] : '';
  }

  // ======================================================================
  // Guides (step-by-step tutorials)
  // ======================================================================
  const KRAKENS = [
    { key: 'elite', name: 'Kraken Elite', w: 640, h: 640, note: '2.36" screen' },
    { key: 'z', name: 'Kraken Z', w: 320, h: 320, note: 'Z53 / Z63 / Z73' },
    { key: 'base', name: 'Kraken', w: 240, h: 240, note: '1.54" screen' },
  ];
  let guideId = 'monitor';
  let guideScreen = null;
  const GUIDES = [
    ['monitor', '🖥️', 'A monitor or this computer'],
    ['tablet', '📱', 'A tablet or old phone'],
    ['kraken', '💧', 'NZXT Kraken LCD'],
    ['kiosk', '🧰', 'Any computer or Raspberry Pi'],
    ['widgets', '✎', 'Write your own widgets'],
    ['presets', '📄', 'Page presets & sharing'],
  ];

  function lanBase() { return info.shareOnLan && info.lanUrls && info.lanUrls[0] ? info.lanUrls[0] : null; }
  function linkBox(url, label) {
    return `<div class="g-link">${label ? `<span>${esc(label)}</span>` : ''}<div class="link-box"><input readonly value="${esc(url)}"><button class="btn small" data-copy="${esc(url)}">Copy</button></div></div>`;
  }
  function screenPicker(filter) {
    const list = cfg.screens.filter(filter || (() => true));
    if (!list.length) return '';
    if (!guideScreen || !list.some((s) => s.id === guideScreen)) guideScreen = list[0].id;
    return `<label class="g-pick">Screen <select data-gpick>${list.map((s) => `<option value="${s.id}" data-i18n-skip ${s.id === guideScreen ? 'selected' : ''}>${esc(s.name)} · ${s.profile.w}×${s.profile.h}${s.profile.shape === 'round' ? ' round' : ''}</option>`).join('')}</select></label>`;
  }
  function shareStep() {
    return lanBase()
      ? `<p class="ok">✓ Network sharing is on. This computer is at <b>${esc(lanBase().replace('http://', ''))}</b>.</p>`
      : `<p>Network sharing is off.</p><button class="btn small primary" data-gact="lan-on">Turn on network sharing</button>
         <p class="note">The first time, macOS may ask whether FrameDeck can accept incoming network connections. Click <b>Allow</b>.</p>`;
  }

  // What a translated guide needs to build the same live parts (links, pickers, buttons).
  function guideHelpers() {
    return {
      esc, info, cfg, displays, KRAKENS, lanBase, linkBox, screenPicker, shareStep,
      screen: () => cfg.screens.find((s) => s.id === guideScreen),
      pickRound() {
        const rounds = cfg.screens.filter((s) => s.profile.shape === 'round');
        if (rounds.length && (!guideScreen || !rounds.some((r) => r.id === guideScreen))) guideScreen = rounds[0].id;
        return rounds;
      },
    };
  }

  function guideHtml(id) {
    const scrSel = () => cfg.screens.find((s) => s.id === guideScreen);
    if (id === 'monitor') {
      return `<h2>Show a screen on a monitor or this computer</h2>
        <ol class="steps">
          <li><b>Make a screen the same size as the monitor.</b> Under Screens, click <b>+ Add</b>. Your connected displays are listed first with their real resolution, so the layout matches pixel for pixel. When you plug in a new monitor, FrameDeck offers to make a screen for it.
            ${displays.displays.length ? `<div class="g-displays">${displays.displays.map((d) => `<div class="disp"><div class="dn"><b>${esc(d.label)}</b><span>${d.w} × ${d.h}${d.hz ? ` · ${d.hz} Hz` : ''}${d.scale > 1 ? ` · looks like ${d.looksLikeW} × ${d.looksLikeH}` : ''}</span></div><button class="btn small" data-gact="make-for" data-display="${d.id}">Make a screen</button></div>`).join('')}</div>` : ''}</li>
          <li><b>Design it.</b> Add widgets from the left, or add a page from a preset.</li>
          <li><b>Show it.</b> Click <b>Show on a display</b> at the top right and pick the monitor. It opens fullscreen. Press <kbd>Esc</kbd> to close it, <kbd>←</kbd> <kbd>→</kbd> to flip pages.</li>
          <li><b>Make it permanent (optional).</b> In <b>Settings</b>, turn on <b>Open FrameDeck when I log in</b>. Displays that were showing when you quit open again by themselves, so a spare monitor works like a picture frame.</li>
        </ol>`;
    }
    if (id === 'tablet') {
      const s = scrSel();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : null;
      return `<h2>Use a tablet or old phone as a display</h2>
        <ol class="steps">
          <li><b>Make a screen for it.</b> Under Screens, click <b>+ Add</b> and pick <b>Tablet</b>, or choose <b>Custom size</b> and enter its resolution.</li>
          <li><b>Turn on network sharing.</b> ${shareStep()}</li>
          <li><b>Open the link on the tablet.</b> Both devices need to be on the same Wi-Fi. ${screenPicker()}
            ${url ? linkBox(url) : '<p class="note">The link appears here once sharing is on.</p>'}</li>
          <li><b>Make it fullscreen.</b> On iPhone or iPad, tap Share → <b>Add to Home Screen</b> and open it from there. On Android, open the browser menu → <b>Add to Home screen</b>. Double-tap the page to go fullscreen in other browsers.</li>
          <li><b>Keep it awake.</b> Set the tablet's auto-lock to Never while it's charging. On iPad, <b>Guided Access</b> (Settings → Accessibility) keeps it on this page.</li>
        </ol>
        <p class="note">Tap the left or right edge to flip pages. Tap a headline in a news widget to read it.</p>`;
    }
    if (id === 'kraken' && info.platform === 'win32') {
      const rounds = cfg.screens.filter((s) => s.profile.shape === 'round');
      if (rounds.length && (!guideScreen || !rounds.some((r) => r.id === guideScreen))) guideScreen = rounds[0].id;
      const s = scrSel();
      const url = s && s.profile.shape === 'round' ? `http://127.0.0.1:${info.port}/display.html?screen=${s.id}` : null;
      return `<h2>Show a screen on an NZXT Kraken LCD</h2>
        <p>FrameDeck and NZXT CAM run on this same PC, so this takes about a minute. CAM's <b>Web Integration</b> mode shows a FrameDeck page on the cooler.</p>
        <ol class="steps">
          <li><b>Make a round screen the size of your Kraken.</b>
            <div class="g-krakens">${KRAKENS.map((k) => `<button class="btn small" data-gact="make-kraken" data-k="${k.key}">${esc(k.name)} · ${k.w}×${k.h}<small>${esc(k.note)}</small></button>`).join('')}</div>
            <p class="note">Not sure which you have? Pick Kraken Elite; CAM tells FrameDeck the exact size and the page scales to fit. It comes with a clock page and a <b>Kraken stats</b> page with your liquid, CPU and GPU temperatures.</p></li>
          <li><b>Copy the link.</b> ${rounds.length ? screenPicker((x) => x.profile.shape === 'round') : '<p class="note">Make a Kraken screen in step 1 first.</p>'}
            ${url ? linkBox(url, 'Link to paste into NZXT CAM') + `<button class="btn small" data-gact="open-cam" data-url="${esc(url)}">Open in NZXT CAM</button>` : ''}</li>
          <li><b>Turn on Web Integration in NZXT CAM.</b>
            <ol class="sub"><li>Open <b>NZXT CAM</b> and click your Kraken.</li>
              <li>Go to the <b>Lighting</b> tab, open the <b>Mode</b> menu for the LCD and choose <b>Web Integration</b>.</li>
              <li>Next to <b>Custom</b>, click <b>Edit</b>, paste the link into the <b>URL</b> field and click the arrow.</li></ol></li>
          <li><b>Keep FrameDeck running.</b> In <b>Settings</b>, turn on <b>Open FrameDeck when I log in</b> so the cooler keeps working after a restart. FrameDeck starts in the background.</li>
        </ol>
        <h3>Troubleshooting</h3>
        <ul class="trouble">
          <li><b>The Kraken shows an old layout or nothing.</b> CAM only reloads when the link changes. Switch the Mode to something else and back to Web Integration.</li>
          <li><b>Kraken stats shows "No data".</b> Update NZXT CAM to version 4.50 or newer.</li>
          <li><b>The link stopped working.</b> FrameDeck picks the next free port if 47820 is busy. Copy the link from this page again.</li>
        </ul>`;
    }
    if (id === 'kraken') {
      const rounds = cfg.screens.filter((s) => s.profile.shape === 'round');
      const s = scrSel();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : null;
      return `<h2>Show a screen on an NZXT Kraken LCD</h2>
        <p>The Kraken's screen is controlled by <b>NZXT CAM</b>, which only runs on Windows. CAM has a <b>Web Integration</b> mode that shows any web page on the cooler. The simplest setup is FrameDeck for Windows on the gaming PC itself. To drive it from this computer instead, FrameDeck serves the page and CAM on the gaming PC displays it; both need to be on the same network.</p>
        <ol class="steps">
          <li><b>Make a round screen the size of your Kraken.</b>
            <div class="g-krakens">${KRAKENS.map((k) => `<button class="btn small" data-gact="make-kraken" data-k="${k.key}">${esc(k.name)} · ${k.w}×${k.h}<small>${esc(k.note)}</small></button>`).join('')}</div>
            <p class="note">Not sure which you have? Pick Kraken Elite. CAM tells FrameDeck the exact size and the page scales to fit. The new screen comes with a clock page and a <b>Kraken stats</b> page that shows your liquid, CPU and GPU temperatures from CAM.</p></li>
          <li><b>Turn on network sharing.</b> ${shareStep()}</li>
          <li><b>Copy the link for your Kraken screen.</b>
            ${rounds.length ? screenPicker((x) => x.profile.shape === 'round') : '<p class="note">Make a Kraken screen in step 1 first.</p>'}
            ${url && s && s.profile.shape === 'round' ? linkBox(url, 'Link to paste into NZXT CAM') + linkBox(`https://cam-redirect.nzxt.com/action/load-web-integration?url=${encodeURIComponent(url)}`, 'Or open this one-click link on the Windows PC (it opens CAM with the link filled in)') : ''}
            <p class="note">Send the link to yourself (email, Discord, Notes) so you can open it on the PC.</p></li>
          <li><b>Check the link on the Windows PC.</b> Paste it into Chrome or Edge on the gaming PC. You should see your screen. If it doesn't load, see Troubleshooting below.</li>
          <li><b>Turn on Web Integration in NZXT CAM.</b> On the Windows PC:
            <ol class="sub"><li>Open <b>NZXT CAM</b> and click your Kraken.</li>
              <li>Go to the <b>Lighting</b> tab, open the <b>Mode</b> menu for the LCD and choose <b>Web Integration</b>.</li>
              <li>Next to <b>Custom</b>, click <b>Edit</b>, paste the link into the <b>URL</b> field and click the arrow.</li></ol>
            Your FrameDeck screen appears on the cooler within a few seconds.</li>
          <li><b>Keep it running.</b> The computer running FrameDeck has to stay on and awake for the Kraken to update. On a Mac, go to System Settings → <b>Battery</b> (or <b>Energy</b>) → Options and turn on <b>Prevent automatic sleeping when the display is off</b> while plugged in. In your router's settings, give that computer a <b>reserved IP address</b> so the link keeps working.</li>
        </ol>
        <h3>Troubleshooting</h3>
        <ul class="trouble">
          <li><b>The link doesn't open on the PC.</b> Check both computers are on the same network (not a guest Wi-Fi), that network sharing is on, and that the firewall on the computer running FrameDeck allows it (on a Mac: System Settings → Network → Firewall → Options; on Windows, allow FrameDeck when Windows asks).</li>
          <li><b>The Kraken shows an old layout or nothing.</b> CAM only reloads when the link changes. Switch the Mode to something else and back to Web Integration.</li>
          <li><b>It worked yesterday but not today.</b> The address of the computer running FrameDeck probably changed. Reserve it in your router, then copy the new link here.</li>
          <li><b>Kraken stats shows "No data".</b> Update NZXT CAM to version 4.50 or newer.</li>
        </ul>
        <p class="note">Tip: installing FrameDeck for Windows on the gaming PC skips the network steps entirely.</p>`;
    }
    if (id === 'kiosk') {
      const s = scrSel();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : '<link from this page>';
      return `<h2>Use any computer or a Raspberry Pi as a display</h2>
        <p>Anything with a web browser can show a FrameDeck screen: an old laptop, a mini PC behind a TV, or a Raspberry Pi with a small HDMI or touch screen.</p>
        <ol class="steps">
          <li><b>Turn on network sharing.</b> ${shareStep()}</li>
          <li><b>Pick the screen to show.</b> ${screenPicker()}</li>
          <li><b>Open it fullscreen ("kiosk mode") on that computer.</b>
            <p><b>Raspberry Pi OS</b>, in a terminal:</p><pre>chromium-browser --kiosk --noerrdialogs --disable-infobars "${esc(url)}"</pre>
            <p><b>Windows</b>, in Command Prompt:</p><pre>start msedge --kiosk "${esc(url)}" --edge-kiosk-type=fullscreen</pre>
            <p><b>Another Mac or a PC</b>: open the link in a browser and double-click the page for fullscreen.</p></li>
          <li><b>Start it automatically (Raspberry Pi).</b> Add the command above to the end of <code>~/.config/labwc/autostart</code> (or <code>~/.config/lxsession/LXDE-pi/autostart</code> on older Pi OS), so the screen comes back after a reboot.</li>
        </ol>
        <p class="note">E-ink panels can't run a web browser. Sending pictures to an e-ink frame is on the roadmap; until then, <a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank">EpaperSystem</a> is the best choice for a Raspberry Pi with a Waveshare e-ink screen.</p>`;
    }
    if (id === 'widgets') {
      return `<h2>Write your own widgets</h2>
        <ol class="steps">
          <li><b>Start one.</b> Under Widgets → My widgets, click <b>+ New</b>. Pick a template to start from, or keep the blank one.</li>
          <li><b>Edit the code.</b> The <b>JavaScript</b> tab describes the widget and draws it; the <b>CSS</b> tab styles it. The preview on the right runs your code as you type, at several screen sizes, including a round screen and e-ink. Errors and <code>console.log()</code> show in the Console.</li>
          <li><b>Save.</b> <b>Save</b> (<kbd>⌘S</kbd>) updates the widget everywhere it's used. <b>Save as…</b> keeps the original and makes a new widget.</li>
          <li><b>Change a built-in widget.</b> Hover any widget in the list and click <b>✎</b>, or select one on the screen and click <b>Edit code</b>. Save changes it everywhere; <b>Reset to original</b> undoes it. Save as makes your own copy and leaves the built-in alone.</li>
          <li><b>Share it.</b> <b>Export</b> saves a <code>.framedeck-widget.json</code> file. Others add it with <b>Import</b> under My widgets.</li>
        </ol>
        <p>The <b>Reference</b> tab in the editor lists everything a widget can use: settings, sizes, data from the web, and helpers like rings and sparklines.</p>
        <p class="note">Widgets you write run in a sandbox: they can't change your layouts or files, and they can only load data from public internet addresses, not from your local network.</p>
        <button class="btn primary" data-gact="new-widget">Start a new widget</button>`;
    }
    return `<h2>Page presets & sharing</h2>
      <ol class="steps">
        <li><b>Add a page from a preset.</b> Under Pages, click <b>+ Add</b> and choose <b>Preset</b>. Presets are arranged for the screen you're on, round and e-ink included. Choose <b>Custom</b> for a blank page or a copy of the current one.</li>
        <li><b>Edit a preset.</b> Add a page from it and change anything. In the right panel, <b>Save to preset</b> updates the preset; <b>Save as new preset…</b> keeps the original. Built-in presets you edit can be put back with <b>Reset</b> in the preset list.</li>
        <li><b>Save any page as a preset.</b> Select the page and click <b>Save as preset…</b> on the right.</li>
        <li><b>Share.</b> In the preset list, <b>Export</b> saves a <code>.framedeck-page.json</code> file. Others add it with <b>Import a preset…</b>. Whole screens export from the right panel (<b>Export layout</b>). Your own widgets are included in both, so the file works on someone else's FrameDeck.</li>
        <li><b>Finer control.</b> Each screen's <b>Block size</b> (right panel) sets how small the grid is. Smaller blocks let you size and place widgets more precisely.</li>
      </ol>`;
  }

  function openGuides(id) {
    if (id) guideId = id;
    $('#guides').showModal();
    renderGuide();
  }
  function renderGuide() {
    $('#guideNav').innerHTML = '<h2>Guides</h2>' + GUIDES.map(([k, ic, l]) => `<button class="${k === guideId ? 'on' : ''}" data-guide="${k}"><span>${ic}</span>${esc(l)}</button>`).join('');
    $('#guideBody').innerHTML = FD.i18nGuide(guideId, guideHelpers()) || guideHtml(guideId);
    $('#guideBody').scrollTop = 0;
  }
  function makeScreen(name, profile, pages) {
    const g = FD.gridFor(profile.w, profile.h, profile.shape);
    const themeKey = profile.color !== 'full' ? profile.color : profile.shape === 'round' ? 'ring' : 'midnight';
    const theme = { ...FD.THEMES[themeKey] }; delete theme.name;
    const scr = { id: FD.uid(), name, profile, cols: g.cols, rows: g.rows, theme, rotate: true, pages: [] };
    for (const [presetId, pname, dur] of pages) {
      const p = FD.allPresets(cfg).find((x) => x.id === presetId);
      scr.pages.push({ id: FD.uid(), name: pname || p.name, duration: dur || 60, widgets: p ? FD.presetToWidgets(p, scr) : [] });
    }
    return scr;
  }
  function bindGuides() {
    $('#guidesBtn').onclick = () => openGuides();
    $('#guideClose').onclick = () => $('#guides').close();
    $('#guides').addEventListener('click', async (e) => {
      if (e.target === $('#guides')) { $('#guides').close(); return; }
      const nav = e.target.closest('[data-guide]');
      if (nav) { guideId = nav.dataset.guide; renderGuide(); return; }
      const cp = e.target.closest('[data-copy]');
      if (cp) { navigator.clipboard.writeText(cp.dataset.copy).then(() => toast('Link copied')); return; }
      const a = e.target.closest('[data-gact]');
      if (!a) return;
      const act = a.dataset.gact;
      if (act === 'lan-on') {
        commit(() => { cfg.shareOnLan = true; }, { rerender: 'none' });
        a.disabled = true; a.textContent = 'Turning on…';
        setTimeout(async () => { try { info = await api('/api/info'); } catch {} renderGuide(); }, 900);
      } else if (act === 'make-kraken') {
        const k = KRAKENS.find((x) => x.key === a.dataset.k);
        const scr = makeScreen(`NZXT ${k.name}`, { w: k.w, h: k.h, shape: 'round', color: 'full' }, [['clockdate', 'Clock', 30]]);
        // A stats page that fills the circle.
        const statsPage = { id: FD.uid(), name: 'Kraken stats', duration: 30, widgets: FD.presetToWidgets({ widgets: [{ type: 'kraken', fx: 0, fy: 0, fw: 1, fh: 1, settings: {} }] }, scr) };
        scr.pages.unshift(statsPage);
        commit(() => { cfg.screens.push(scr); selectScreen(scr.id); });
        guideScreen = scr.id;
        toast(`Made "${scr.name}". Continue with step 2.`);
        renderGuide();
      } else if (act === 'make-for') {
        const d = displays.displays.find((x) => x.id === a.dataset.display);
        if (!d) return;
        const scr = makeScreen(d.label, { w: d.w, h: d.h, shape: 'rect', color: 'full' }, [['today', 'Today', 60]]);
        commit(() => { cfg.screens.push(scr); selectScreen(scr.id); });
        $('#guides').close();
        toast(`Made a screen for ${d.label}`);
      } else if (act === 'open-cam') {
        window.open(`nzxt-cam://action/load-web-integration?url=${encodeURIComponent(a.dataset.url)}`, '_blank');
      } else if (act === 'new-widget') {
        $('#guides').close();
        openStudio({});
      }
    });
    $('#guides').addEventListener('change', (e) => { if (e.target.matches('[data-gpick]')) { guideScreen = e.target.value; renderGuide(); } });
  }

  // Offer to make a screen when a new monitor is plugged in.
  let knownDisplays = null;
  function checkNewDisplays() {
    const ids = new Set(displays.displays.map((d) => d.id));
    if (knownDisplays === null) { knownDisplays = ids; return; }
    const fresh = displays.displays.filter((d) => !knownDisplays.has(d.id));
    knownDisplays = ids;
    const box = $('#newDisplay');
    const d = fresh.find((x) => !cfg.screens.some((s) => s.profile.w === x.w && s.profile.h === x.h));
    if (!d) { if (!displays.displays.some((x) => x.id === box.dataset.id)) box.hidden = true; return; }
    box.dataset.id = d.id;
    box.innerHTML = `<span>🖥️ <b>${esc(d.label)}</b> connected · ${d.w} × ${d.h}${d.hz ? ` · ${d.hz} Hz` : ''}</span>
      <button class="btn small primary" data-nd="make">Make a screen for it</button><button class="btn small ghost" data-nd="dismiss">Not now</button>`;
    box.hidden = false;
  }
  function bindNewDisplay() {
    $('#newDisplay').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nd]'); if (!b) return;
      const box = $('#newDisplay');
      if (b.dataset.nd === 'make') {
        const d = displays.displays.find((x) => x.id === box.dataset.id);
        if (d) {
          const scr = makeScreen(d.label, { w: d.w, h: d.h, shape: 'rect', color: 'full' }, [['today', 'Today', 60]]);
          commit(() => { cfg.screens.push(scr); selectScreen(scr.id); });
          if (view) { view.destroy(); view = null; renderAll(); }
        }
      }
      box.hidden = true;
    });
  }


  // ======================================================================
  // Support / donate
  // ======================================================================
  const isSupporter = () => !!(info.supporter && info.supporter.supporter);
  function openDonate(reason) {
    renderDonate(reason);
    $('#donate').showModal();
  }
  function renderDonate(reason) {
    const P = FD.PROJECT || { donate: {} };
    const d = P.donate || {};
    const sup = info.supporter || {};
    const methods = [
      d.paypal ? `<a class="pay paypal" href="${esc(d.paypal)}" target="_blank" rel="noopener"><b>PayPal</b><span>${esc(d.paypal.replace(/^https?:\/\//, ''))}</span></a>` : '',
      d.venmo ? `<a class="pay venmo" href="${esc(d.venmo)}" target="_blank" rel="noopener"><b>Venmo</b><span>${esc(d.venmo.replace(/^https?:\/\/(account\.)?/, ''))}</span></a>` : '',
      d.zelle ? `<div class="pay zelle"><b>Zelle</b><span>${esc(d.zelle)}</span><button class="btn small" data-copy="${esc(d.zelle)}">Copy</button></div>` : '',
    ].filter(Boolean).join('');
    const themes = Object.values(FD.THEMES).filter((t) => t.supporter).map((t) => FD.tr(t.name)).join(FD.lang.startsWith('zh') ? '、' : ', ');
    $('#donateBody').innerHTML = sup.supporter ? `
      <h3>♥ Thank you, ${esc(sup.name)}!</h3>
      <p>You're a FrameDeck supporter${sup.issued ? ` since ${esc(sup.issued)}` : ''}. Supporter themes are unlocked: ${esc(themes)}.</p>
      ${methods ? `<p class="muted">Want to chip in again?</p><div class="pays">${methods}</div>` : ''}
      <div class="dlg-actions"><button class="btn ghost small" data-don="remove">Remove key from this computer</button><button class="btn primary" data-don="close">Close</button></div>`
      : `
      <h3>♥ Support FrameDeck</h3>
      ${reason ? `<p class="reason">${esc(reason)}</p>` : ''}
      <p>FrameDeck is free and open source. If it's useful to you, a donation of any size keeps it going.</p>
      ${methods ? `<div class="pays">${methods}</div><p class="muted">${esc(P.keyNote || '')}</p>` : '<p class="muted">Donation links haven\'t been set up yet.</p>'}
      <p class="perks">Supporters get a key that unlocks: <b>${esc(themes)}</b> themes, and a supporter badge.</p>
      <label class="block">Have a supporter key?<input type="text" id="supKey" placeholder="FD1-…" spellcheck="false" autocomplete="off"></label>
      <p class="note">A key works on up to 3 computers. Unlocking needs an internet connection once.</p>
      <p class="note warn" id="supErr" hidden></p>
      <div class="dlg-actions"><button class="btn ghost" data-don="close">Not now</button><button class="btn primary" data-don="apply">Unlock</button></div>`;
  }
  function bindDonate() {
    $('#donateBtn').onclick = () => openDonate();
    $('#donate').addEventListener('click', async (e) => {
      if (e.target === $('#donate')) { $('#donate').close(); return; }
      const cp = e.target.closest('[data-copy]');
      if (cp) { navigator.clipboard.writeText(cp.dataset.copy).then(() => toast('Copied')); return; }
      const b = e.target.closest('[data-don]'); if (!b) return;
      if (b.dataset.don === 'close') { $('#donate').close(); return; }
      if (b.dataset.don === 'remove') {
        if (!confirm('Remove the supporter key from this computer? You can add it again any time.')) return;
        info.supporter = await api('/api/supporter', { method: 'POST', body: JSON.stringify({ remove: true }) });
        updateSupporterUi(); renderDonate(); renderInspector();
        return;
      }
      if (b.dataset.don === 'apply') {
        try {
          info.supporter = await api('/api/supporter', { method: 'POST', body: JSON.stringify({ key: $('#supKey').value }) });
          updateSupporterUi(); renderDonate(); renderInspector();
          toast('Thank you! Supporter features unlocked.');
        } catch (err) { const el = $('#supErr'); el.textContent = err.message; el.hidden = false; }
      }
    });
  }
  function updateSupporterUi() {
    const b = $('#donateBtn');
    b.classList.toggle('is-supporter', isSupporter());
    b.textContent = isSupporter() ? '♥ Supporter' : '♥ Support';
  }

  // ---------- language ----------
  function setLanguage(lang) {
    commit(() => { cfg.language = lang; }, { rerender: 'none' });
    // Changing away from a translation needs the original text back, so wait for the save and reload.
    if (lang === 'en' || FD.lang !== 'en') setTimeout(() => location.reload(), 600);
    else FD.setLanguage(lang);
  }
  function askLanguage() {
    const d = $('#langDialog');
    const suggested = FD.suggestLanguage();
    $('#langChoices').innerHTML = FD.LANGUAGES.map(([k, l]) => `<button class="lang-choice ${k === suggested ? 'on' : ''}" data-lang="${k}">${l}</button>`).join('');
    $('#langChoices').onclick = (e) => {
      const b = e.target.closest('[data-lang]'); if (!b) return;
      d.close();
      setLanguage(b.dataset.lang);
    };
    d.addEventListener('cancel', (e) => e.preventDefault());
    d.showModal();
  }

  // ---------- start ----------
  (async () => {
    const r = await api('/api/config');
    cfg = r.config;
    await FD.loadAddons();
    if (cfg.language && cfg.language !== 'en') FD.setLanguage(cfg.language);
    FD.registerUserWidgets(cfg);
    renderPalette();
    bind();
    fixSelection();
    updateUndo();
    try { info = await api('/api/info'); } catch {}
    document.body.classList.toggle('mac', info.platform === 'darwin');
    updateSupporterUi();
    await refreshDisplays();
    renderAll();
    if (!cfg.language) askLanguage();
  })().catch((err) => { document.body.innerHTML = `<p style="padding:40px">FrameDeck couldn't load: ${esc(err.message)}</p>`; });
})();
