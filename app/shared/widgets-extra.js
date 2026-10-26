// More built-in widgets. Same format as widgets.js (and as the Widget Studio).
(function () {
  const FD = window.FD;
  const W = FD.WIDGETS;
  const { esc, tzOpt, TIMEZONES, LOCALES } = FD.h;

  // Tiny line chart for prices and trends.
  function spark(values, color) {
    if (!values || values.length < 2) return '';
    const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / span) * 28 - 1}`).join(' ');
    return `<svg class="fd-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${pts}" style="stroke:${color || 'var(--accent)'}"/></svg>`;
  }
  function moonPhase(date = new Date()) {
    const syn = 29.530588853;
    const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
    return ((days % syn) + syn) % syn / syn; // 0 new, 0.5 full
  }
  function moonSvg(p) {
    const r = 40, cx = 50, cy = 50, k = Math.cos(2 * Math.PI * p), rx = Math.abs(k) * r;
    const outer = p < 0.5 ? 1 : 0;
    const inner = p < 0.5 ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
    return `<svg class="w-moon-svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" class="moon-dark"/>
      <path d="M${cx},${cy - r} A${r},${r} 0 0 ${outer} ${cx},${cy + r} A${rx},${r} 0 0 ${inner} ${cx},${cy - r}Z" class="moon-lit"/></svg>`;
  }
  const moonName = (p) => ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'][Math.round(p * 8) % 8];
  Object.assign(FD.h, { spark, moonPhase, moonSvg, moonName });

  const fmtMoney = (v, cur) => {
    if (v == null) return '—';
    const digits = v >= 1000 ? 0 : v >= 1 ? 2 : 4;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: digits, minimumFractionDigits: Math.min(digits, 2) }).format(v); }
    catch { return v.toFixed(digits); }
  };
  const ago = (iso) => {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  };


  // Headline list shared by the news widgets: sizes text so the requested number
  // of stories really fits, pages through the rest, and opens a reader card on tap.
  function newsList(el, items, o) {
    const ctx = o.ctx;
    const st = (el._news = el._news || { page: 0, reader: -1 });
    st.items = items;
    // Each row is 2.4 text-heights tall (headline + source line), the header 1.5.
    let per = Math.max(1, Number(o.per || 6));
    let f = Math.min(ctx.h / (1.5 + 2.4 * per), ctx.w / 16, 44);
    const minF = ctx.editor ? 9 : 11;
    if (f < minF) { f = minF; per = Math.max(1, Math.floor((ctx.h / f - 1.5) / 2.4)); }
    const pages = Math.max(1, Math.ceil(items.length / per));
    st.page = Math.min(st.page, pages - 1);
    const open = (url) => { if (url) window.open(url, '_blank', 'noopener'); };

    function list() {
      st.reader = -1;
      const start = st.page * per;
      el.innerHTML = `<div class="fd-news" style="--f:${f}px">
        <div class="head"><span class="ttl">${esc(o.title)}</span>${pages > 1 ? `<span class="pg"><button data-p="-1" aria-label="Previous">‹</button>${st.page + 1}/${pages}<button data-p="1" aria-label="Next">›</button></span>` : ''}</div>
        <ol>${items.slice(start, start + per).map((it, i) => `<li data-i="${start + i}"><span class="n">${start + i + 1}</span><span class="t">${esc(it.title)}</span><span class="m">${esc(it.meta || '')}</span></li>`).join('')}</ol></div>`;
    }
    function reader(i) {
      const it = items[i]; if (!it) return list();
      st.reader = i;
      el.innerHTML = `<div class="fd-reader" style="--f:${Math.max(f, Math.min(ctx.h / 14, ctx.w / 22, 30))}px">
        <div class="head"><button data-back>‹ Back</button><span>${esc(it.meta || '')}</span></div>
        <div class="rt">${esc(it.title)}</div>
        ${it.desc ? `<p>${esc(it.desc)}</p>` : '<p class="none">No summary in the feed. Open the article to read it.</p>'}
        <div class="acts">${it.link ? `<button data-open="${esc(it.link)}" class="pri">Open article ↗</button>` : ''}${it.discuss && it.discuss !== it.link ? `<button data-open="${esc(it.discuss)}">Comments ↗</button>` : ''}</div></div>`;
      clearTimeout(st.back);
      st.back = setTimeout(() => { if (st.reader === i) list(); }, 60000);
    }
    el.onclick = (e) => {
      if (ctx.editor) return;
      const b = e.target.closest('button, li[data-i]');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.p) { st.page = (st.page + Number(b.dataset.p) + pages) % pages; list(); }
      else if (b.dataset.back !== undefined) list();
      else if (b.dataset.open) open(b.dataset.open);
      else if (b.dataset.i) reader(Number(b.dataset.i));
    };
    if (st.reader >= 0 && items[st.reader]) reader(st.reader); else list();
    clearInterval(el._cycle);
    if (pages > 1 && Number(o.every) > 0) {
      el._cycle = ctx.every(Number(o.every) * 1000, () => { if (st.reader < 0) { st.page = (st.page + 1) % pages; list(); } });
    }
  }
  FD.h.newsList = newsList;
  const NEWS_CSS = `
.fd-news { display: flex; flex-direction: column; font-size: var(--f); min-height: 0; }
.fd-news .head { height: 1.5em; flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: .5em; }
.fd-news .ttl { color: var(--accent); font-weight: 750; text-transform: uppercase; letter-spacing: .1em; font-size: .78em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fd-news .pg { color: var(--muted); font-size: .72em; display: flex; align-items: center; gap: .3em; flex: none; }
.fd-news .pg button, .fd-reader button { font: inherit; color: inherit; background: color-mix(in srgb, var(--fg) 8%, transparent); border: 0; border-radius: .4em; padding: .05em .55em; cursor: pointer; }
.fd-news ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: .2em; }
.fd-news li { height: 2.2em; display: grid; grid-template-columns: 1.7em 1fr; grid-template-rows: 1.2em 1em; column-gap: .35em; cursor: pointer; border-radius: .3em; }
.fd-news li:hover .t { color: var(--accent); }
.fd-news .n { grid-row: span 2; color: var(--muted); font-weight: 700; text-align: right; line-height: 1.2em; }
.fd-news .t { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2em; }
.fd-news .m { color: var(--muted); font-size: .72em; line-height: 1.35em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fd-reader { display: flex; flex-direction: column; gap: .5em; font-size: var(--f); min-height: 0; }
.fd-reader .head { display: flex; align-items: center; gap: .7em; color: var(--muted); font-size: .75em; flex: none; white-space: nowrap; overflow: hidden; }
.fd-reader .rt { font-weight: 750; font-size: 1.25em; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex: none; }
.fd-reader p { margin: 0; line-height: 1.4; color: var(--fg); opacity: .85; overflow: hidden; flex: 1; min-height: 0; mask-image: linear-gradient(#000 75%, transparent); }
.fd-reader p.none { color: var(--muted); mask-image: none; }
.fd-reader .acts { display: flex; gap: .5em; flex: none; }
.fd-reader .acts button { padding: .35em .9em; font-weight: 650; }
.fd-reader .acts .pri { background: var(--accent); color: var(--bg); }
`;

  W.worldclock = {
    name: 'World clocks', icon: '🌍', desc: 'Several cities at a glance',
    def: [6, 2], min: [2, 1], tick: 15000,
    settings: [
      { key: 'zones', label: 'Cities (Name = time zone, one per line)', type: 'textarea', default: 'New York = America/New_York\nLondon = Europe/London\nShanghai = Asia/Shanghai\nTokyo = Asia/Tokyo' },
      { key: 'hour24', label: '24-hour time', type: 'toggle', default: false },
    ],
    render(el, s, ctx) {
      const now = new Date();
      const lines = String(s.zones || '').split('\n').map((l) => l.split('=').map((x) => x.trim())).filter((x) => x[0]);
      const cells = lines.slice(0, 12).map(([name, tz]) => {
        let time = '—', day = '';
        try {
          time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: !s.hour24, timeZone: tz || undefined });
          const d = (z) => now.toLocaleDateString('en-CA', { timeZone: z });
          const diff = (new Date(d(tz)) - new Date(d(undefined))) / 86400000;
          day = diff > 0 ? '+1 day' : diff < 0 ? '−1 day' : '';
        } catch { time = 'bad zone'; }
        return `<div class="wc"><div class="n">${esc(name)}</div><div class="t">${esc(time)}</div><div class="d">${day || '&nbsp;'}</div></div>`;
      });
      el.innerHTML = `<div class="w-wc ${ctx.aspect}" style="--n:${cells.length}">${cells.join('')}</div>`;
    },
    css: `
.w-wc { display: grid; gap: 3cqmin; grid-template-columns: repeat(var(--n), 1fr); align-items: center; }
.w-wc.tall { grid-template-columns: 1fr; grid-template-rows: repeat(var(--n), 1fr); }
.w-wc.square { grid-template-columns: 1fr 1fr; }
.w-wc .wc { text-align: center; min-width: 0; }
.w-wc .n { color: var(--muted); font-weight: 600; font-size: min(calc(11cqw / var(--n)), 14cqh); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: .06em; }
.w-wc .t { font-weight: 700; font-size: min(calc(20cqw / var(--n)), 34cqh); white-space: nowrap; letter-spacing: -.02em; }
.w-wc .d { color: var(--accent); font-size: min(calc(12cqw / var(--n)), 10cqh); }
.w-wc.tall .n, .w-wc.tall .d { font-size: min(9cqw, calc(30cqh / var(--n))); }
.w-wc.tall .t { font-size: min(18cqw, calc(55cqh / var(--n))); }
.w-wc.square .n, .w-wc.square .d { font-size: min(5.5cqw, 7cqh); } .w-wc.square .t { font-size: min(10cqw, 15cqh); }
`,
  };

  W.crypto = {
    name: 'Crypto prices', icon: '🪙', desc: 'Prices and 24h change from CoinGecko',
    def: [5, 4], min: [2, 1], dataEvery: 3 * 60000,
    settings: [
      { key: 'coins', label: 'Coins (CoinGecko ids, comma separated)', type: 'text', default: 'bitcoin, ethereum, solana' },
      { key: 'vs', label: 'Currency', type: 'select', default: 'usd', options: [['usd', 'USD'], ['eur', 'EUR'], ['gbp', 'GBP'], ['cny', 'CNY'], ['jpy', 'JPY'], ['twd', 'TWD']] },
    ],
    data: (s, ctx) => ctx.fetchJSON(`/api/crypto?ids=${encodeURIComponent(String(s.coins || '').replace(/\s/g, ''))}&vs=${s.vs || 'usd'}`),
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Prices unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      if (!d.coins.length) { el.innerHTML = '<div class="fd-empty"><b>No coins found</b><span>Use CoinGecko ids like bitcoin, ethereum.</span></div>'; return; }
      const fit = Math.max(1, Math.floor(ctx.h / 40));
      const coins = d.coins.slice(0, fit);
      const showSpark = ctx.w > 260;
      el.innerHTML = `<div class="w-cr" style="--n:${coins.length}">${coins.map((c) => {
        const up = (c.change || 0) >= 0;
        return `<div class="row"><b class="sym">${esc(c.symbol)}</b>${showSpark ? spark(c.spark, up ? 'var(--fg)' : 'var(--accent)') : '<span></span>'}
          <span class="px">${fmtMoney(c.price, d.vs)}</span><span class="ch ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(c.change || 0).toFixed(1)}%</span></div>`;
      }).join('')}</div>`;
    },
    css: `
.w-cr { display: flex; flex-direction: column; justify-content: space-around; font-size: min(7cqw, calc(42cqh / var(--n))); }
.w-cr .row { display: grid; grid-template-columns: 3.4em 1fr auto 4.4em; align-items: center; gap: .6em; }
.w-cr .sym { font-weight: 750; }
.w-cr .px { font-weight: 650; text-align: right; }
.w-cr .ch { text-align: right; font-size: .8em; font-weight: 600; }
.w-cr .ch.down { color: var(--accent); } .w-cr .ch.up { color: var(--muted); }
.fd-spark { width: 100%; height: 1.4em; overflow: visible; }
.fd-spark polyline { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
`,
  };

  // Ready-made feeds for the News feed widget. "custom" uses the address the user types.
  const FEEDS = [
    ['bbc-world', 'BBC News · World', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
    ['npr', 'NPR News', 'https://feeds.npr.org/1001/rss.xml'],
    ['guardian-world', 'The Guardian · World', 'https://www.theguardian.com/world/rss'],
    ['nyt', 'The New York Times', 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'],
    ['aljazeera', 'Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'],
    ['cnbc', 'CNBC · Top news', 'https://www.cnbc.com/id/100003114/device/rss/rss.html'],
    ['economist', 'The Economist · The world this week', 'https://www.economist.com/the-world-this-week/rss.xml'],
    ['bbc-business', 'BBC News · Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
    ['bbc-tech', 'BBC News · Technology', 'https://feeds.bbci.co.uk/news/technology/rss.xml'],
    ['verge', 'The Verge', 'https://www.theverge.com/rss/index.xml'],
    ['ars', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'],
    ['techcrunch', 'TechCrunch', 'https://techcrunch.com/feed/'],
    ['engadget', 'Engadget', 'https://www.engadget.com/rss.xml'],
    ['wired', 'Wired', 'https://www.wired.com/feed/rss'],
    ['nasa', 'NASA', 'https://www.nasa.gov/news-release/feed/'],
    ['sciencedaily', 'ScienceDaily', 'https://www.sciencedaily.com/rss/top/science.xml'],
    ['espn', 'ESPN', 'https://www.espn.com/espn/rss/news'],
    ['bbc-zh-hans', 'BBC 中文 (简体)', 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml'],
    ['bbc-zh-hant', 'BBC 中文 (繁體)', 'https://feeds.bbci.co.uk/zhongwen/trad/rss.xml'],
  ];
  // Widgets made before presets existed only have a url, so treat those as custom.
  const feedKey = (s) => s.feed || (s.url ? 'custom' : 'bbc-world');
  const feedAddress = (s) => {
    const k = feedKey(s);
    if (k === 'custom') return s.url || '';
    return (FEEDS.find((f) => f[0] === k) || FEEDS[0])[2];
  };

  W.rss = {
    name: 'News feed', icon: '🗞️', desc: 'Headlines from any RSS or Atom feed; tap one to read',
    def: [6, 5], min: [2, 2], dataEvery: 10 * 60000,
    settings: [
      { key: 'feed', label: 'Feed', type: 'select', default: '', options: FEEDS.map(([k, name]) => [k, name]).concat([['custom', 'Custom link…']]) },
      { key: 'url', label: 'Feed address (RSS or Atom link)', type: 'text', default: '', showIf: { key: 'feed', is: 'custom' } },
      { key: 'title', label: 'Title (blank uses the feed name)', type: 'text', default: '' },
      { key: 'count', label: 'Headlines per page', type: 'select', default: '6', options: ['3', '4', '5', '6', '8', '10', '12', '15'].map((n) => [n, n]) },
      { key: 'every', label: 'Turn the page every', type: 'select', default: '30', options: [['0', 'Never'], ['15', '15 seconds'], ['30', '30 seconds'], ['60', '1 minute'], ['300', '5 minutes']] },
    ],
    async data(s, ctx) {
      const url = feedAddress(s);
      return url ? ctx.fetchJSON('/api/rss?url=' + encodeURIComponent(url)) : null;
    },
    render(el, s, ctx) {
      if (!feedAddress(s)) { el.innerHTML = '<div class="fd-empty"><b>News feed</b><span>Paste a feed link (RSS or Atom) in settings.</span></div>'; return; }
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Feed unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      const host = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return ''; } };
      newsList(el, d.items.map((i) => ({ title: i.title, link: i.link, desc: i.desc, meta: [i.date ? ago(i.date) + ' ago' : '', host(i.link)].filter(Boolean).join(' · ') })),
        { title: s.title || d.title || 'News', per: s.count, every: s.every, ctx });
    },
    css: NEWS_CSS,
  };

  W.hn = {
    name: 'Hacker News', icon: '📰', desc: 'Top stories right now; tap one to read',
    def: [6, 5], min: [2, 2], dataEvery: 10 * 60000,
    settings: [
      { key: 'count', label: 'Stories per page', type: 'select', default: '6', options: ['3', '4', '5', '6', '8', '10', '12', '15'].map((n) => [n, n]) },
      { key: 'every', label: 'Turn the page every', type: 'select', default: '30', options: [['0', 'Never'], ['15', '15 seconds'], ['30', '30 seconds'], ['60', '1 minute'], ['300', '5 minutes']] },
    ],
    data: (s, ctx) => ctx.fetchJSON('/api/hn'),
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Hacker News unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      newsList(el, d.items.map((i) => ({ title: i.title, link: i.url, discuss: i.discuss, desc: i.text, meta: `${i.score} pts · ${i.comments} comments · ${i.host}` })),
        { title: 'Hacker News', per: s.count, every: s.every, ctx });
    },
    css: NEWS_CSS,
  };

  W.agenda = {
    name: 'Calendar events', icon: '📆', desc: 'Upcoming events from a calendar link (iCal)',
    def: [5, 6], min: [2, 2], dataEvery: 10 * 60000, tick: 60000,
    settings: [
      { key: 'url', label: 'Calendar link (.ics or webcal://)', type: 'text', default: '' },
      { key: 'days', label: 'Look ahead', type: 'select', default: '7', options: [['1', 'Today'], ['3', '3 days'], ['7', '1 week'], ['14', '2 weeks'], ['30', '1 month']] },
      { key: 'hour24', label: '24-hour time', type: 'toggle', default: false },
      { key: 'locale', label: 'Language', type: 'select', default: 'en-US', options: LOCALES.map((l) => [l.value, l.label]) },
    ],
    async data(s, ctx) {
      if (!s.url) return null;
      return ctx.fetchJSON(`/api/ics?days=${s.days || 7}&url=${encodeURIComponent(s.url)}`);
    },
    render(el, s, ctx) {
      if (!s.url) { el.innerHTML = '<div class="fd-empty"><b>Calendar events</b><span>Paste a calendar\'s iCal link in settings. In Google Calendar: Settings → your calendar → "Secret address in iCal format".</span></div>'; return; }
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Calendar unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      const loc = s.locale || 'en-US';
      const now = new Date();
      const evs = d.events.filter((e) => new Date(e.end) > now || e.allDay);
      if (!evs.length) { el.innerHTML = '<div class="fd-empty"><b>Nothing coming up</b><span>Enjoy the free time.</span></div>'; return; }
      const dayKey = (dt) => dt.toDateString();
      const today = dayKey(now), tom = dayKey(new Date(now.getTime() + 86400000));
      const rows = Math.max(2, Math.floor(ctx.h / 34));
      let html = '', used = 0, lastDay = '';
      for (const e of evs) {
        const st = new Date(e.start);
        const k = dayKey(st);
        if (k !== lastDay) {
          if (used + 2 > rows) break;
          const label = k === today ? 'Today' : k === tom ? 'Tomorrow' : st.toLocaleDateString(loc, { weekday: 'long', month: 'short', day: 'numeric' });
          html += `<div class="day">${esc(label)}</div>`; used++; lastDay = k;
        }
        if (used >= rows) break;
        const time = e.allDay ? 'All day' : st.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit', hour12: !s.hour24 });
        const live = !e.allDay && st <= now && new Date(e.end) > now;
        html += `<div class="ev ${live ? 'live' : ''}"><span class="tm">${esc(time)}</span><span class="ti">${esc(e.title)}</span></div>`; used++;
      }
      el.innerHTML = `<div class="w-ag" style="--rows:${rows}">${html}</div>`;
    },
    css: `
.w-ag { display: flex; flex-direction: column; gap: .15em; font-size: min(6cqw, calc(70cqh / var(--rows))); overflow: hidden; }
.w-ag .day { color: var(--accent); font-weight: 750; font-size: .78em; text-transform: uppercase; letter-spacing: .08em; margin-top: .5em; }
.w-ag .day:first-child { margin-top: 0; }
.w-ag .ev { display: grid; grid-template-columns: 4.6em 1fr; gap: .5em; align-items: baseline; }
.w-ag .tm { color: var(--muted); font-size: .82em; white-space: nowrap; }
.w-ag .ti { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-ag .ev.live .ti::before { content: '● '; color: var(--accent); }
`,
  };

  W.scores = {
    name: 'Sports scores', icon: '🏀', desc: 'Live and recent games (NBA, NFL, MLB, soccer, esports…)',
    def: [5, 5], min: [2, 1], dataEvery: 60000,
    settings: [
      { key: 'league', label: 'League', type: 'select', default: 'nba', options: [['nba', 'NBA'], ['wnba', 'WNBA'], ['nfl', 'NFL'], ['mlb', 'MLB'], ['nhl', 'NHL'], ['ncaaf', 'College football'], ['ncaamb', 'College basketball'],
        ['epl', 'Premier League'], ['laliga', 'La Liga'], ['seriea', 'Serie A'], ['bundesliga', 'Bundesliga'], ['ligue1', 'Ligue 1'], ['mls', 'MLS'], ['ucl', 'Champions League'],
        ['dota2', 'Esports · Dota 2'], ['lol', 'Esports · League of Legends'], ['cs2', 'Esports · Counter-Strike 2'], ['valorant', 'Esports · Valorant'],
        ['overwatch', 'Esports · Overwatch'], ['r6', 'Esports · Rainbow Six Siege'], ['rocketleague', 'Esports · Rocket League']] },
      { key: 'token', label: 'Your own PandaScore token (optional; free at pandascore.co)', type: 'text', default: '', showIf: { key: 'league', in: ['lol', 'cs2', 'valorant', 'overwatch', 'r6', 'rocketleague'] } },
      { key: 'team', label: 'Only this team (abbreviation or name, optional)', type: 'text', default: '' },
      { key: 'logos', label: 'Show team logos', type: 'toggle', default: true },
    ],
    data: (s, ctx) => ctx.fetchJSON('/api/scores?league=' + (s.league || 'nba') + (s.token ? '&token=' + encodeURIComponent(s.token) : '')),
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Scores unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      const team = String(s.team || '').trim().toUpperCase();
      const isTeam = (t) => t.abbr.toUpperCase() === team || (team.length > 2 && t.name.toUpperCase().includes(team));
      let games = d.games.filter((g) => !team || isTeam(g.home) || isTeam(g.away));
      games.sort((a, b) => ({ in: 0, pre: 1, post: 2 }[a.state] - { in: 0, pre: 1, post: 2 }[b.state]) || a.date.localeCompare(b.date));
      if (!games.length) { el.innerHTML = `<div class="fd-empty"><b>${esc(d.league)}</b><span>No games${team ? ' for ' + esc(team) : ''} ${d.esports ? 'right now' : 'today'}.</span></div>`; return; }
      const fit = Math.max(1, Math.floor((ctx.h - 20) / 46));
      games = games.slice(0, fit);
      const logo = (t) => (s.logos && t.logo && ctx.color === 'full' ? `<img src="${esc(t.logo)}" alt="">` : '');
      const tm = (t, g, right) => `<span class="tm ${right ? 'r' : ''} ${g.state === 'post' && t.winner ? 'win' : ''}">${logo(t)}<b>${esc(t.abbr)}</b></span>`;
      const sc = (t, g) => `<span class="sc">${g.state === 'pre' ? '' : esc(t.score)}</span>`;
      el.innerHTML = `<div class="w-sc" style="--n:${games.length}"><div class="head">${esc(d.league)}</div>${games.map((g) => `
        <div class="g ${g.state}">${tm(g.away, g)}${sc(g.away, g)}<span class="at">${g.state === 'pre' ? '@' : '–'}</span>${sc(g.home, g)}${tm(g.home, g, true)}
          <span class="st">${g.state === 'in' ? '● ' : ''}${esc(g.detail)}</span></div>`).join('')}</div>`;
    },
    css: `
.w-sc { display: flex; flex-direction: column; gap: .3em; font-size: min(6.4cqw, calc(64cqh / (var(--n) + .8))); }
.w-sc .head { color: var(--accent); font-weight: 750; font-size: .72em; letter-spacing: .1em; }
.w-sc .g { display: grid; grid-template-columns: 1fr auto auto auto 1fr; grid-template-rows: auto auto; align-items: center; column-gap: .4em; flex: 1; }
.w-sc .tm { display: flex; align-items: center; gap: .3em; font-weight: 700; min-width: 0; }
.w-sc .tm b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.w-sc .tm.r { justify-content: flex-start; flex-direction: row-reverse; }
.w-sc .tm img { height: 1.2em; width: 1.2em; object-fit: contain; }
.w-sc .sc { font-weight: 800; font-size: 1.1em; min-width: 1.3em; text-align: center; }
.w-sc .at { color: var(--muted); }
.w-sc .tm:not(.win) { opacity: .92; } .w-sc .post .tm:not(.win) { opacity: .55; }
.w-sc .st { grid-column: 1 / -1; text-align: center; color: var(--muted); font-size: .66em; }
.w-sc .in .st { color: var(--accent); font-weight: 650; }
`,
  };

  W.air = {
    name: 'Air quality', icon: '🌫️', desc: 'US AQI and PM2.5 from Open-Meteo',
    def: [3, 3], min: [1, 1], dataEvery: 20 * 60000,
    settings: [{ key: 'place', label: 'City', type: 'place', default: null }],
    async data(s, ctx) { return s.place ? ctx.fetchJSON(`/api/air?lat=${s.place.lat}&lon=${s.place.lon}`) : null; },
    render(el, s, ctx) {
      if (!s.place) { el.innerHTML = '<div class="fd-empty"><b>Air quality</b><span>Choose a city in the settings panel.</span></div>'; return; }
      const d = ctx.data;
      if (!d) { el.innerHTML = ctx.error ? `<div class="fd-empty"><b>Unavailable</b><span>${esc(ctx.error)}</span></div>` : '<div class="fd-loading"></div>'; return; }
      const aqi = Math.round(d.current.us_aqi);
      const cat = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for some' : aqi <= 200 ? 'Unhealthy' : aqi <= 300 ? 'Very unhealthy' : 'Hazardous';
      el.innerHTML = `<div class="w-air ${aqi > 100 ? 'bad' : ''}"><div class="lbl">Air quality</div><div class="v">${aqi}</div><div class="c">${cat}</div>
        ${ctx.cls === 'xs' ? '' : `<div class="pm">PM2.5 ${Math.round(d.current.pm2_5)} µg/m³ · ${esc(s.place.name || '')}</div>`}</div>`;
    },
    css: `
.w-air { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: .1em; }
.w-air .lbl { color: var(--muted); font-size: min(8cqw, 10cqh); text-transform: uppercase; letter-spacing: .1em; font-weight: 650; }
.w-air .v { font-size: min(40cqw, 42cqh); font-weight: 800; line-height: 1; }
.w-air .c { font-size: min(9cqw, 11cqh); font-weight: 650; }
.w-air.bad .c, .w-air.bad .v { color: var(--accent); }
.w-air .pm { color: var(--muted); font-size: min(6cqw, 8cqh); }
`,
  };

  W.sunmoon = {
    name: 'Sun & moon', icon: '🌙', desc: 'Moon phase, plus sunrise and sunset for a city',
    def: [4, 3], min: [1, 1], tick: 10 * 60000, dataEvery: 60 * 60000,
    settings: [
      { key: 'place', label: 'City (for sunrise and sunset)', type: 'place', default: null },
      { key: 'hour24', label: '24-hour time', type: 'toggle', default: false },
    ],
    async data(s, ctx) { return s.place ? ctx.fetchJSON(`/api/weather?lat=${s.place.lat}&lon=${s.place.lon}&units=f`) : null; },
    render(el, s, ctx) {
      const p = moonPhase();
      const illum = Math.round((1 - Math.cos(2 * Math.PI * p)) * 50);
      const t = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: !s.hour24 });
      const sun = ctx.data && ctx.data.daily ? `<div class="sun"><span>↑ ${t(ctx.data.daily.sunrise[0])}</span><span>↓ ${t(ctx.data.daily.sunset[0])}</span></div>` : '';
      el.innerHTML = `<div class="w-sm ${ctx.aspect}">${moonSvg(p)}${ctx.cls === 'xs' ? '' : `<div class="txt"><b>${moonName(p)}</b><span>${illum}% lit</span>${sun}</div>`}</div>`;
    },
    css: `
.w-sm { display: flex; align-items: center; justify-content: center; gap: 5cqw; }
.w-sm.tall, .w-sm.square { flex-direction: column; gap: 3cqh; }
.w-moon-svg { height: min(100cqh, 46cqw); width: auto; flex: none; }
.w-sm.square .w-moon-svg, .w-sm.tall .w-moon-svg { height: min(55cqh, 80cqw); }
.moon-dark { fill: color-mix(in srgb, var(--muted) 22%, transparent); }
.fd-stage[data-color="eink6"] .moon-dark, .fd-stage[data-color="mono"] .moon-dark { fill: none; stroke: var(--fg); stroke-width: 1.5; }
.moon-lit { fill: var(--fg); }
.w-sm .txt { display: flex; flex-direction: column; gap: .2em; font-size: min(7cqw, 11cqh); }
.w-sm.square .txt, .w-sm.tall .txt { align-items: center; text-align: center; font-size: min(8cqw, 8cqh); }
.w-sm .txt span { color: var(--muted); }
.w-sm .sun { display: flex; gap: .8em; color: var(--fg) !important; font-weight: 600; }
.w-sm .sun span { color: var(--fg); }
`,
  };

  W.nowplaying = {
    name: 'Now playing', icon: '🎵', desc: 'Spotify or Apple Music (Mac only)',
    def: [6, 3], min: [2, 1], dataEvery: 3000,
    settings: [{ key: 'art', label: 'Show album art', type: 'toggle', default: true }],
    data: (s, ctx) => ctx.fetchJSON('/api/nowplaying'),
    render(el, s, ctx) {
      const d = ctx.data;
      if (!d) { el.innerHTML = '<div class="fd-loading"></div>'; return; }
      if (d.unsupported) { el.innerHTML = '<div class="fd-empty"><b>Now playing</b><span>Works with Spotify or Music on a Mac. Not available on this system yet.</span></div>'; return; }
      if (d.error) { el.innerHTML = `<div class="fd-empty"><b>Permission needed</b><span>${esc(d.error)}</span></div>`; return; }
      if (!d.title) { el.innerHTML = '<div class="w-np idle"><span class="note">♪</span><span>Nothing playing</span></div>'; return; }
      const pct = d.duration ? Math.min(100, (100 * d.position) / d.duration) : 0;
      const art = s.art && d.art && ctx.cls !== 'xs' ? `<img class="art" src="${esc(d.art)}" alt="">` : s.art && ctx.cls !== 'xs' ? '<div class="art ph">♪</div>' : '';
      el.innerHTML = `<div class="w-np ${ctx.aspect}">${art}<div class="info">
        <div class="ti">${esc(d.title)}</div><div class="ar">${esc(d.artist)}</div>
        ${ctx.rows > 1.2 ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="src">${d.playing ? '▶' : '❚❚'} ${esc(d.app)}</div>` : ''}</div></div>`;
    },
    css: `
.w-np { display: flex; align-items: center; gap: 5cqw; }
.w-np.tall, .w-np.square { flex-direction: column; justify-content: center; text-align: center; gap: 3cqh; }
.w-np .art { height: min(100cqh, 42cqw); aspect-ratio: 1; border-radius: calc(var(--radius) * .6); object-fit: cover; flex: none; }
.w-np.square .art, .w-np.tall .art { height: min(56cqh, 80cqw); }
.w-np .art.ph { display: grid; place-items: center; background: color-mix(in srgb, var(--fg) 10%, transparent); font-size: min(20cqh, 14cqw); color: var(--muted); }
.w-np .info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: .2em; font-size: min(6.5cqw, 13cqh); width: 100%; }
.w-np .ti { font-weight: 750; font-size: 1.25em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-np .ar { color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-np .bar { height: .3em; border-radius: 9px; background: color-mix(in srgb, var(--muted) 30%, transparent); overflow: hidden; margin-top: .4em; }
.w-np .bar i { display: block; height: 100%; background: var(--accent); }
.w-np .src { color: var(--muted); font-size: .7em; }
.w-np.idle { justify-content: center; color: var(--muted); gap: .5em; font-size: min(8cqw, 18cqh); }
`,
  };

  W.rotator = {
    name: 'Rotating text', icon: '💬', desc: 'Cycles through quotes, reminders or facts',
    def: [6, 2], min: [1, 1], tick: 0,
    settings: [
      { key: 'lines', label: 'Lines (one per line)', type: 'textarea', default: 'Stay hydrated.\nShip small, ship often.\nTake a walk at lunch.' },
      { key: 'every', label: 'Change every', type: 'select', default: '15', options: [['5', '5 seconds'], ['15', '15 seconds'], ['30', '30 seconds'], ['60', '1 minute'], ['300', '5 minutes']] },
      { key: 'style', label: 'Style', type: 'select', default: 'quote', options: [['quote', 'Quote'], ['plain', 'Plain']] },
    ],
    render(el, s, ctx) {
      const lines = String(s.lines || '').split('\n').map((x) => x.trim()).filter(Boolean);
      if (!lines.length) { el.innerHTML = '<div class="fd-empty"><b>Rotating text</b><span>Add some lines in settings.</span></div>'; return; }
      let i = Math.floor(Date.now() / (Number(s.every || 15) * 1000)) % lines.length;
      const show = () => {
        el.innerHTML = `<div class="w-rot ${s.style}"><div class="txt">${esc(lines[i])}</div></div>`;
        requestAnimationFrame(() => FD.fitText(el.querySelector('.txt'), { max: 200 }));
      };
      show();
      clearInterval(el._rot);
      el._rot = ctx.every(Number(s.every || 15) * 1000, () => { i = (i + 1) % lines.length; show(); });
    },
    css: `
.w-rot { display: flex; align-items: center; justify-content: center; text-align: center; }
.w-rot .txt { font-weight: 600; line-height: 1.2; max-width: 100%; }
.w-rot.quote .txt::before { content: '“'; color: var(--accent); }
.w-rot.quote .txt::after { content: '”'; color: var(--accent); }
`,
  };


  // Temperatures NZXT CAM sends to pages shown on a Kraken (CAM 4.50+).
  // Outside CAM there is no data, so the editor shows sample numbers.
  W.kraken = {
    name: 'Kraken stats', icon: '💧', desc: 'Liquid, CPU and GPU temperature when shown on an NZXT Kraken',
    def: [6, 6], min: [2, 2], tick: 1000,
    settings: [
      { key: 'main', label: 'Big number', type: 'select', default: 'liquid', options: [['liquid', 'Liquid temperature'], ['cpu', 'CPU temperature'], ['gpu', 'GPU temperature']] },
      { key: 'units', label: 'Units', type: 'select', default: 'c', options: [['c', '°C'], ['f', '°F']] },
    ],
    render(el, s, ctx) {
      const live = FD.nzxtData && Date.now() - (FD.nzxtAt || 0) < 10000;
      const d = live ? FD.nzxtData : null;
      const pick = (o, keys) => { for (const k of keys) if (o && typeof o[k] === 'number') return o[k]; return null; };
      const cpu = d ? pick((d.cpus || [])[0], ['temperature', 'temp']) : 48;
      const gpu = d ? pick((d.gpus || [])[0], ['temperature', 'temp']) : 52;
      const liquid = d ? pick(d.kraken, ['liquidTemperature', 'liquidTemp', 'temperature']) : 31.4;
      const cpuLoad = d ? pick((d.cpus || [])[0], ['load']) : 0.18;
      const conv = (c) => (c == null ? null : s.units === 'f' ? c * 9 / 5 + 32 : c);
      const fmt = (c, dp = 0) => (c == null ? '—' : conv(c).toFixed(dp) + '°');
      const main = { liquid: [liquid, 'Liquid'], cpu: [cpu, 'CPU'], gpu: [gpu, 'GPU'] }[s.main || 'liquid'];
      const others = [['Liquid', liquid], ['CPU', cpu], ['GPU', gpu]].filter(([l]) => l !== main[1]);
      const pct = main[0] == null ? 0 : Math.max(0, Math.min(100, ((main[0] - 20) / 70) * 100));
      el.innerHTML = `<div class="w-kr ${ctx.aspect}">
        <div class="w-kr-ring">${FD.h.ring(pct, fmt(main[0], s.main === 'liquid' ? 1 : 0), main[1])}</div>
        ${ctx.cls === 'xs' ? '' : `<div class="w-kr-row">${others.map(([l, v]) => `<span><small>${l}</small>${fmt(v)}</span>`).join('')}${cpuLoad != null ? `<span><small>Load</small>${Math.round(cpuLoad * (cpuLoad <= 1 ? 100 : 1))}%</span>` : ''}</div>`}
        ${!live && ctx.editor ? '<div class="w-kr-note">Sample numbers. Live data appears on the Kraken.</div>' : ''}
        ${!live && !ctx.editor ? '<div class="w-kr-note">No data: open this page through NZXT CAM 4.50 or later.</div>' : ''}</div>`;
    },
    css: `
.w-kr { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3cqh; }
.w-kr.wide { flex-direction: row; gap: 5cqw; }
.w-kr-ring { height: min(72cqh, 90cqw); aspect-ratio: 1; }
.w-kr.wide .w-kr-ring { height: min(100cqh, 50cqw); }
.w-kr-row { display: flex; gap: 1.2em; font-size: min(7cqw, 9cqh); font-weight: 700; }
.w-kr.wide .w-kr-row { flex-direction: column; gap: .4em; font-size: min(6cqw, 14cqh); }
.w-kr-row span { display: flex; flex-direction: column; align-items: center; }
.w-kr.wide .w-kr-row span { align-items: flex-start; }
.w-kr-row small { color: var(--muted); font-size: .55em; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
.w-kr-note { color: var(--muted); font-size: min(4.5cqw, 6cqh); text-align: center; }
`,
  };

  Object.assign(FD.h, { fmtMoney, ago });
  FD.WIDGET_ORDER.push('worldclock', 'agenda', 'rss', 'scores', 'crypto', 'air', 'sunmoon', 'nowplaying', 'rotator', 'kraken');
  FD.BUILTIN = { ...W };
})();
