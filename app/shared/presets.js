// Page presets. Positions are fractions of the page (0–1), so a preset fits any
// screen: they're turned into grid blocks for the screen you add them to.
(function () {
  const FD = window.FD;

  // [type, x, y, w, h, settings, style]
  const P = (id, name, icon, desc, widgets) => ({ id, name, icon, desc, builtin: true,
    widgets: widgets.map(([type, fx, fy, fw, fh, settings = {}, style]) => ({ type, fx, fy, fw, fh, settings, ...(style ? { style } : {}) })) });

  FD.PRESETS = [
    P('clockdate', 'Clock & date', '🕒', 'A big clock with the date under it', [
      ['clock', 0.08, 0.12, 0.84, 0.52, { style: 'digital' }], ['date', 0.08, 0.64, 0.84, 0.24, { format: 'short' }]]),
    P('today', 'Today', '☀️', 'Date, weather, calendar and what\'s coming up', [
      ['date', 0, 0, 0.5, 0.28], ['calendar', 0.5, 0, 0.25, 0.55], ['progress', 0.75, 0, 0.25, 0.28, { span: 'year' }],
      ['sunmoon', 0.75, 0.28, 0.25, 0.27], ['weather', 0, 0.28, 0.5, 0.72], ['agenda', 0.5, 0.55, 0.5, 0.45]]),
    P('weather', 'Weather focus', '⛅', 'Forecast, air quality, sun and moon', [
      ['weather', 0, 0, 0.66, 1], ['air', 0.66, 0, 0.34, 0.5], ['sunmoon', 0.66, 0.5, 0.34, 0.5]]),
    P('news', 'News desk', '🗞️', 'World headlines and Hacker News, tap to read', [
      ['rss', 0, 0, 0.6, 1], ['clock', 0.6, 0, 0.4, 0.3, { style: 'digital' }], ['hn', 0.6, 0.3, 0.4, 0.7, { count: '5' }]]),
    P('markets', 'Markets', '🪙', 'Crypto prices, world clocks and business news', [
      ['crypto', 0, 0, 0.55, 1, { coins: 'bitcoin, ethereum, solana, dogecoin' }], ['worldclock', 0.55, 0, 0.45, 0.4],
      ['rss', 0.55, 0.4, 0.45, 0.6, { feed: 'bbc-business', title: 'Business', count: '4' }]]),
    P('sports', 'Game day', '🏀', 'Scores from two leagues and the time', [
      ['scores', 0, 0, 0.5, 1, { league: 'nba' }], ['scores', 0.5, 0, 0.5, 0.68, { league: 'epl' }], ['clock', 0.5, 0.68, 0.5, 0.32, { style: 'digital' }]]),
    P('music', 'Now playing', '🎵', 'What Spotify or Music is playing', [
      ['nowplaying', 0, 0, 1, 0.72], ['clock', 0, 0.72, 0.5, 0.28, { style: 'digital' }], ['date', 0.5, 0.72, 0.5, 0.28, { format: 'short' }]]),
    P('system', 'System monitor', '📈', 'CPU, memory and the time', [
      ['system', 0, 0, 0.6, 1], ['clock', 0.6, 0, 0.4, 0.55, { style: 'analog', seconds: true }], ['progress', 0.6, 0.55, 0.4, 0.45, { span: 'day' }]]),
    P('photo', 'Photo frame', '🖼️', 'A picture with a small clock on top', [
      ['image', 0, 0, 1, 1, {}, { card: 'none' }], ['clock', 0.66, 0.74, 0.32, 0.22, { style: 'digital' }]]),
    P('focus', 'Focus', '🎯', 'A countdown with rotating reminders', [
      ['countdown', 0, 0, 1, 0.55], ['rotator', 0, 0.55, 1, 0.45]]),
    P('world', 'World clocks', '🌍', 'Times around the world and today\'s date', [
      ['worldclock', 0, 0, 1, 0.7], ['date', 0, 0.7, 1, 0.3, { format: 'short' }]]),
  ];

  // All presets the user can pick from: built-ins (unless replaced) plus their own.
  FD.allPresets = function (cfg) {
    const mine = cfg.pagePresets || [];
    const replaced = new Set(mine.map((p) => p.replaces).filter(Boolean));
    return [...FD.PRESETS.filter((p) => !replaced.has(p.id)), ...mine];
  };

  // Lay a preset out on a screen's grid. Round screens use the square inside the circle.
  FD.presetToWidgets = function (preset, scr) {
    const round = scr.profile.shape === 'round';
    const map = (v) => (round ? 0.16 + v * 0.68 : v);
    return preset.widgets.filter((w) => FD.WIDGETS[w.type]).map((w) => {
      const def = FD.WIDGETS[w.type];
      const x = Math.round(map(w.fx) * scr.cols), y = Math.round(map(w.fy) * scr.rows);
      const x2 = Math.round(map(w.fx + w.fw) * scr.cols), y2 = Math.round(map(w.fy + w.fh) * scr.rows);
      const wd = { id: FD.uid(), type: w.type, x, y, w: Math.max(1, x2 - x), h: Math.max(1, y2 - y),
        settings: { ...FD.widgetDefaults(w.type), ...(w.settings || {}) } };
      if (w.style) wd.style = { ...w.style };
      return FD.clampWidget(wd, scr.cols, scr.rows, def.min);
    });
  };

  // The reverse: describe a page in fractions so it can be saved as a preset.
  FD.pageToPresetWidgets = function (page, scr) {
    const round = scr.profile.shape === 'round';
    const unmap = (v) => (round ? Math.max(0, Math.min(1, (v - 0.16) / 0.68)) : v);
    const r = (v) => Math.round(v * 10000) / 10000;
    return page.widgets.map((wd) => {
      const fx = unmap(wd.x / scr.cols), fy = unmap(wd.y / scr.rows);
      const fx2 = unmap((wd.x + wd.w) / scr.cols), fy2 = unmap((wd.y + wd.h) / scr.rows);
      const o = { type: wd.type, fx: r(fx), fy: r(fy), fw: r(Math.max(0.01, fx2 - fx)), fh: r(Math.max(0.01, fy2 - fy)), settings: JSON.parse(JSON.stringify(wd.settings || {})) };
      if (wd.style) o.style = { ...wd.style };
      return o;
    });
  };
})();
