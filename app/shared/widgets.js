// Widget library. Every widget picks its layout from the space it is given,
// so the same widget works on a 240px round LCD and a 4K monitor.
//
// A widget definition:
//   name, icon, desc         shown in the editor palette
//   def: [w, h]              default size in grid cells
//   min: [w, h]              smallest useful size in grid cells
//   settings: [...]          editor form (key, label, type, default, options)
//   tick                     ms between re-renders (clocks, countdowns)
//   data(settings, ctx)      optional async loader, refreshed every `dataEvery` ms
//   render(el, settings, ctx)
(function () {
  const FD = (window.FD = window.FD || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  FD.esc = esc;

  const LOCALES = [
    { value: 'en-US', label: 'English' },
    { value: 'zh-CN', label: '中文 (简体)' },
    { value: 'zh-TW', label: '中文 (繁體)' },
    { value: 'ja-JP', label: '日本語' },
    { value: 'es-ES', label: 'Español' },
  ];
  const TIMEZONES = ['local', 'America/Chicago', 'America/New_York', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Hong_Kong',
    'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Australia/Sydney', 'UTC'];
  const tzOpt = (tz) => (tz && tz !== 'local' ? { timeZone: tz } : {});

  // Shrink text until it fits its box (used for free text and headlines).
  FD.fitText = function (el, { max = 400, min = 8 } = {}) {
    const box = el.parentElement || el;
    let lo = min, hi = max;
    el.style.fontSize = hi + 'px';
    if (el.scrollHeight <= box.clientHeight && el.scrollWidth <= box.clientWidth) return;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      el.style.fontSize = mid + 'px';
      if (el.scrollHeight <= box.clientHeight && el.scrollWidth <= box.clientWidth) lo = mid; else hi = mid;
    }
    el.style.fontSize = lo + 'px';
  };

  // ---------- small SVG helpers ----------
  function ring(pct, label, sub, color) {
    const r = 42, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
    return `<svg class="fd-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="${r}" class="fd-ring-track"/>
      <circle cx="50" cy="50" r="${r}" class="fd-ring-val" style="stroke:${color || 'var(--accent)'}"
        stroke-dasharray="${(c * p) / 100} ${c}" transform="rotate(-90 50 50)"/>
      <text x="50" y="${sub ? 50 : 56}" class="fd-ring-label">${esc(label)}</text>
      ${sub ? `<text x="50" y="68" class="fd-ring-sub">${esc(sub)}</text>` : ''}
    </svg>`;
  }

  // Weather icons drawn with the theme colors so they work on e-ink too.
  const ICON = {
    sun: '<circle cx="32" cy="32" r="11" class="fill-accent"/><g class="stroke-accent">' +
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="32" y1="9" x2="32" y2="15" transform="rotate(${a} 32 32)"/>`).join('') + '</g>',
    moon: '<path d="M40 12a20 20 0 1 0 12 30A16 16 0 0 1 40 12z" class="fill-fg"/>',
    cloud: '<path d="M20 48h26a11 11 0 0 0 0-22 15 15 0 0 0-28 4 9 9 0 0 0 2 18z" class="fill-fg"/>',
    partly: '<circle cx="24" cy="24" r="9" class="fill-accent"/><g class="stroke-accent">' +
      [0, 60, 120, 180, 240, 300].map((a) => `<line x1="24" y1="7" x2="24" y2="11" transform="rotate(${a} 24 24)"/>`).join('') +
      '</g><path d="M24 52h24a10 10 0 0 0 0-20 14 14 0 0 0-26 4 8 8 0 0 0 2 16z" class="fill-fg"/>',
    rain: '<path d="M18 40h28a10 10 0 0 0 0-20 14 14 0 0 0-26 4 8 8 0 0 0-2 16z" class="fill-fg"/><g class="stroke-accent">' +
      '<line x1="24" y1="46" x2="21" y2="55"/><line x1="33" y1="46" x2="30" y2="55"/><line x1="42" y1="46" x2="39" y2="55"/></g>',
    snow: '<path d="M18 40h28a10 10 0 0 0 0-20 14 14 0 0 0-26 4 8 8 0 0 0-2 16z" class="fill-fg"/><g class="fill-accent">' +
      '<circle cx="23" cy="50" r="2.6"/><circle cx="32" cy="55" r="2.6"/><circle cx="41" cy="50" r="2.6"/></g>',
    storm: '<path d="M18 38h28a10 10 0 0 0 0-20 14 14 0 0 0-26 4 8 8 0 0 0-2 16z" class="fill-fg"/><path d="M34 40l-8 12h6l-3 10 10-14h-6l3-8z" class="fill-accent"/>',
    fog: '<g class="stroke-fg"><line x1="12" y1="24" x2="52" y2="24"/><line x1="8" y1="33" x2="48" y2="33"/><line x1="14" y1="42" x2="54" y2="42"/></g>',
  };
  const WMO = {
    0: ['Clear', 'sun'], 1: ['Mostly clear', 'sun'], 2: ['Partly cloudy', 'partly'], 3: ['Overcast', 'cloud'],
    45: ['Fog', 'fog'], 48: ['Freezing fog', 'fog'], 51: ['Light drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Heavy drizzle', 'rain'],
    56: ['Freezing drizzle', 'rain'], 57: ['Freezing drizzle', 'rain'], 61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
    66: ['Freezing rain', 'rain'], 67: ['Freezing rain', 'rain'], 71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'],
    77: ['Snow grains', 'snow'], 80: ['Showers', 'rain'], 81: ['Showers', 'rain'], 82: ['Heavy showers', 'rain'],
    85: ['Snow showers', 'snow'], 86: ['Snow showers', 'snow'], 95: ['Thunderstorm', 'storm'], 96: ['Thunderstorm', 'storm'], 99: ['Thunderstorm', 'storm'],
  };
  function wxIcon(code, isDay = 1) {
    let k = (WMO[code] || ['', 'cloud'])[1];
    if (!isDay && k === 'sun') k = 'moon';
    return `<svg class="fd-wx-icon" viewBox="0 0 64 64" aria-hidden="true">${ICON[k]}</svg>`;
  }
  const wxLabel = (code) => (WMO[code] || ['—'])[0];

  // ---------- widgets ----------
  const W = {};

  W.clock = {
    name: 'Clock', icon: '🕒', desc: 'Digital or analog time, any time zone',
    def: [4, 2], min: [1, 1], tick: 1000,
    settings: [
      { key: 'style', label: 'Style', type: 'select', default: 'digital', options: [['digital', 'Digital'], ['analog', 'Analog']] },
      { key: 'hour24', label: '24-hour time', type: 'toggle', default: false },
      { key: 'seconds', label: 'Show seconds', type: 'toggle', default: false },
      { key: 'tz', label: 'Time zone', type: 'select', default: 'local', options: TIMEZONES.map((t) => [t, t === 'local' ? 'This computer' : t.replace('_', ' ')]) },
      { key: 'label', label: 'Label (optional)', type: 'text', default: '' },
    ],
    render(el, s, ctx) {
      const now = new Date();
      if (s.style === 'analog') {
        const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, ...tzOpt(s.tz) }).formatToParts(now);
        const get = (t) => Number((parts.find((p) => p.type === t) || {}).value || 0);
        const hh = get('hour') % 12, mm = get('minute'), ss = get('second');
        const ticks = Array.from({ length: 12 }, (_, i) =>
          `<line x1="50" y1="${i % 3 ? 8 : 6}" x2="50" y2="${i % 3 ? 12 : 15}" transform="rotate(${i * 30} 50 50)" class="${i % 3 ? 'tick' : 'tick major'}"/>`).join('');
        el.innerHTML = `<div class="w-clock-analog">
          <svg viewBox="0 0 100 100" aria-label="${esc(now.toLocaleTimeString())}">
            <circle cx="50" cy="50" r="47" class="face"/>${ticks}
            <line x1="50" y1="50" x2="50" y2="27" class="hand h" transform="rotate(${hh * 30 + mm / 2} 50 50)"/>
            <line x1="50" y1="50" x2="50" y2="15" class="hand m" transform="rotate(${mm * 6 + ss / 10} 50 50)"/>
            ${s.seconds ? `<line x1="50" y1="56" x2="50" y2="12" class="hand s" transform="rotate(${ss * 6} 50 50)"/>` : ''}
            <circle cx="50" cy="50" r="2.4" class="pin"/>
          </svg>${s.label ? `<div class="w-clock-label">${esc(s.label)}</div>` : ''}</div>`;
        return;
      }
      const f = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', second: s.seconds ? '2-digit' : undefined, hour12: !s.hour24, ...tzOpt(s.tz),
      }).formatToParts(now);
      const pick = (t) => (f.find((p) => p.type === t) || {}).value || '';
      let hour = pick('hour');
      if (s.hour24 && hour.length < 2) hour = '0' + hour;
      const ampm = s.hour24 ? '' : pick('dayPeriod');
      const showLabel = s.label && ctx.cls !== 'xs';
      el.innerHTML = `<div class="w-clock ${ctx.shape}">
        <div class="w-clock-time"><span>${hour}<b class="colon">:</b>${pick('minute')}</span>${s.seconds ? `<small class="sec">${pick('second')}</small>` : ''}${ampm ? `<small class="ampm">${ampm}</small>` : ''}</div>
        ${showLabel ? `<div class="w-clock-label">${esc(s.label)}</div>` : ''}</div>`;
    },
  };

  W.date = {
    name: 'Date', icon: '📅', desc: 'Weekday and date, in your language',
    def: [4, 2], min: [1, 1], tick: 30000,
    settings: [
      { key: 'format', label: 'Format', type: 'select', default: 'full', options: [['full', 'Weekday + date'], ['short', 'Short'], ['numeric', 'Numbers']] },
      { key: 'locale', label: 'Language', type: 'select', default: 'en-US', options: LOCALES.map((l) => [l.value, l.label]) },
    ],
    render(el, s, ctx) {
      const now = new Date();
      const loc = s.locale || 'en-US';
      const weekday = now.toLocaleDateString(loc, { weekday: 'long' });
      let main;
      if (s.format === 'numeric') main = now.toLocaleDateString(loc, { year: 'numeric', month: '2-digit', day: '2-digit' });
      else if (s.format === 'short') main = now.toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' });
      else main = now.toLocaleDateString(loc, { month: 'long', day: 'numeric' });
      const showWeekday = s.format === 'full' || s.format === 'numeric';
      const showYear = s.format === 'full' && ctx.rows > 1.4;
      el.innerHTML = `<div class="w-date ${ctx.aspect}">
        ${showWeekday ? `<div class="w-date-weekday">${esc(weekday)}</div>` : ''}
        <div class="w-date-main">${esc(main)}</div>
        ${showYear ? `<div class="w-date-year">${now.getFullYear()}</div>` : ''}</div>`;
    },
  };

  W.calendar = {
    name: 'Month calendar', icon: '🗓️', desc: 'This month with today marked',
    def: [3, 3], min: [1, 1], tick: 60000,
    settings: [
      { key: 'weekStart', label: 'Week starts on', type: 'select', default: '0', options: [['0', 'Sunday'], ['1', 'Monday']] },
      { key: 'locale', label: 'Language', type: 'select', default: 'en-US', options: LOCALES.map((l) => [l.value, l.label]) },
    ],
    render(el, s, ctx) {
      const now = new Date();
      const loc = s.locale || 'en-US';
      if (ctx.cls === 'xs') {
        el.innerHTML = `<div class="w-cal-mini"><div class="m">${esc(now.toLocaleDateString(loc, { month: 'short' }))}</div><div class="d">${now.getDate()}</div></div>`;
        return;
      }
      const ws = Number(s.weekStart || 0);
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const lead = (first.getDay() - ws + 7) % 7;
      const names = Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 7 + ((i + ws) % 7)).toLocaleDateString(loc, { weekday: 'narrow' }));
      let cells = '';
      for (let i = 0; i < lead; i++) cells += '<span></span>';
      for (let d = 1; d <= days; d++) {
        const dow = (lead + d - 1) % 7;
        const cls = [d === now.getDate() ? 'today' : '', d < now.getDate() ? 'past' : '', (dow + ws) % 7 === 0 || (dow + ws) % 7 === 6 ? 'we' : ''].join(' ');
        cells += `<span class="${cls}">${d}</span>`;
      }
      const weeks = Math.ceil((lead + days) / 7);
      el.innerHTML = `<div class="w-cal" style="--weeks:${weeks}">
        <div class="w-cal-head">${esc(now.toLocaleDateString(loc, { month: 'long', year: 'numeric' }))}</div>
        <div class="w-cal-grid names">${names.map((n) => `<span>${esc(n)}</span>`).join('')}</div>
        <div class="w-cal-grid days">${cells}</div></div>`;
    },
  };

  W.weather = {
    name: 'Weather', icon: '⛅', desc: 'Now and the week ahead, no API key needed',
    def: [5, 4], min: [1, 1], tick: 0, dataEvery: 10 * 60000,
    settings: [
      { key: 'place', label: 'City', type: 'place', default: null },
      { key: 'units', label: 'Units', type: 'select', default: 'f', options: [['f', '°F, mph'], ['c', '°C, km/h']] },
      { key: 'days', label: 'Days of forecast', type: 'select', default: 'auto', options: [['auto', 'Fit to size'], ['0', 'None'], ['3', '3'], ['5', '5'], ['7', '7']] },
    ],
    async data(s, ctx) {
      if (!s.place) return null;
      return ctx.fetchJSON(`/api/weather?lat=${s.place.lat}&lon=${s.place.lon}&units=${s.units || 'f'}`);
    },
    render(el, s, ctx) {
      if (!s.place) {
        el.innerHTML = `<div class="fd-empty"><b>Weather</b><span>Choose a city in the settings panel.</span></div>`;
        return;
      }
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Weather unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      const c = d.current;
      const t = Math.round(c.temperature_2m);
      const u = (s.units || 'f') === 'c' ? 'C' : 'F';
      const hi = Math.round(d.daily.temperature_2m_max[0]), lo = Math.round(d.daily.temperature_2m_min[0]);
      const city = s.place.name || s.place.label;
      if (ctx.cls === 'xs' || (ctx.rows < 1.6 && ctx.cols < 2.5)) {
        el.innerHTML = `<div class="w-wx-xs">${wxIcon(c.weather_code, c.is_day)}<div class="t">${t}°</div></div>`;
        return;
      }
      // How many forecast days fit: each day needs roughly a square of ~70px.
      let days = s.days === 'auto' || !s.days ? 0 : Number(s.days);
      const tall = ctx.h >= ctx.w * 0.62 || ctx.h > 300;
      if (s.days === 'auto' || !s.days) days = tall ? Math.max(0, Math.min(7, Math.floor(ctx.w / Math.max(70, ctx.h * 0.2)))) : 0;
      const dayLoc = s.locale || 'en-US';
      const fc = days ? `<div class="w-wx-days" style="--n:${days}">${d.daily.time.slice(0, days).map((iso, i) => {
        const dt = new Date(iso + 'T12:00');
        return `<div class="day"><div class="dn">${i === 0 ? 'Today' : esc(dt.toLocaleDateString(dayLoc, { weekday: 'short' }))}</div>
          ${wxIcon(d.daily.weather_code[i], 1)}
          <div class="hl"><b>${Math.round(d.daily.temperature_2m_max[i])}°</b><span>${Math.round(d.daily.temperature_2m_min[i])}°</span></div>
          ${d.daily.precipitation_probability_max[i] >= 20 ? `<div class="pp">${d.daily.precipitation_probability_max[i]}%</div>` : '<div class="pp"></div>'}</div>`;
      }).join('')}</div>` : '';
      const details = ctx.cls !== 's'
        ? `<div class="w-wx-details"><span>Feels ${Math.round(c.apparent_temperature)}°</span><span>Wind ${Math.round(c.wind_speed_10m)} ${u === 'C' ? 'km/h' : 'mph'}</span><span>Humidity ${c.relative_humidity_2m}%</span></div>` : '';
      el.innerHTML = `<div class="w-wx ${days ? 'has-days' : ''} ${ctx.aspect}">
        <div class="w-wx-now">
          ${wxIcon(c.weather_code, c.is_day)}
          <div class="w-wx-main">
            <div class="w-wx-temp">${t}°<small>${u}</small></div>
            <div class="w-wx-cond">${esc(wxLabel(c.weather_code))}</div>
            <div class="w-wx-hl">H ${hi}° · L ${lo}°</div>
            <div class="w-wx-city">${esc(city)}</div>
            ${details}
          </div>
        </div>${fc}</div>`;
    },
  };

  W.system = {
    name: 'This computer', icon: '📈', desc: 'CPU, memory and uptime',
    def: [4, 3], min: [1, 1], tick: 0, dataEvery: 3000,
    settings: [{ key: 'show', label: 'Show', type: 'select', default: 'all', options: [['all', 'CPU + memory'], ['cpu', 'CPU only'], ['memory', 'Memory only']] }],
    data: (s, ctx) => ctx.fetchJSON('/api/system'),
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = '<div class="fd-loading"></div>'; return; }
      const memPct = (100 * d.memUsed) / d.memTotal;
      const gb = (b) => (b / 1073741824).toFixed(b > 10 * 1073741824 ? 0 : 1);
      const up = d.uptime > 86400 ? `${Math.floor(d.uptime / 86400)}d ${Math.floor((d.uptime % 86400) / 3600)}h` : `${Math.floor(d.uptime / 3600)}h ${Math.floor((d.uptime % 3600) / 60)}m`;
      const rings = [];
      if (s.show !== 'memory') rings.push(ring(d.cpu, d.cpu + '%', 'CPU'));
      if (s.show !== 'cpu') rings.push(ring(memPct, Math.round(memPct) + '%', `${gb(d.memUsed)}/${gb(d.memTotal)} GB`, 'var(--fg)'));
      el.innerHTML = `<div class="w-sys ${ctx.aspect}">
        <div class="w-sys-rings n${rings.length}">${rings.join('')}</div>
        ${ctx.cls === 'xs' ? '' : `<div class="w-sys-foot"><span>${esc(d.host)}</span><span>up ${up}</span></div>`}</div>`;
    },
  };

  W.countdown = {
    name: 'Countdown', icon: '⏳', desc: 'Days until a date',
    def: [4, 2], min: [1, 1], tick: 1000,
    settings: [
      { key: 'title', label: 'Title', type: 'text', default: 'Big day' },
      { key: 'target', label: 'Date and time', type: 'datetime', default: '' },
      { key: 'detail', label: 'Show hours and minutes', type: 'toggle', default: true },
    ],
    render(el, s, ctx) {
      const target = s.target ? new Date(s.target) : null;
      if (!target || isNaN(target)) { el.innerHTML = '<div class="fd-empty"><b>Countdown</b><span>Pick a date in the settings panel.</span></div>'; return; }
      let ms = target - Date.now();
      const past = ms < 0; ms = Math.abs(ms);
      const days = Math.floor(ms / 86400000);
      const hms = [Math.floor(ms / 3600000) % 24, Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60].map((n) => String(n).padStart(2, '0'));
      const small = ctx.cls === 'xs';
      el.innerHTML = `<div class="w-cd ${ctx.aspect}">
        ${small ? '' : `<div class="w-cd-title">${esc(s.title || '')}</div>`}
        <div class="w-cd-num">${days}<small>${days === 1 ? 'day' : 'days'}${past ? ' ago' : ''}</small></div>
        ${s.detail && !small && ctx.rows >= 1.5 ? `<div class="w-cd-hms">${hms.join(':')}</div>` : ''}</div>`;
    },
  };

  W.note = {
    name: 'Text', icon: '📝', desc: 'Any text: a note, quote or heading',
    def: [4, 2], min: [1, 1], tick: 0,
    settings: [
      { key: 'text', label: 'Text', type: 'textarea', default: 'Double-click to edit me' },
      { key: 'align', label: 'Alignment', type: 'select', default: 'center', options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] },
      { key: 'weight', label: 'Weight', type: 'select', default: '500', options: [['400', 'Regular'], ['500', 'Medium'], ['700', 'Bold']] },
      { key: 'color', label: 'Color', type: 'select', default: 'fg', options: [['fg', 'Text'], ['accent', 'Accent'], ['muted', 'Muted']] },
    ],
    render(el, s) {
      const align = ['left', 'right'].includes(s.align) ? s.align : 'center'; // never raw CSS from a layout file
      el.innerHTML = `<div class="w-note" style="text-align:${align};justify-content:${s.align === 'left' ? 'flex-start' : s.align === 'right' ? 'flex-end' : 'center'}">
        <div class="w-note-text" style="font-weight:${esc(s.weight)};color:var(--${esc(s.color || 'fg')})">${esc(s.text).replace(/\n/g, '<br>')}</div></div>`;
      const t = el.querySelector('.w-note-text');
      requestAnimationFrame(() => FD.fitText(t, { max: 260 }));
    },
  };

  const VIDEO_RE = /\.(mp4|m4v|mov|webm)(\?|#|$)/i;
  FD.MAX_VIDEO_SECONDS = 60;
  W.image = {
    name: 'Image & video', icon: '🖼️', desc: 'A photo, GIF or short looping video',
    def: [4, 4], min: [1, 1], tick: 0,
    settings: [
      { key: 'src', label: 'Picture or video', type: 'media', default: '' },
      { key: 'fit', label: 'Fit', type: 'select', default: 'cover', options: [['cover', 'Fill the box'], ['contain', 'Show all of it']] },
      { key: 'caption', label: 'Caption', type: 'text', default: '' },
    ],
    render(el, s, ctx) {
      if (!s.src) { el.innerHTML = '<div class="fd-empty"><b>Image & video</b><span>Choose a picture, GIF or short video in the settings panel.</span></div>'; return; }
      const filter = ctx.color === 'mono' ? 'grayscale(1) contrast(1.4)' : ctx.color === 'eink6' ? 'saturate(1.6) contrast(1.15)' : 'none';
      const style = `object-fit:${s.fit === 'contain' ? 'contain' : 'cover'};filter:${filter}`;
      const isVideo = VIDEO_RE.test(s.src);
      // E-ink panels can't play video, so they get a still frame.
      const still = ctx.color !== 'full';
      const media = isVideo
        ? `<video src="${esc(s.src)}" style="${style}" muted loop playsinline ${still ? 'preload="auto"' : 'autoplay'}></video>`
        : `<img src="${esc(s.src)}" alt="${esc(s.caption)}" style="${style}">`;
      const existing = el.querySelector('.w-img');
      // Don't restart a playing video just because the box was resized.
      if (existing && existing.dataset.src === s.src) {
        const cap = existing.querySelector('figcaption');
        if (cap) cap.hidden = ctx.cls === 'xs';
        return;
      }
      el.innerHTML = `<figure class="w-img" data-src="${esc(s.src)}">${media}${s.caption ? `<figcaption ${ctx.cls === 'xs' ? 'hidden' : ''}>${esc(s.caption)}</figcaption>` : ''}</figure>`;
      const v = el.querySelector('video');
      if (v) {
        v.addEventListener('loadedmetadata', () => { if (v.duration > FD.MAX_VIDEO_SECONDS + 1) v.addEventListener('timeupdate', () => { if (v.currentTime > FD.MAX_VIDEO_SECONDS) v.currentTime = 0; }); });
        if (still) v.addEventListener('loadeddata', () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); }, { once: true });
        else v.play().catch(() => {});
      }
    },
  };

  W.progress = {
    name: 'Progress', icon: '📊', desc: 'How far through the year, month, week or day',
    def: [3, 2], min: [1, 1], tick: 60000,
    settings: [{ key: 'span', label: 'Track', type: 'select', default: 'year', options: [['year', 'Year'], ['month', 'Month'], ['week', 'Week'], ['day', 'Day']] }],
    render(el, s, ctx) {
      const n = new Date();
      let a, b, label;
      if (s.span === 'day') { a = new Date(n.getFullYear(), n.getMonth(), n.getDate()); b = new Date(a.getTime() + 86400000); label = 'Today'; }
      else if (s.span === 'week') { a = new Date(n.getFullYear(), n.getMonth(), n.getDate() - n.getDay()); b = new Date(a.getTime() + 7 * 86400000); label = 'This week'; }
      else if (s.span === 'month') { a = new Date(n.getFullYear(), n.getMonth(), 1); b = new Date(n.getFullYear(), n.getMonth() + 1, 1); label = n.toLocaleDateString('en-US', { month: 'long' }); }
      else { a = new Date(n.getFullYear(), 0, 1); b = new Date(n.getFullYear() + 1, 0, 1); label = String(n.getFullYear()); }
      const pct = (100 * (n - a)) / (b - a);
      if (ctx.aspect === 'wide' && ctx.cols >= 2.5) {
        el.innerHTML = `<div class="w-prog bar"><div class="w-prog-top"><span>${esc(label)}</span><b>${pct.toFixed(pct < 10 ? 1 : 0)}%</b></div>
          <div class="w-prog-track"><div style="width:${pct}%"></div></div></div>`;
      } else el.innerHTML = `<div class="w-prog">${ring(pct, Math.round(pct) + '%', ctx.cls === 'xs' ? '' : label)}</div>`;
    },
  };

  W.hn = {
    name: 'Hacker News', icon: '📰', desc: 'Top stories right now',
    def: [6, 5], min: [2, 2], tick: 0, dataEvery: 10 * 60000,
    settings: [{ key: 'count', label: 'Stories', type: 'select', default: '6', options: ['3', '4', '5', '6', '8', '10', '12'].map((n) => [n, n]) }],
    data: (s, ctx) => ctx.fetchJSON('/api/hn'),
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Hacker News unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      // Never squeeze in more rows than can be read.
      const fit = Math.max(1, Math.floor(ctx.h / 46));
      const n = Math.min(Number(s.count || 6), fit, d.items.length);
      el.innerHTML = `<div class="w-hn" style="--n:${n}"><div class="w-hn-head">Hacker News</div><ol>${d.items.slice(0, n).map((i) =>
        `<li><span class="t">${esc(i.title)}</span><span class="m">${i.score} pts · ${esc(i.host)}</span></li>`).join('')}</ol></div>`;
    },
  };

  W.web = {
    name: 'Web page', icon: '🌐', desc: 'Embed a page (some sites block this)',
    def: [6, 4], min: [2, 2], tick: 0,
    settings: [
      { key: 'url', label: 'Address', type: 'text', default: 'https://example.com' },
      { key: 'zoom', label: 'Zoom', type: 'select', default: '100', options: ['50', '67', '75', '90', '100', '125', '150'].map((z) => [z, z + '%']) },
      { key: 'reload', label: 'Reload every', type: 'select', default: '0', options: [['0', 'Never'], ['5', '5 minutes'], ['15', '15 minutes'], ['60', 'Hour']] },
    ],
    render(el, s, ctx) {
      if (!/^https?:\/\//i.test(s.url || '')) { el.innerHTML = '<div class="fd-empty"><b>Web page</b><span>Enter an address starting with https://</span></div>'; return; }
      const z = Number(s.zoom || 100) / 100;
      el.innerHTML = `<div class="w-web"><iframe src="${esc(s.url)}" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer"
        style="width:${100 / z}%;height:${100 / z}%;transform:scale(${z});${ctx.editor ? 'pointer-events:none' : ''}"></iframe></div>`;
      clearInterval(el._reload);
      if (Number(s.reload) > 0) el._reload = ctx.every(Number(s.reload) * 60000, () => { const f = el.querySelector('iframe'); if (f) f.src = f.src; });
    },
  };

  for (const k of Object.keys(W)) W[k].css = (FD.WIDGET_CSS || {})[k] || '';
  FD.WIDGETS = W;
  FD.WIDGET_ORDER = ['clock', 'date', 'calendar', 'weather', 'countdown', 'progress', 'system', 'note', 'image', 'hn', 'web'];
  FD.widgetDefaults = (type) => Object.fromEntries(((FD.WIDGETS[type] || {}).settings || []).map((f) => [f.key, f.default]));
  // Helpers shared with widgets-extra.js and with code written in the Widget Studio.
  FD.h = { esc, ring, wxIcon, wxLabel, tzOpt, LOCALES, TIMEZONES, fitText: FD.fitText };
})();
