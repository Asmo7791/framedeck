// Screen profiles, themes and grid helpers shared by the editor and display pages.
(function () {
  const FD = (window.FD = window.FD || {});

  FD.PROFILES = [
    { group: 'Monitors & laptops', items: [
      { key: 'this-display', name: 'Match a connected display', dynamic: true },
      { key: 'fhd', name: 'Monitor 1920 × 1080', w: 1920, h: 1080, shape: 'rect', color: 'full' },
      { key: 'qhd', name: 'Monitor 2560 × 1440', w: 2560, h: 1440, shape: 'rect', color: 'full' },
      { key: 'portrait', name: 'Portrait monitor 1080 × 1920', w: 1080, h: 1920, shape: 'rect', color: 'full' },
      { key: 'ultrawide', name: 'Ultrawide 3440 × 1440', w: 3440, h: 1440, shape: 'rect', color: 'full' },
      { key: 'ipad', name: 'Tablet 1180 × 820', w: 1180, h: 820, shape: 'rect', color: 'full' },
    ] },
    { group: 'Small & bar screens', items: [
      { key: 'bar', name: 'Bar display 1920 × 480', w: 1920, h: 480, shape: 'rect', color: 'full' },
      { key: 'usb35', name: '3.5" USB screen 480 × 320', w: 480, h: 320, shape: 'rect', color: 'full' },
      { key: 'usb5', name: '5" USB screen 800 × 480', w: 800, h: 480, shape: 'rect', color: 'full' },
    ] },
    { group: 'Round screens (cooler LCDs)', items: [
      { key: 'round640', name: 'Round 640 × 640 (Kraken Elite size)', w: 640, h: 640, shape: 'round', color: 'full' },
      { key: 'round320', name: 'Round 320 × 320 (Kraken Z size)', w: 320, h: 320, shape: 'round', color: 'full' },
      { key: 'round240', name: 'Round 240 × 240 (Kraken size)', w: 240, h: 240, shape: 'round', color: 'full' },
    ] },
    { group: 'E-ink', items: [
      { key: 'eink73', name: 'E-ink 7.3" 800 × 480, 6-color', w: 800, h: 480, shape: 'rect', color: 'eink6' },
      { key: 'eink75', name: 'E-ink 7.5" 800 × 480, black & white', w: 800, h: 480, shape: 'rect', color: 'mono' },
      { key: 'eink133', name: 'E-ink 13.3" 1600 × 1200, 6-color', w: 1600, h: 1200, shape: 'rect', color: 'eink6' },
    ] },
    { group: 'Other', items: [{ key: 'custom', name: 'Custom size…', custom: true }] },
  ];

  // Spectra 6 style e-ink palette, and a black & white one.
  FD.PALETTES = {
    eink6: ['#000000', '#ffffff', '#d40000', '#f5c400', '#1f4fd1', '#1a8a2e'],
    mono: ['#000000', '#ffffff'],
  };

  FD.THEMES = {
    midnight: { name: 'Midnight', bg: '#0e1116', fg: '#f2f4f7', muted: '#8b94a3', accent: '#ff8a3d', card: 'filled', cardBg: '#181d25', radius: 14, font: 'system', gap: 1 },
    paper: { name: 'Paper', bg: '#f4f1ea', fg: '#1d1b18', muted: '#77706a', accent: '#c2410c', card: 'filled', cardBg: '#fffdf8', radius: 12, font: 'serif', gap: 1 },
    ring: { name: 'Black glass', bg: '#000000', fg: '#ffffff', muted: '#9aa3b2', accent: '#7c5cff', card: 'none', cardBg: '#000000', radius: 0, font: 'rounded', gap: 0.5 },
    terminal: { name: 'Terminal', bg: '#06110a', fg: '#b6f5c8', muted: '#4f8a63', accent: '#3dff7f', card: 'outline', cardBg: '#06110a', radius: 4, font: 'mono', gap: 1 },
    sunset: { name: 'Sunset', bg: '#1b0f24', fg: '#fff1e6', muted: '#c49bb0', accent: '#ff5d73', card: 'filled', cardBg: '#2a1636', radius: 18, font: 'rounded', gap: 1 },
    eink6: { name: 'E-ink color', bg: '#ffffff', fg: '#000000', muted: '#000000', accent: '#d40000', card: 'outline', cardBg: '#ffffff', radius: 6, font: 'serif', gap: 1 },
    aurora: { name: 'Aurora', supporter: true, bg: '#07121f', fg: '#e8fbff', muted: '#7fa3b8', accent: '#3ef0c4', card: 'filled', cardBg: '#0c1d30', radius: 18, font: 'rounded', gap: 1 },
    neon: { name: 'Neon', supporter: true, bg: '#0a0014', fg: '#fdf0ff', muted: '#a07bbd', accent: '#ff2bd6', card: 'outline', cardBg: '#0a0014', radius: 10, font: 'condensed', gap: 1 },
    sakura: { name: 'Sakura', supporter: true, bg: '#fff5f7', fg: '#3b1d2a', muted: '#a07686', accent: '#e8558a', card: 'filled', cardBg: '#ffffff', radius: 20, font: 'rounded', gap: 1 },
    amber: { name: 'Retro amber', supporter: true, bg: '#120b02', fg: '#ffb33b', muted: '#9a6a22', accent: '#ffd27a', card: 'outline', cardBg: '#120b02', radius: 2, font: 'mono', gap: 1 },
    ocean: { name: 'Ocean', supporter: true, bg: '#0b2236', fg: '#eaf4ff', muted: '#8fb1cc', accent: '#ffb84d', card: 'filled', cardBg: '#112d47', radius: 16, font: 'system', gap: 1 },
    forest: { name: 'Forest', supporter: true, bg: '#0f1a12', fg: '#eef5e9', muted: '#8ea38b', accent: '#c6e36b', card: 'filled', cardBg: '#16251a', radius: 14, font: 'serif', gap: 1 },
    mono: { name: 'E-ink mono', bg: '#ffffff', fg: '#000000', muted: '#000000', accent: '#000000', card: 'outline', cardBg: '#ffffff', radius: 6, font: 'serif', gap: 1 },
  };

  FD.FONTS = {
    system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", -apple-system, "PingFang SC", sans-serif',
    serif: '"New York", ui-serif, Georgia, "Songti SC", "Times New Roman", serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    condensed: '"Avenir Next Condensed", "Arial Narrow", "DIN Condensed", -apple-system, sans-serif',
  };

  FD.gridFor = function (w, h, shape) {
    if (shape === 'round') { const n = Math.min(w, h) >= 400 ? 16 : Math.min(w, h) >= 200 ? 12 : 8; return { cols: n, rows: n }; }
    const cell = Math.max(20, Math.min(60, Math.min(w, h) / 12));
    return { cols: Math.max(2, Math.round(w / cell)), rows: Math.max(2, Math.round(h / cell)) };
  };

  FD.uid = () => Math.random().toString(36).slice(2, 10);

  // Keep a widget inside the grid after a resize or regrid.
  FD.clampWidget = function (wd, cols, rows, min) {
    const mw = Math.min(cols, (min && min[0]) || 1);
    const mh = Math.min(rows, (min && min[1]) || 1);
    wd.w = Math.max(mw, Math.min(cols, Math.round(wd.w)));
    wd.h = Math.max(mh, Math.min(rows, Math.round(wd.h)));
    wd.x = Math.max(0, Math.min(cols - wd.w, Math.round(wd.x)));
    wd.y = Math.max(0, Math.min(rows - wd.h, Math.round(wd.y)));
    return wd;
  };

  // Scale every widget when a screen's grid changes, so the layout keeps its proportions.
  FD.regridScreen = function (scr, cols, rows) {
    const fx = cols / scr.cols, fy = rows / scr.rows;
    for (const p of scr.pages) {
      for (const wd of p.widgets) {
        const def = FD.WIDGETS && FD.WIDGETS[wd.type];
        const x2 = Math.round((wd.x + wd.w) * fx), y2 = Math.round((wd.y + wd.h) * fy);
        wd.x = Math.round(wd.x * fx); wd.y = Math.round(wd.y * fy);
        wd.w = Math.max(1, x2 - wd.x); wd.h = Math.max(1, y2 - wd.y);
        FD.clampWidget(wd, cols, rows, def && def.min);
      }
    }
    scr.cols = cols; scr.rows = rows;
  };

  // Snap any color to the nearest one the panel can actually show.
  FD.nearestPaletteColor = function (hex, palette) {
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const c = rgb(hex.length === 4 ? '#' + [...hex.slice(1)].map((x) => x + x).join('') : hex);
    let best = palette[0], bd = Infinity;
    for (const p of palette) {
      const q = rgb(p);
      const d = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };

  // Theme after applying the panel's color limits.
  FD.effectiveTheme = function (scr) {
    const t = { ...FD.THEMES.midnight, ...scr.theme };
    const pal = FD.PALETTES[scr.profile.color];
    if (pal) for (const k of ['bg', 'fg', 'muted', 'accent', 'cardBg']) t[k] = FD.nearestPaletteColor(t[k], pal);
    return t;
  };
})();
