// Fullscreen player for one screen: scales the page to the window and rotates pages.
(function () {
  const params = new URLSearchParams(location.search);
  const screenId = params.get('screen');
  const inApp = params.get('app') === '1';
  // NZXT CAM loads the page on the Kraken with ?kraken=1 and can send temperatures.
  const onKraken = params.get('kraken') === '1';
  const nz = (window.nzxt = window.nzxt || {});
  nz.v1 = nz.v1 || {};
  nz.v1.onMonitoringDataUpdate = (data) => { FD.nzxtData = data; FD.nzxtAt = Date.now(); };
  if (onKraken) document.body.classList.add('idle', 'kraken');
  const host = document.getElementById('host');
  const hint = document.getElementById('hint');
  let config, scr, view, pageIndex = 0, timer = null;

  async function loadConfig() {
    const r = await FD.fetchJSON('/api/config');
    config = r.config;
    if (config.language && config.language !== 'en' && FD.lang !== config.language) FD.setLanguage(config.language);
    FD.registerUserWidgets(config);
  }

  function showPicker() {
    document.getElementById('wrap').innerHTML = `<div id="picker"><h1>Choose a screen</h1>${config.screens.map((s) =>
      `<a href="?screen=${encodeURIComponent(s.id)}"><span data-i18n-skip>${FD.esc(s.name)}</span><small>${s.profile.w} × ${s.profile.h}${s.profile.shape === 'round' ? ' · round' : ''}</small></a>`).join('')}</div>`;
  }

  function fit() {
    if (!scr) return;
    const s = Math.min(innerWidth / scr.profile.w, innerHeight / scr.profile.h);
    host.style.width = scr.profile.w + 'px';
    host.style.height = scr.profile.h + 'px';
    host.style.transform = `scale(${s})`;
  }

  function pages() { return (scr && scr.pages.length ? scr.pages : [{ id: 'empty', name: 'Empty', duration: 60, widgets: [] }]); }

  function schedule() {
    clearTimeout(timer);
    const list = pages();
    if (!scr.rotate || list.length < 2) return;
    const secs = Math.max(5, Number(list[pageIndex].duration) || 60);
    timer = setTimeout(() => go(pageIndex + 1), secs * 1000);
  }

  function go(i, instant) {
    const list = pages();
    pageIndex = ((i % list.length) + list.length) % list.length;
    const eink = scr.profile.color !== 'full';
    const swap = () => {
      if (!view) view = FD.mountStage(host, scr, list[pageIndex], {});
      else view.update(scr, list[pageIndex]);
      host.classList.remove('fading');
      schedule();
    };
    if (instant || eink || !view) swap();
    else { host.classList.add('fading'); setTimeout(swap, 450); }
  }

  async function refresh() {
    await loadConfig();
    const next = config.screens.find((s) => s.id === screenId);
    if (!next) { if (view) { view.destroy(); view = null; } scr = null; showPicker(); return; }
    const oldPage = scr && pages()[pageIndex] && pages()[pageIndex].id;
    scr = next;
    document.title = scr.name + ' — FrameDeck';
    const idx = pages().findIndex((p) => p.id === oldPage);
    pageIndex = idx >= 0 ? idx : Math.min(pageIndex, pages().length - 1);
    fit();
    go(pageIndex, true);
  }

  // Hide the cursor when idle; show a short hint when the mouse moves.
  let idleT;
  function wake() {
    if (onKraken) return;
    document.body.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => document.body.classList.add('idle'), 2500);
  }
  function flash(text) { hint.textContent = text; hint.classList.add('show'); clearTimeout(flash.t); flash.t = setTimeout(() => hint.classList.remove('show'), 2200); }

  addEventListener('mousemove', () => { wake(); if (scr) flash(inApp ? '← → change page · Esc closes · double-click toggles fullscreen' : '← → change page · double-click for fullscreen'); });
  addEventListener('resize', fit);
  addEventListener('keydown', (e) => {
    if (!scr) return;
    if (e.key === 'ArrowRight') go(pageIndex + 1);
    if (e.key === 'ArrowLeft') go(pageIndex - 1);
  });
  addEventListener('dblclick', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  // Tap left or right edge to change pages on phones and tablets.
  addEventListener('click', (e) => {
    if (!scr || inApp) return;
    if (e.target.closest('.fd-w a, .fd-w button, .fd-w li[data-i], .fd-w video')) return; // taps meant for a widget
    if (e.clientX < innerWidth * 0.2) go(pageIndex - 1);
    else if (e.clientX > innerWidth * 0.8) go(pageIndex + 1);
  });

  function listen() {
    const es = new EventSource('/api/events');
    es.addEventListener('config', () => refresh().catch(() => {}));
    es.onerror = () => { es.close(); setTimeout(() => { refresh().catch(() => {}); listen(); }, 4000); };
  }

  (async () => {
    try {
      await loadConfig();
    } catch (err) {
      document.body.innerHTML = `<p style="color:#ddd;font:16px sans-serif;padding:2em">FrameDeck isn't reachable (${FD.esc(err.message)}).</p>`;
      return;
    }
    if (!screenId) { showPicker(); return; }
    await refresh();
    wake();
    listen();
  })();
})();
