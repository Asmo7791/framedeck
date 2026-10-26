'use strict';
// First-run config: three example screens so the editor isn't empty.
// Users can delete or change all of it.

const crypto = require('crypto');
const id = () => crypto.randomUUID().slice(0, 8);

function gridFor(w, h, shape) {
  if (shape === 'round') { const n = Math.min(w, h) >= 400 ? 16 : Math.min(w, h) >= 200 ? 12 : 8; return { cols: n, rows: n }; }
  const cell = Math.max(20, Math.min(60, Math.min(w, h) / 12));
  return { cols: Math.max(2, Math.round(w / cell)), rows: Math.max(2, Math.round(h / cell)) };
}

const THEMES = {
  midnight: { bg: '#0e1116', fg: '#f2f4f7', muted: '#8b94a3', accent: '#ff8a3d', card: 'filled', cardBg: '#181d25', radius: 14, font: 'system', gap: 1 },
  eink6: { bg: '#ffffff', fg: '#000000', muted: '#000000', accent: '#d40000', card: 'outline', cardBg: '#ffffff', radius: 6, font: 'serif', gap: 1 },
  ring: { bg: '#000000', fg: '#ffffff', muted: '#9aa3b2', accent: '#7c5cff', card: 'none', cardBg: '#000000', radius: 0, font: 'rounded', gap: 0.5 },
};

function screen(name, w, h, shape, color, theme, pages) {
  return { id: id(), name, profile: { w, h, shape, color }, ...gridFor(w, h, shape), theme: { ...THEMES[theme] }, rotate: true, pages };
}
function page(name, duration, widgets) {
  return { id: id(), name, duration, widgets: widgets.map(([type, x, y, w, h, settings = {}]) => ({ id: id(), type, x: x * 2, y: y * 2, w: w * 2, h: h * 2, settings })) };
}

function defaultConfig() {
  return {
    version: 1,
    shareOnLan: false,
    session: { openDisplays: [] },
    screens: [
      screen('Desk monitor', 1920, 1080, 'rect', 'full', 'midnight', [
        page('Home', 60, [
          ['clock', 0, 0, 7, 4, { style: 'digital', seconds: false }],
          ['date', 0, 4, 7, 2, {}],
          ['weather', 7, 0, 9, 6, {}],
          ['calendar', 0, 6, 4, 3, {}],
          ['progress', 4, 6, 3, 3, { span: 'year' }],
          ['system', 7, 6, 4, 3, {}],
          ['countdown', 11, 6, 5, 3, { title: 'New Year', target: `${new Date().getFullYear() + 1}-01-01T00:00` }],
        ]),
        page('Tech news', 45, [
          ['hn', 0, 0, 11, 9, { count: 8 }],
          ['clock', 11, 0, 5, 3, { style: 'analog' }],
          ['note', 11, 3, 5, 6, { text: 'Click any widget in the editor to change it. Drag to move, drag the corner to resize.', align: 'left' }],
        ]),
      ]),
      screen('Round 640', 640, 640, 'round', 'full', 'ring', [
        page('Clock', 30, [['clock', 1, 2, 6, 3, { style: 'digital' }], ['date', 1, 5, 6, 1, { format: 'short' }]]),
        page('System', 20, [['system', 1, 1, 6, 6, { show: 'cpu' }]]),
        page('Analog', 30, [['clock', 1, 1, 6, 6, { style: 'analog', seconds: true }]]),
      ]),
      screen('E-ink 7.3"', 800, 480, 'rect', 'eink6', 'eink6', [
        page('Today', 600, [
          ['date', 0, 0, 6, 2, {}],
          ['calendar', 6, 0, 4, 4, {}],
          ['weather', 0, 2, 6, 4, {}],
          ['progress', 6, 4, 4, 2, { span: 'year' }],
        ]),
      ]),
    ],
  };
}

module.exports = { defaultConfig, gridFor };
