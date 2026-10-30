// Widget Studio's code check: reads a widget's JavaScript and CSS and points out risky patterns
// (with line numbers) and better ways to do common things. It's a helper for writing safe widgets,
// not a guarantee: widgets still run in a sandbox either way.
(function (root) {
  // Helpers that return HTML on purpose, so putting them into innerHTML is fine.
  const HTML_HELPERS = /^(esc|ring|spark|wxIcon|moonSvg|newsList)\s*\(/;
  // Values that can't carry HTML: numbers and sizes.
  const SAFE_VALUE = /^(\d|Math\.|Number\(|ctx\.(w|h|cols|rows|cls|aspect|shape|color)\b|[\w.]+\.(length|toFixed\(\d*\))\s*$|String\(\d)/;

  // Values read straight from fetched data (ctx.data, d.title, item.name...). Only these are
  // flagged: a checker can't know what a local variable holds, and false alarms get ignored.
  const FROM_DATA = /^(ctx\.data|d|data|json|res|resp|response|r|item|it|items\[[^\]]*\]|entry|e|ev|event|story|post|row|feed|result|results\[[^\]]*\])(\.|\[)/;
  const NUMERIC_END = /(\.length|\.toFixed\([^)]*\)|\.toLocale\w*\([^)]*\))$/;

  const lineOf = (src, index) => src.slice(0, index).split('\n').length;

  // The ${...} parts of the template literal starting at `start` (a backtick).
  function templateParts(src, start) {
    const parts = [];
    let i = start + 1;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        let depth = 1, j = i + 2;
        for (; j < src.length && depth; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; else if (src[j] === '`') { const end = templateParts(src, j).end; j = end; } }
        parts.push({ expr: src.slice(i + 2, j - 1).trim(), at: i });
        i = j;
        continue;
      }
      i++;
    }
    return { parts, end: i };
  }

  function checkJs(src) {
    const out = [];
    const risk = (index, text) => out.push({ level: 'risk', line: lineOf(src, index), text });
    const tip = (index, text) => out.push({ level: 'tip', line: lineOf(src, index), text });
    const each = (re, fn) => { re.lastIndex = 0; let m; while ((m = re.exec(src))) fn(m); };

    // Text from data put into HTML without esc(): a feed or API could inject its own HTML.
    each(/(?:\.innerHTML|\.outerHTML)\s*\+?=\s*`|insertAdjacentHTML\([^,]+,\s*`/g, (m) => {
      const start = m.index + m[0].length - 1;
      for (const p of templateParts(src, start).parts) {
        // (a choice between two fixed texts, like ${d.live ? 'Live' : 'Final'}, is safe too)
        if (/\?\s*(['"`])[^'"`]*\1\s*:\s*(['"`])[^'"`]*\2\s*$/.test(p.expr)) continue;
        if (HTML_HELPERS.test(p.expr) || SAFE_VALUE.test(p.expr) || !FROM_DATA.test(p.expr) || NUMERIC_END.test(p.expr) || /^Math\./.test(p.expr)) continue;
        risk(p.at, `"\${${p.expr.slice(0, 40)}}" goes into HTML without esc(). If it comes from a feed or API, it could add its own HTML. Wrap it: \${esc(${p.expr.slice(0, 30)})}`);
      }
    });
    each(/(?:\.innerHTML|\.outerHTML)\s*\+?=\s*(?!`|'|")([\w.[\]]+)\s*(?:;|\n|$)/g, (m) => {
      if (FROM_DATA.test(m[1])) risk(m.index, `${m[1]} goes into innerHTML as HTML. For plain text use .textContent, or esc() it.`);
    });
    each(/\beval\s*\(|new\s+Function\s*\(|set(?:Timeout|Interval)\s*\(\s*['"`]/g, (m) => risk(m.index, 'Running code from a string (eval, new Function, or a string timer) can run whatever the string contains. Use normal functions.'));
    each(/document\.write\s*\(/g, (m) => risk(m.index, 'document.write replaces the widget and can add scripts. Set el.innerHTML (with esc()) instead.'));
    each(/createElement\(\s*['"]script['"]\s*\)|<script\b/gi, (m) => risk(m.index, 'Adding <script> tags loads code from somewhere else into your widget. Keep the code in the widget itself.'));
    each(/\b(api[_-]?key|apikey|secret|token|password|passwd)\s*[:=]\s*['"][^'"\s]{8,}['"]/gi, (m) => risk(m.index, `Looks like a secret (${m[1]}) written into the code. Anyone you share the widget with gets it. Use a setting instead, so each person enters their own.`));
    each(/\bfetch\s*\(/g, (m) => { if (!/ctx\.|\.fetch/.test(src.slice(Math.max(0, m.index - 4), m.index))) tip(m.index, "Widgets can't call fetch() directly. Use ctx.fetchJSON('/api/...') for FrameDeck's data or ctx.fetchText(url) for a web address."); });
    each(/['"`]http:\/\/(?!localhost|127\.)/g, (m) => tip(m.index, 'This address uses http://, which anyone on the network can read or change. Use https:// if the site supports it.'));
    each(/\bwindow\.open\s*\(|location(?:\.href)?\s*=/g, (m) => tip(m.index, 'Before opening a link that came from data, check it starts with https:// so it can\'t be another kind of link.'));
    each(/\b(localStorage|sessionStorage|document\.cookie|indexedDB)\b/g, (m) => tip(m.index, `${m[1]} isn't available in the widget sandbox. Keep state in a variable, or in a setting.`));
    each(/(?<!ctx\.every\([^)]*)\bsetInterval\s*\(/g, (m) => tip(m.index, 'Use ctx.every(ms, fn) instead of setInterval: it stops when the widget is removed, so timers don\'t pile up.'));
    each(/while\s*\(\s*(true|1)\s*\)|for\s*\(\s*;\s*;\s*\)/g, (m) => tip(m.index, 'A loop that never ends freezes the widget. Make sure it always breaks out.'));
    if (src.trim() && !/\bwidget\s*\(\s*\{/.test(src)) out.push({ level: 'tip', line: 1, text: 'The code never calls widget({ ... }), so nothing will show.' });
    return out;
  }

  function checkCss(css) {
    const out = [];
    const re = /@import\b|url\(\s*['"]?(https?:)?\/\//gi;
    let m;
    while ((m = re.exec(css))) out.push({ level: 'tip', line: lineOf(css, m.index), text: 'This loads a file from the internet every time the widget shows, which tells that site when and where it\'s displayed. Upload the image or font instead if you can.', css: true });
    return out;
  }

  function checkWidget(js, css) {
    const all = [...checkJs(String(js || '')), ...checkCss(String(css || ''))];
    return all.sort((a, b) => (a.level === b.level ? a.line - b.line : a.level === 'risk' ? -1 : 1));
  }

  const api = { checkWidget };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.FD = root.FD || {}).checkWidget = checkWidget;
})(typeof window !== 'undefined' ? window : globalThis);
