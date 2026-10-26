// Styles for the built-in widgets. Each widget's CSS travels with it so it can be
// opened and changed in the Widget Studio.
(function () {
  const FD = (window.FD = window.FD || {});
  FD.WIDGET_CSS = {
    "clock": `
.w-clock { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.w-clock-time { display: flex; align-items: baseline; justify-content: center; font-weight: 700; letter-spacing: -0.03em; line-height: 0.95; white-space: nowrap;
  font-size: min(31cqw, 82cqh); }
.w-clock-time .colon { font-weight: 400; color: var(--accent); margin: 0 0.02em; position: relative; top: -0.06em; }
.w-clock-time small { font-size: 0.3em; font-weight: 600; color: var(--muted); margin-left: 0.25em; letter-spacing: 0; }
.w-clock-label { margin-top: 0.4em; font-size: min(7cqw, 13cqh); color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; }
.w-clock-analog { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.w-clock-analog svg { height: min(100cqh, 100cqw); width: auto; flex: 1 1 auto; max-height: 100%; min-height: 0; }
.w-clock-analog:has(.w-clock-label) svg { height: min(84cqh, 100cqw); }
.w-clock-analog .face { fill: none; stroke: color-mix(in srgb, var(--muted) 45%, transparent); stroke-width: 1.2; }
.w-clock-analog .tick { stroke: var(--muted); stroke-width: 1.2; stroke-linecap: round; }
.w-clock-analog .tick.major { stroke: var(--fg); stroke-width: 2.4; }
.w-clock-analog .hand { stroke: var(--fg); stroke-linecap: round; }
.w-clock-analog .hand.h { stroke-width: 4.2; } .w-clock-analog .hand.m { stroke-width: 2.8; }
.w-clock-analog .hand.s { stroke: var(--accent); stroke-width: 1.2; }
.w-clock-analog .pin { fill: var(--accent); }
.w-clock-analog .w-clock-label { font-size: min(7cqw, 9cqh); margin-top: 0.3em; }
`,
    "date": `
.w-date { display: flex; flex-direction: column; justify-content: center; gap: 0.05em; }
.w-date-weekday { font-size: min(9cqw, 26cqh); color: var(--accent); font-weight: 650; text-transform: uppercase; letter-spacing: 0.08em; }
.w-date-main { font-size: min(14cqw, 42cqh); font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; }
.w-date-year { font-size: min(8cqw, 20cqh); color: var(--muted); }
.w-date.tall, .w-date.square { align-items: center; text-align: center; }
.fd-stage[data-shape="round"] .w-date { align-items: center; text-align: center; }
.w-date.square .w-date-main { font-size: min(17cqw, 34cqh); white-space: normal; }
`,
    "calendar": `
.w-cal { display: flex; flex-direction: column; gap: 2cqh; font-size: min(6.4cqw, calc(64cqh / (var(--weeks) + 2.6))); }
.w-cal-head { font-weight: 700; font-size: 1.12em; }
.w-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; align-items: center; }
.w-cal-grid.names { color: var(--muted); font-size: 0.8em; font-weight: 600; }
.w-cal-grid.days { flex: 1; grid-auto-rows: 1fr; }
.w-cal-grid.days span { display: flex; align-items: center; justify-content: center; position: relative; }
.w-cal-grid.days .past { color: var(--muted); }
.w-cal-grid.days .today { color: var(--bg); font-weight: 700; z-index: 0; }
.w-cal-grid.days .today::before { content: ''; position: absolute; z-index: -1; height: 1.75em; aspect-ratio: 1; border-radius: 50%; background: var(--accent); }
.w-cal-mini { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.w-cal-mini .m { font-size: min(22cqw, 22cqh); color: var(--accent); font-weight: 700; text-transform: uppercase; }
.w-cal-mini .d { font-size: min(60cqw, 58cqh); font-weight: 700; line-height: 1; }
`,
    "weather": `
.fd-wx-icon { display: block; aspect-ratio: 1; flex: none; }
.w-wx-xs { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.w-wx-xs .fd-wx-icon { width: min(60cqw, 55cqh); }
.w-wx-xs .t { font-weight: 700; font-size: min(30cqw, 34cqh); }
.w-wx { display: flex; flex-direction: column; justify-content: space-between; gap: 4cqh; }
.w-wx-now { display: flex; align-items: center; gap: 5cqw; flex: 1; min-height: 0; }
.w-wx-now .fd-wx-icon { height: min(100%, 38cqw); width: auto; max-height: 100%; }
.w-wx.has-days .w-wx-now .fd-wx-icon { height: min(100%, 26cqw); }
.w-wx-main { display: flex; flex-direction: column; gap: 0.15em; min-width: 0; font-size: min(5.2cqw, 9cqh); }
.w-wx.has-days .w-wx-main { font-size: min(4.6cqw, 5.4cqh); }
.w-wx-temp { font-size: 4em; font-weight: 700; line-height: 0.9; letter-spacing: -0.04em; }
.w-wx-temp small { font-size: 0.35em; color: var(--muted); font-weight: 600; margin-left: 0.1em; vertical-align: 1.4em; letter-spacing: 0; }
.w-wx-cond { font-size: 1.1em; font-weight: 600; }
.w-wx-hl { color: var(--fg); font-weight: 500; }
.w-wx-city { color: var(--muted); font-size: 0.95em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-wx-details { display: flex; flex-wrap: wrap; gap: 0.2em 0.9em; color: var(--muted); font-size: 0.85em; margin-top: 0.3em; }
.fd-stage[data-shape="round"] .w-wx-now { justify-content: center; }
.w-wx.tall .w-wx-now { flex-direction: column; align-items: flex-start; }
.w-wx-days { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 1.5cqw; height: 42cqh; font-size: min(calc(26cqw / var(--n)), 6.2cqh); }
.w-wx-days .day { display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; padding: 0.4em 0; border-radius: calc(var(--radius) * 0.7);
  background: color-mix(in srgb, var(--fg) 6%, transparent); }
.fd-stage[data-color="eink6"] .w-wx-days .day, .fd-stage[data-color="mono"] .w-wx-days .day { background: none; border: 1px solid var(--fg); }
.w-wx-days .dn { font-weight: 650; color: var(--muted); font-size: 0.9em; }
.w-wx-days .fd-wx-icon { height: 2.3em; }
.w-wx-days .hl { display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
.w-wx-days .hl b { font-weight: 700; } .w-wx-days .hl span { color: var(--muted); font-size: 0.9em; }
.w-wx-days .pp { color: var(--accent); font-size: 0.8em; min-height: 1em; }
`,
    "system": `
.w-sys { display: flex; flex-direction: column; justify-content: center; gap: 3cqh; }
.w-sys-rings { flex: 1; min-height: 0; display: flex; justify-content: center; align-items: center; gap: 4cqw; }
.w-sys-rings .fd-ring { height: 100%; width: auto; max-width: 48%; }
.w-sys-rings.n1 .fd-ring { max-width: 100%; }
.w-sys.tall .w-sys-rings { flex-direction: column; }
.w-sys.tall .w-sys-rings .fd-ring { max-width: 100%; height: 48%; }
.w-sys-foot { display: flex; justify-content: space-between; color: var(--muted); font-size: min(5.5cqw, 9cqh); white-space: nowrap; gap: 1em; }
.w-sys-foot span:first-child { overflow: hidden; text-overflow: ellipsis; }
`,
    "countdown": `
.w-cd { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 0.1em; }
.w-cd-title { font-size: min(8cqw, 15cqh); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.w-cd-num { font-size: min(24cqw, 48cqh); font-weight: 750; line-height: 1; letter-spacing: -0.03em; }
.w-cd-num small { font-size: 0.32em; font-weight: 600; color: var(--accent); margin-left: 0.25em; letter-spacing: 0; }
.w-cd-hms { font-size: min(9cqw, 15cqh); color: var(--muted); font-family: ui-monospace, Menlo, monospace; }
`,
    "note": `
.w-note { display: flex; align-items: center; }
.w-note-text { line-height: 1.2; max-width: 100%; }
`,
    "image": `
.w-img { margin: 0; position: relative; display: flex; }
.w-img img, .w-img video { width: 100%; height: 100%; display: block; border-radius: calc(var(--radius) * 0.6); }
.w-img figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 0.6em 0.8em; font-size: min(5cqw, 9cqh); font-weight: 600; color: #fff;
  background: linear-gradient(transparent, rgba(0,0,0,.65)); border-radius: 0 0 calc(var(--radius) * 0.6) calc(var(--radius) * 0.6); }
.fd-stage[data-color="eink6"] .w-img figcaption, .fd-stage[data-color="mono"] .w-img figcaption { background: var(--bg); color: var(--fg); }
`,
    "progress": `
.w-prog { display: flex; align-items: center; justify-content: center; }
.w-prog .fd-ring { width: auto; height: min(100cqh, 100cqw); }
.w-prog.bar { flex-direction: column; align-items: stretch; justify-content: center; gap: 12cqh; }
.w-prog-top { display: flex; justify-content: space-between; align-items: baseline; font-size: min(9cqw, 28cqh); }
.w-prog-top span { color: var(--muted); font-weight: 600; }
.w-prog-top b { font-size: 1.4em; }
.w-prog-track { height: max(6px, 18cqh); border-radius: 999px; background: color-mix(in srgb, var(--muted) 30%, transparent); overflow: hidden; }
.fd-stage[data-color="eink6"] .w-prog-track, .fd-stage[data-color="mono"] .w-prog-track { background: none; border: 1.5px solid var(--fg); }
.w-prog-track div { height: 100%; background: var(--accent); border-radius: inherit; }
`,
    "hn": `
.w-hn { display: flex; flex-direction: column; gap: 2cqh; font-size: min(6.2cqw, calc(58cqh / (var(--n) + 1.2))); }
.w-hn-head { color: var(--accent); font-weight: 750; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8em; }
.w-hn ol { margin: 0; padding: 0; list-style: none; counter-reset: hn; display: flex; flex-direction: column; flex: 1; justify-content: space-between; }
.w-hn li { counter-increment: hn; display: grid; grid-template-columns: 1.6em 1fr; column-gap: 0.4em; }
.w-hn li::before { content: counter(hn); grid-row: span 2; color: var(--muted); font-weight: 700; text-align: right; }
.w-hn .t { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-hn .m { color: var(--muted); font-size: 0.72em; }
`,
    "web": `
.w-web { position: relative; overflow: hidden; border-radius: calc(var(--radius) * 0.6); }
.w-web iframe { border: 0; position: absolute; top: 0; left: 0; transform-origin: 0 0; background: #fff; }

`,
  };
})();
