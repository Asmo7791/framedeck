// Health widgets you can tap: pomodoro timer, water tracker, habit tracker and move breaks.
// Their state lives on the computer running FrameDeck (/api/state, src/widgetstate.js), so
// every screen showing a widget agrees, and a phone or tablet display can log a glass of water.
(function () {
  const FD = window.FD;
  const W = FD.WIDGETS;
  const { esc, ring } = FD.h;
  const tr = (s) => (FD.tr ? FD.tr(s) : s);

  // The server's clock decides when timers end; offset corrects for this device's clock.
  const withOffset = (d) => ({ ...d, offset: d.now - Date.now() });
  const load = (s, ctx) => ctx.fetchJSON('/api/state?id=' + encodeURIComponent(ctx.widgetId)).then(withOffset);
  async function act(def, el, s, ctx, body) {
    const r = await fetch('/api/state', { method: 'POST', headers: { 'x-framedeck': '1', 'content-type': 'application/json' }, body: JSON.stringify({ id: ctx.widgetId, ...body }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
    ctx.data = withOffset(d);
    def.render(el, s, ctx);
  }
  // Buttons inside a widget: <button data-act="...">. One handler per widget box.
  function onButtons(el, handler) {
    el.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !el.contains(b)) return;
      e.stopPropagation();
      Promise.resolve(handler(b.dataset.act, b)).catch(() => {});
    };
  }
  const mmss = (sec) => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
  const waiting = (ctx) => (ctx.error ? `<div class="fd-empty"><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>');
  // Settings labels stay English here; the editor translates them on screen.
  const minutes = (list) => list.map((m) => [String(m), m < 60 ? `${m} minutes` : m === 60 ? '1 hour' : `${m / 60} hours`]);

  // ---------- pomodoro ----------
  function chime() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((t, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.frequency.value = [880, 1046, 1318][i];
        g.gain.setValueAtTime(0.0001, a.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.4);
        o.connect(g).connect(a.destination);
        o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.45);
      });
    } catch { /* no sound on this device */ }
  }
  W.pomodoro = {
    name: 'Pomodoro timer', icon: '🍅', desc: 'Focus sessions with short and long breaks',
    def: [4, 4], min: [2, 2], tick: 1000, dataEvery: 10000, noEdit: true,
    settings: [
      { key: 'work', label: 'Focus length', type: 'select', default: '25', options: minutes([15, 20, 25, 30, 45, 50, 60, 90]) },
      { key: 'short', label: 'Short break', type: 'select', default: '5', options: minutes([3, 5, 10]) },
      { key: 'long', label: 'Long break', type: 'select', default: '15', options: minutes([10, 15, 20, 30]) },
      { key: 'every', label: 'Long break after', type: 'select', default: '4', options: [2, 3, 4, 5, 6].map((n) => [String(n), `${n} focus sessions`]) },
      { key: 'auto', label: 'Start the next session by itself', type: 'toggle', default: false },
      { key: 'sound', label: 'Chime when a session ends', type: 'toggle', default: true },
    ],
    data: load,
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = waiting(ctx); return; }
      const st = { phase: 'focus', round: 1, running: false, endsAt: null, remaining: null, ...d.state };
      const len = (p) => Number(p === 'focus' ? s.work : p === 'short' ? s.short : s.long) * 60;
      const now = Date.now() + (d.offset || 0);
      let left = st.running ? (st.endsAt - now) / 1000 : st.remaining ?? len(st.phase);
      const every = Number(s.every) || 4;
      const next = () => (st.phase === 'focus'
        ? { phase: st.round % every === 0 ? 'long' : 'short', round: st.round }
        : { phase: 'focus', round: st.phase === 'long' ? 1 : st.round + 1 });
      // Time's up: move on (once, even with several screens), and chime.
      if (st.running && left <= 0 && !ctx.editor) {
        left = 0;
        if (el._ended !== st.endsAt) {
          el._ended = st.endsAt;
          if (s.sound) chime();
          const n = next();
          act(this, el, s, ctx, { op: 'next', expect: st.endsAt, ...n, seconds: len(n.phase), run: !!s.auto }).catch(() => {});
        }
      }
      const label = { focus: tr('Focus'), short: tr('Short break'), long: tr('Long break') }[st.phase];
      const pct = Math.min(100, Math.max(0, (1 - left / len(st.phase)) * 100));
      const dots = Array.from({ length: every }, (_, i) => `<i class="${i < (st.phase === 'focus' ? st.round - 1 : st.round) ? 'on' : ''}"></i>`).join('');
      const small = ctx.cls === 'xs';
      el.innerHTML = `<div class="w-pomo ${st.phase} ${st.running ? 'run' : ''}">
        <div class="w-pomo-ring">${ring(pct, mmss(left), small ? '' : label, st.phase === 'focus' ? 'var(--accent)' : 'var(--fg)')}</div>
        ${small ? '' : `<div class="w-pomo-dots">${dots}</div>`}
        <div class="w-pomo-btns">
          <button data-act="${st.running ? 'pause' : 'start'}" class="main">${st.running ? '⏸' : '▶'}<span>${tr(st.running ? 'Pause' : 'Start')}</span></button>
          ${small ? '' : `<button data-act="skip" title="${esc(tr('Skip'))}">⏭</button><button data-act="reset" title="${esc(tr('Reset'))}">↺</button>`}
        </div></div>`;
      onButtons(el, (a) => {
        if (a === 'start') return act(this, el, s, ctx, { op: 'start', seconds: len(st.phase) });
        if (a === 'pause') return act(this, el, s, ctx, { op: 'pause' });
        if (a === 'reset') return act(this, el, s, ctx, { op: 'reset' });
        const n = next();
        return act(this, el, s, ctx, { op: 'next', ...n, seconds: len(n.phase), run: st.running });
      });
    },
    css: `
.w-pomo { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3cqh; height: 100%; }
.w-pomo-ring { width: min(80cqw, 62cqh); }
.w-pomo-dots { display: flex; gap: 1.6cqw; }
.w-pomo-dots i { width: min(3cqw, 2.4cqh); height: min(3cqw, 2.4cqh); border-radius: 50%; border: 1px solid var(--muted); }
.w-pomo-dots i.on { background: var(--accent); border-color: var(--accent); }
.w-pomo-btns { display: flex; gap: 2cqw; }
.w-pomo-btns button, .w-water-btns button, .w-hab-row, .w-brk button { font: inherit; color: var(--fg); background: color-mix(in srgb, var(--fg) 10%, transparent); border: 0; border-radius: calc(var(--radius) * .6); cursor: pointer; }
.w-pomo-btns button { font-size: min(6cqw, 6cqh); padding: .3em .6em; display: flex; align-items: center; gap: .3em; }
.w-pomo-btns button.main { background: var(--accent); color: var(--bg); font-weight: 700; }
.w-pomo-btns button span { font-size: .75em; }
`,
  };

  // ---------- water ----------
  W.water = {
    name: 'Water tracker', icon: '💧', desc: 'Tap to log a glass; resets every day',
    def: [3, 4], min: [1, 1], tick: 60000, dataEvery: 15000, noEdit: true,
    settings: [
      { key: 'goal', label: 'Glasses a day', type: 'select', default: '8', options: [4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map((n) => [String(n), String(n)]) },
      { key: 'size', label: 'Glass size', type: 'select', default: '250', options: [['200', '200 ml'], ['250', '250 ml'], ['300', '300 ml'], ['350', '350 ml (12 oz)'], ['500', '500 ml'], ['237', '8 oz'], ['473', '16 oz']] },
      { key: 'unit', label: 'Show amounts in', type: 'select', default: 'ml', options: [['ml', 'ml / liters'], ['oz', 'fluid ounces']] },
      { key: 'remind', label: 'Remind me after', type: 'select', default: '90', options: [['0', 'Never']].concat(minutes([45, 60, 90, 120])) },
    ],
    data: load,
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = waiting(ctx); return; }
      const st = d.state && d.state.day === d.day ? d.state : { count: 0, last: null };
      const goal = Number(s.goal) || 8;
      const ml = st.count * (Number(s.size) || 250);
      const amount = s.unit === 'oz' ? `${Math.round(ml / 29.574)} oz` : ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`;
      const now = Date.now() + (d.offset || 0);
      const remind = Number(s.remind) * 60000;
      const nudge = remind > 0 && st.count < goal && (st.last ? now - st.last > remind : new Date(now).getHours() >= 10);
      const small = ctx.cls === 'xs';
      const glasses = Array.from({ length: goal }, (_, i) => `<i class="${i < st.count ? 'on' : ''}"></i>`).join('');
      el.innerHTML = `<div class="w-water ${nudge ? 'nudge' : ''} ${st.count >= goal ? 'done' : ''}">
        <div class="w-water-num"><b>${st.count}</b><span>/ ${goal}</span></div>
        ${small ? '' : `<div class="w-water-glasses">${glasses}</div><div class="w-water-sub">${st.count >= goal ? tr('Goal reached!') : nudge ? tr('Time for some water') : amount}</div>`}
        <div class="w-water-btns">${small ? '' : '<button data-act="remove" class="minus">−</button>'}<button data-act="add" class="plus">＋ ${small ? '' : tr('Glass')}</button></div>
      </div>`;
      onButtons(el, (a) => act(this, el, s, ctx, { op: a }));
    },
    css: `
.w-water { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3cqh; height: 100%; text-align: center; }
.w-water-num b { font-size: min(26cqw, 22cqh); font-weight: 800; color: var(--accent); line-height: 1; }
.w-water-num span { font-size: min(9cqw, 8cqh); color: var(--muted); margin-left: .2em; }
.w-water-glasses { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.4cqw; max-width: 90cqw; }
.w-water-glasses i { width: min(6cqw, 5cqh); height: min(8cqw, 7cqh); border: 2px solid var(--muted); border-top: 0; border-radius: 0 0 25% 25%; }
.w-water-glasses i.on { background: var(--accent); border-color: var(--accent); }
.w-water-sub { color: var(--muted); font-size: min(7cqw, 6cqh); }
.w-water.nudge .w-water-sub { color: var(--accent); font-weight: 700; }
.w-water-btns { display: flex; gap: 2cqw; }
.w-water-btns button { font-size: min(8cqw, 7cqh); padding: .25em .7em; font-weight: 700; }
.w-water-btns .plus { background: var(--accent); color: var(--bg); }
`,
  };

  // ---------- habits ----------
  const dayKey = (base, back) => { const [y, m, d] = base.split('-').map(Number); const t = new Date(y, m - 1, d - back); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  W.habits = {
    name: 'Habit tracker', icon: '✅', desc: 'Tick off daily habits and keep your streaks',
    def: [5, 5], min: [2, 2], tick: 0, dataEvery: 15000, noEdit: true,
    settings: [
      { key: 'habits', label: 'Habits (one per line)', type: 'textarea', default: '💧 Drink water\n🏃 Exercise\n📖 Read 20 minutes\n🧘 Meditate' },
      { key: 'week', label: 'Show the last 7 days', type: 'toggle', default: true },
      { key: 'streak', label: 'Show streaks', type: 'toggle', default: true },
    ],
    data: load,
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = waiting(ctx); return; }
      const habits = String(s.habits || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 50);
      if (!habits.length) { el.innerHTML = `<div class="fd-empty"><b>${esc(tr('Habit tracker'))}</b><span>${esc(tr("Add habits in this widget's settings."))}</span></div>`; return; }
      const done = (d.state && d.state.done) || {};
      const has = (day, i) => (done[day] || []).includes(i);
      const streak = (i) => { let n = 0, k = has(d.day, i) ? 0 : 1; while (has(dayKey(d.day, k), i)) { n++; k++; } return n; };
      const showWeek = s.week && ctx.cls !== 'xs' && ctx.cls !== 's';
      el.innerHTML = `<div class="w-hab" style="--n:${habits.length}">${habits.map((h, i) => {
        const on = has(d.day, i), n = s.streak ? streak(i) : 0;
        const week = showWeek ? `<span class="w-hab-week">${[6, 5, 4, 3, 2, 1, 0].map((k) => `<i class="${has(dayKey(d.day, k), i) ? 'on' : ''}"></i>`).join('')}</span>` : '';
        return `<button class="w-hab-row ${on ? 'on' : ''}" data-act="toggle" data-i="${i}"><span class="w-hab-box">${on ? '✓' : ''}</span><span class="w-hab-name">${esc(h)}</span>${week}${n > 1 ? `<span class="w-hab-streak">🔥${n}</span>` : ''}</button>`;
      }).join('')}</div>`;
      onButtons(el, (a, b) => act(this, el, s, ctx, { op: 'toggle', habit: Number(b.dataset.i) }));
    },
    css: `
.w-hab { display: flex; flex-direction: column; gap: 1.5cqh; height: 100%; justify-content: center; font-size: min(7cqw, calc(60cqh / (var(--n) + 1))); }
.w-hab-row { display: flex; align-items: center; gap: .5em; padding: .3em .5em; text-align: left; width: 100%; }
.w-hab-row.on { background: color-mix(in srgb, var(--accent) 22%, transparent); }
.w-hab-box { width: 1.1em; height: 1.1em; flex: none; border: 2px solid var(--muted); border-radius: .25em; display: grid; place-items: center; font-weight: 800; line-height: 1; }
.w-hab-row.on .w-hab-box { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.w-hab-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.w-hab-row.on .w-hab-name { color: var(--muted); }
.w-hab-week { display: flex; gap: .15em; }
.w-hab-week i { width: .45em; height: .45em; border-radius: 2px; background: color-mix(in srgb, var(--fg) 18%, transparent); }
.w-hab-week i.on { background: var(--accent); }
.w-hab-streak { font-size: .8em; color: var(--muted); }
`,
  };

  // ---------- move breaks ----------
  W.breaks = {
    name: 'Move breaks', icon: '🧘', desc: 'Reminds you to stand up, stretch and rest your eyes',
    def: [4, 3], min: [2, 1], tick: 1000, dataEvery: 15000, noEdit: true,
    settings: [
      { key: 'every', label: 'A break every', type: 'select', default: '45', options: minutes([20, 30, 45, 60, 90]) },
      { key: 'tips', label: 'Break ideas (one per line)', type: 'textarea', default: 'Stand up and stretch\nLook at something 20 feet away for 20 seconds\nRoll your shoulders and neck\nTake a short walk\nRefill your water' },
    ],
    data: load,
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = waiting(ctx); return; }
      const now = Date.now() + (d.offset || 0);
      const every = (Number(s.every) || 45) * 60000;
      const last = d.state && d.state.last;
      const tips = String(s.tips || '').split('\n').map((x) => x.trim()).filter(Boolean);
      const left = last ? last + every - now : null;
      const due = left != null && left <= 0;
      const tip = tips.length ? tips[Math.floor(now / every) % tips.length] : tr('Time for a break');
      const small = ctx.cls === 'xs';
      el.innerHTML = `<div class="w-brk ${due ? 'due' : ''}">
        ${last == null ? `<div class="w-brk-msg">${esc(tr('Tap Done after a break to start the timer.'))}</div>`
          : due ? `<div class="w-brk-title">${esc(tr('Break time!'))}</div>${small ? '' : `<div class="w-brk-msg">${esc(tip)}</div>`}`
            : `<div class="w-brk-sub">${esc(tr('Next break in'))}</div><div class="w-brk-time">${mmss(left / 1000)}</div>`}
        <button data-act="done">${esc(tr('Done'))}</button>
      </div>`;
      onButtons(el, () => act(this, el, s, ctx, { op: 'done' }));
    },
    css: `
.w-brk { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3cqh; height: 100%; text-align: center; }
.w-brk-time { font-size: min(22cqw, 30cqh); font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.w-brk-sub, .w-brk-msg { color: var(--muted); font-size: min(7cqw, 10cqh); }
.w-brk-title { font-size: min(13cqw, 20cqh); font-weight: 800; color: var(--accent); }
.w-brk.due .w-brk-msg { color: var(--fg); }
.w-brk button { font-size: min(7cqw, 10cqh); padding: .25em .9em; font-weight: 700; }
.w-brk.due button { background: var(--accent); color: var(--bg); }
`,
  };

  FD.WIDGET_ORDER.push('pomodoro', 'water', 'habits', 'breaks');
  for (const k of ['pomodoro', 'water', 'habits', 'breaks']) FD.BUILTIN[k] = W[k];
})();
