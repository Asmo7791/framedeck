'use strict';
// State for interactive widgets (water, habits, pomodoro, move breaks): a little data per widget,
// shared by every screen that shows it, so a glass logged on the kitchen tablet shows everywhere.
// Phones and tablets may change it, so each widget type only accepts its own few actions,
// each checked here. Days follow this computer's clock.
const fs = require('fs');
const path = require('path');

const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const int = (v, lo, hi) => { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < lo || n > hi) throw Object.assign(new Error('Bad value'), { status: 400 }); return n; };
const bad = () => Object.assign(new Error('Unknown action'), { status: 400 });
const PHASES = ['focus', 'short', 'long'];

const REDUCERS = {
  water(st, a) {
    const day = today();
    if (st.day !== day) st = { day, count: 0, last: null };
    if (a.op === 'add') { st.count = Math.min(99, st.count + 1); st.last = Date.now(); }
    else if (a.op === 'remove') st.count = Math.max(0, st.count - 1);
    else throw bad();
    return st;
  },
  habits(st, a) {
    if (a.op !== 'toggle') throw bad();
    const i = int(a.habit, 0, 49);
    const day = today();
    const done = { ...(st.done || {}) };
    const set = new Set(done[day] || []);
    if (set.has(i)) set.delete(i); else set.add(i);
    done[day] = [...set].sort((x, y) => x - y);
    // Keep about four months, enough for streaks.
    const cutoff = today(new Date(Date.now() - 120 * 86400000));
    for (const d of Object.keys(done)) if (d < cutoff) delete done[d];
    return { done };
  },
  pomodoro(st, a) {
    const now = Date.now();
    st = { phase: 'focus', round: 1, running: false, endsAt: null, remaining: null, ...st };
    if (a.op === 'start') {
      if (!st.running) { st.endsAt = now + (st.remaining ?? int(a.seconds, 1, 14400)) * 1000; st.remaining = null; st.running = true; }
    } else if (a.op === 'pause') {
      if (st.running) { st.remaining = Math.max(0, Math.round((st.endsAt - now) / 1000)); st.endsAt = null; st.running = false; }
    } else if (a.op === 'reset') {
      st = { phase: 'focus', round: 1, running: false, endsAt: null, remaining: null };
    } else if (a.op === 'next') {
      // Several screens may notice the end at once; only the first move counts.
      if (a.expect != null && a.expect !== st.endsAt) return st;
      if (!PHASES.includes(a.phase)) throw bad();
      const seconds = int(a.seconds, 1, 14400);
      st = { phase: a.phase, round: int(a.round, 1, 99), running: !!a.run, endsAt: a.run ? now + seconds * 1000 : null, remaining: a.run ? null : seconds };
    } else throw bad();
    return st;
  },
  breaks(st, a) {
    if (a.op !== 'done') throw bad();
    return { last: Date.now() };
  },
};

function stateStore(dataDir) {
  const file = path.join(dataDir, 'widget-state.json');
  let all = {};
  try { all = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch { /* none yet */ }
  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(all), { mode: 0o600 });
      fs.renameSync(tmp, file);
    }, 300);
  };
  return {
    types: new Set(Object.keys(REDUCERS)),
    get: (id) => all[id] || {},
    apply(id, type, action) {
      const reducer = REDUCERS[type];
      if (!reducer) throw bad();
      all[id] = reducer({ ...(all[id] || {}) }, action || {});
      save();
      return all[id];
    },
    // Forget widgets that are no longer in any layout.
    prune(ids) { for (const id of Object.keys(all)) if (!ids.has(id)) delete all[id]; save(); },
  };
}

module.exports = { stateStore, today };
