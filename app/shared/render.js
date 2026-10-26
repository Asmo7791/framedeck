// Draws one page of a screen at the screen's real pixel size.
// Used by both the editor canvas and the display window.
(function () {
  const FD = (window.FD = window.FD || {});
  const dataCache = new Map();

  FD.fetchJSON = async function (url, headers) {
    const r = await fetch(url, { cache: 'no-store', headers });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  };

  function sizeInfo(w, h) {
    const m = Math.min(w, h);
    return {
      w, h,
      cls: m < 90 ? 'xs' : m < 170 ? 's' : m < 320 ? 'm' : 'l',
      aspect: w > h * 1.35 ? 'wide' : h > w * 1.35 ? 'tall' : 'square',
      cols: w / 100,
      rows: h / 100,
    };
  }

  // Built-in widgets keep their CSS with their code; add it to the page once per type.
  FD.ensureWidgetCss = function (type, css) {
    if (!css) return;
    const id = 'fd-css-' + type.replace(/[^\w-]/g, '_');
    let tag = document.getElementById(id);
    if (!tag) { tag = document.createElement('style'); tag.id = id; document.head.appendChild(tag); }
    if (tag.textContent !== css) tag.textContent = css;
  };

  FD.applyTheme = function (el, scr) {
    const t = FD.effectiveTheme(scr);
    const { w, h } = scr.profile;
    const unit = Math.min(w, h) / 100;
    el.style.setProperty('--bg', t.bg);
    el.style.setProperty('--fg', t.fg);
    el.style.setProperty('--muted', t.muted);
    el.style.setProperty('--accent', t.accent);
    el.style.setProperty('--card-bg', t.cardBg);
    el.style.setProperty('--radius', (t.radius * unit / 6) + 'px');
    el.style.setProperty('--gap', Math.max(2, (t.gap ?? 1) * unit * 1.4) + 'px');
    el.style.setProperty('--font', FD.FONTS[t.font] || FD.FONTS.system);
    el.dataset.card = t.card;
    el.dataset.color = scr.profile.color;
    el.dataset.shape = scr.profile.shape;
    return t;
  };

  FD.mountStage = function (host, scr, page, opts = {}) {
    const stage = document.createElement('div');
    stage.className = 'fd-stage';
    host.appendChild(stage);
    const instances = new Map();
    let current = { scr, page };

    // A widget is rebuilt when its type, settings or code change. Custom widgets
    // also rebuild on theme changes because they render in their own frame.
    function sigOf(wd) {
      const def = FD.WIDGETS[wd.type] || {};
      return JSON.stringify([wd.type, wd.settings, def.version || 0, def.themed ? FD.effectiveTheme(current.scr) : 0]);
    }

    function geometry(wd) {
      const { w, h } = current.scr.profile;
      const cw = w / current.scr.cols, ch = h / current.scr.rows;
      return { left: wd.x * cw, top: wd.y * ch, width: wd.w * cw, height: wd.h * ch };
    }

    function layoutInst(inst) {
      const g = geometry(inst.wd);
      Object.assign(inst.el.style, { left: g.left + 'px', top: g.top + 'px', width: g.width + 'px', height: g.height + 'px' });
      // Measure the content box once laid out; fall back to the computed size.
      const gap = parseFloat(getComputedStyle(stage).getPropertyValue('--gap')) || 8;
      const card = stage.dataset.card !== 'none';
      const pad = card ? Math.max(4, Math.min(28, Math.min(g.width, g.height) * 0.07)) : Math.max(2, Math.min(g.width, g.height) * 0.03);
      inst.body.style.padding = pad + 'px';
      Object.assign(inst.ctx, sizeInfo(Math.max(1, g.width - gap - pad * 2), Math.max(1, g.height - gap - pad * 2)));
    }

    function draw(inst) {
      try {
        inst.def.render(inst.body, inst.settings, inst.ctx);
      } catch (err) {
        inst.body.innerHTML = `<div class="fd-empty"><b>${FD.esc(inst.def.name)}</b><span>${FD.esc(err.message)}</span></div>`;
      }
    }

    async function load(inst) {
      const key = inst.wd.type + ':' + JSON.stringify(inst.settings);
      const hit = dataCache.get(key);
      const ttl = Math.min(inst.def.dataEvery || 60000, 60000) / 2;
      if (hit && Date.now() - hit.t < ttl) { inst.ctx.data = hit.v; inst.ctx.error = null; draw(inst); return; }
      try {
        const v = await inst.def.data(inst.settings, inst.ctx);
        dataCache.set(key, { t: Date.now(), v });
        if (inst.dead) return;
        inst.ctx.data = v; inst.ctx.error = null;
      } catch (err) {
        if (inst.dead) return;
        inst.ctx.error = err.message;
      }
      draw(inst);
    }

    function mount(wd) {
      const def = FD.WIDGETS[wd.type];
      const el = document.createElement('div');
      el.className = 'fd-w';
      el.dataset.id = wd.id;
      el.dataset.type = wd.type;
      const cardEl = document.createElement('div');
      cardEl.className = 'fd-card';
      const body = document.createElement('div');
      body.className = 'fd-body';
      cardEl.appendChild(body);
      el.appendChild(cardEl);
      stage.appendChild(el);
      if (!def) {
        body.innerHTML = `<div class="fd-empty"><b>Unknown widget</b><span>${FD.esc(wd.type)}</span></div>`;
        return { wd, el, body, def: { render() {} }, ctx: {}, timers: [], settings: {} };
      }
      const inst = {
        wd, el, body, def, timers: [], dead: false,
        settings: { ...FD.widgetDefaults(wd.type), ...(wd.settings || {}) },
        sig: sigOf(wd),
      };
      inst.ctx = {
        editor: !!opts.editor,
        shape: current.scr.profile.shape,
        color: current.scr.profile.color,
        fetchJSON: FD.fetchJSON,
        every: (ms, fn) => { const t = setInterval(fn, ms); inst.timers.push(t); return t; },
        theme: FD.effectiveTheme(current.scr),
        widgetId: wd.id,
      };
      if (wd.style && wd.style.card) el.dataset.card = wd.style.card;
      if (!def.frame) FD.ensureWidgetCss(wd.type, def.css);
      layoutInst(inst);
      draw(inst);
      if (def.tick) inst.timers.push(setInterval(() => draw(inst), def.tick));
      if (def.data) { load(inst); inst.timers.push(setInterval(() => load(inst), def.dataEvery || 60000)); }
      return inst;
    }

    function unmount(inst) {
      inst.dead = true;
      inst.timers.forEach(clearInterval);
      inst.el.remove();
    }

    function setPage(scr2, page2) {
      current = { scr: scr2, page: page2 };
      const t = FD.applyTheme(stage, scr2);
      stage.style.width = scr2.profile.w + 'px';
      stage.style.height = scr2.profile.h + 'px';
      stage.style.background = t.bg;
      stage.style.color = t.fg;
      const seen = new Set();
      for (const wd of (page2 ? page2.widgets : [])) {
        seen.add(wd.id);
        const sig = sigOf(wd);
        let inst = instances.get(wd.id);
        if (inst && (inst.sig !== sig || inst.ctx.shape !== scr2.profile.shape || inst.ctx.color !== scr2.profile.color)) { unmount(inst); inst = null; }
        if (!inst) { instances.set(wd.id, mount(wd)); continue; }
        inst.wd = wd;
        const before = `${inst.ctx.w}x${inst.ctx.h}`;
        layoutInst(inst);
        if (`${inst.ctx.w}x${inst.ctx.h}` !== before) draw(inst);
      }
      for (const [id, inst] of instances) if (!seen.has(id)) { unmount(inst); instances.delete(id); }
      // Keep stacking order equal to list order.
      for (const wd of (page2 ? page2.widgets : [])) { const i = instances.get(wd.id); if (i) stage.appendChild(i.el); }
    }

    setPage(scr, page);
    return {
      stage,
      update: setPage,
      redrawAll() { for (const inst of instances.values()) { layoutInst(inst); draw(inst); } },
      destroy() { for (const inst of instances.values()) unmount(inst); instances.clear(); stage.remove(); },
    };
  };
})();
