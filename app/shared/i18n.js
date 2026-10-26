// Interface translations. English lives in the code itself; other languages are packs in
// app/i18n/<lang>.js: { strings, guide(id, h), help }. FD.setLanguage() translates the page
// as it changes, by exact text, so the rest of the code doesn't need to change.
// What people put on their screens (widgets on the stage) is never translated.
(function () {
  const FD = (window.FD = window.FD || {});
  FD.I18N = FD.I18N || {};
  FD.LANGUAGES = [['en', 'English'], ['zh-Hans', '简体中文'], ['zh-Hant', '繁體中文']];
  FD.lang = 'en';

  let exact = new Map();
  let patterns = [];
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Keys may contain placeholders: {0} keeps the matched text, {t0} translates it too.
  function load(lang) {
    exact = new Map();
    patterns = [];
    const pack = FD.I18N[lang];
    if (!pack) return;
    for (const [k, v] of Object.entries(pack.strings || {})) {
      const key = norm(k);
      if (!/\{t?\d\}/.test(key)) { exact.set(key, v); continue; }
      const slots = [];
      const re = new RegExp('^' + key.split(/(\{t?\d\})/).map((part) => {
        const m = /^\{(t?)(\d)\}$/.exec(part);
        if (!m) return reEsc(part);
        slots.push({ n: Number(m[2]), translate: !!m[1] });
        return '(.*?)';
      }).join('') + '$');
      patterns.push({ re, slots, to: v, weight: key.replace(/\{t?\d\}/g, '').length });
    }
    patterns.sort((a, b) => b.weight - a.weight);
  }

  FD.tr = function (s) {
    if (FD.lang === 'en' || s == null) return s;
    const key = norm(s);
    if (!key) return s;
    if (exact.has(key)) return exact.get(key);
    for (const p of patterns) {
      const m = p.re.exec(key);
      if (!m) continue;
      const vals = {};
      p.slots.forEach((slot, i) => { vals[slot.n] = slot.translate ? FD.tr(m[i + 1]) : m[i + 1]; });
      return p.to.replace(/\{t?(\d)\}/g, (_, n) => vals[n] ?? '');
    }
    return s;
  };

  // Language-specific guide pages and Widget Studio reference, when a pack has them.
  FD.i18nGuide = (id, helpers) => { const p = FD.I18N[FD.lang]; return p && p.guide ? p.guide(id, helpers) : null; };
  FD.i18nHelp = () => { const p = FD.I18N[FD.lang]; return p && p.help ? p.help : null; };

  // ---------- translating the page ----------
  const SKIP = '#scaler, .fd-stage, .fd-frame, textarea, script, style, #stLog, #stCode, #stPreviews, [data-i18n-skip]';
  const INLINE = new Set(['B', 'I', 'EM', 'STRONG', 'CODE', 'KBD', 'SMALL', 'A', 'BR']);
  const ATTRS = ['placeholder', 'title', 'aria-label'];

  function translateText(node) {
    const t = node.nodeValue;
    if (!/[A-Za-z]/.test(t)) return;
    const out = FD.tr(t);
    if (out !== t) node.nodeValue = t.match(/^\s*/)[0] + out + t.match(/\s*$/)[0];
  }
  function translateAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && /[A-Za-z]/.test(v)) { const out = FD.tr(v); if (out !== v) el.setAttribute(a, out); }
    }
  }
  function translateTree(root) {
    if (FD.lang === 'en' || !root) return;
    if (root.nodeType === 3) { if (root.parentElement && !root.parentElement.closest(SKIP)) translateText(root); return; }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    const walk = (el) => {
      if (el.matches(SKIP)) return;
      translateAttrs(el);
      // A paragraph with bold words or links is translated whole, so the sentence reads naturally.
      if (el.children.length && [...el.children].every((c) => INLINE.has(c.tagName))) {
        const key = norm(el.innerHTML);
        const out = FD.tr(key);
        if (out !== key) { el.innerHTML = out; return; }
      }
      for (const c of [...el.childNodes]) {
        if (c.nodeType === 3) translateText(c);
        else if (c.nodeType === 1) walk(c);
      }
    };
    walk(root);
  }

  let observer = null;
  FD.setLanguage = function (lang) {
    if (!FD.I18N[lang]) lang = 'en';
    if (FD.lang === lang) return;
    // Translated text no longer matches the English keys, so any other change needs the original page.
    if (lang === 'en' || FD.lang !== 'en') { location.reload(); return; }
    FD.lang = lang;
    load(lang);
    document.documentElement.lang = lang;
    translateTree(document.body);
    if (!observer) {
      observer = new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === 'childList') m.addedNodes.forEach(translateTree);
          else if (m.type === 'characterData') translateTree(m.target);
          else if (m.type === 'attributes' && !m.target.closest(SKIP)) translateAttrs(m.target);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
  };

  // The language to suggest on first start, from the system language.
  FD.suggestLanguage = function () {
    const l = String(navigator.language || '').toLowerCase();
    if (!l.startsWith('zh')) return 'en';
    return /-(tw|hk|mo|hant)/.test(l) ? 'zh-Hant' : 'zh-Hans';
  };
})();
