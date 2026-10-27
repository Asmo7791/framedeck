// Rainmeter formulas (docs.rainmeter.net/manual/formulas), evaluated with a small parser:
// skins are downloads from strangers, so nothing here ever reaches eval().
(function (root) {
  const FUNCS = {
    cos: Math.cos, sin: Math.sin, tan: Math.tan, acos: Math.acos, asin: Math.asin, atan: Math.atan, atan2: Math.atan2,
    rad: (x) => (x * Math.PI) / 180, deg: (x) => (x * 180) / Math.PI, abs: Math.abs, neg: (x) => -x, exp: Math.exp,
    log: Math.log10, ln: Math.log, sqrt: Math.sqrt, sgn: Math.sign, frac: (x) => x - Math.trunc(x), trunc: Math.trunc,
    floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max,
    clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
    round: (x, p = 0) => { const f = 10 ** p; return Math.round(x * f) / f; },
  };
  const CONSTS = { pi: Math.PI, e: Math.E };

  function tokenize(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      const num = /^(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+(\.\d+)?(e[+-]?\d+)?)/i.exec(src.slice(i));
      if (num) {
        const t = num[0].toLowerCase();
        out.push({ t: 'n', v: t.startsWith('0b') ? parseInt(t.slice(2), 2) : t.startsWith('0o') ? parseInt(t.slice(2), 8) : Number(t) });
        i += num[0].length; continue;
      }
      const id = /^[A-Za-z_][\w.]*/.exec(src.slice(i));
      if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
      const op = /^(\*\*|<>|<=|>=|&&|\|\||<<|>>|[-+*/%&|^~=<>?:(),])/.exec(src.slice(i));
      if (op) { out.push({ t: 'op', v: op[0] }); i += op[0].length; continue; }
      throw new Error(`Unexpected "${c}" in formula`);
    }
    return out;
  }

  // Precedence climbing. Higher binds tighter.
  const BIN = {
    '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '=': 6, '<>': 6, '<': 7, '>': 7, '<=': 7, '>=': 7,
    '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10, '**': 12,
  };
  const APPLY = {
    '||': (a, b) => +(!!a || !!b), '&&': (a, b) => +(!!a && !!b), '|': (a, b) => a | b, '^': (a, b) => a ^ b, '&': (a, b) => a & b,
    '=': (a, b) => +(a === b), '<>': (a, b) => +(a !== b), '<': (a, b) => +(a < b), '>': (a, b) => +(a > b), '<=': (a, b) => +(a <= b), '>=': (a, b) => +(a >= b),
    '<<': (a, b) => a << b, '>>': (a, b) => a >> b, '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b,
    '/': (a, b) => (b === 0 ? 0 : a / b), '%': (a, b) => (b === 0 ? 0 : a % b), '**': (a, b) => a ** b,
  };

  // lookup(name) gives a measure's number (or undefined); unknown names count as 0, like Rainmeter.
  function evaluate(src, lookup = () => undefined) {
    const toks = tokenize(String(src));
    let p = 0, depth = 0;
    const peek = () => toks[p];
    const take = (v) => { const t = toks[p]; if (!t || (v && t.v !== v)) throw new Error(`Expected "${v}" in formula`); p++; return t; };
    function primary() {
      if (++depth > 200) throw new Error('Formula is nested too deeply');
      const t = take();
      let v;
      if (t.t === 'n') v = t.v;
      else if (t.t === 'op' && t.v === '(') { v = ternary(); take(')'); }
      else if (t.t === 'op' && t.v === '-') v = -primary();
      else if (t.t === 'op' && t.v === '+') v = primary();
      else if (t.t === 'op' && t.v === '~') v = ~primary();
      else if (t.t === 'id') {
        const name = t.v.toLowerCase();
        if (peek() && peek().v === '(' && FUNCS[name]) {
          take('(');
          const args = [];
          if (peek() && peek().v !== ')') { args.push(ternary()); while (peek() && peek().v === ',') { take(','); args.push(ternary()); } }
          take(')');
          v = FUNCS[name](...args);
        } else if (name in CONSTS) v = CONSTS[name];
        else { const m = lookup(t.v); v = typeof m === 'number' && isFinite(m) ? m : 0; }
      } else throw new Error(`Unexpected "${t.v}" in formula`);
      depth--;
      return v;
    }
    function binary(minPrec) {
      let left = primary();
      for (;;) {
        const t = peek();
        if (!t || t.t !== 'op' || !(t.v in BIN) || BIN[t.v] < minPrec) return left;
        p++;
        // ** is right-associative
        const right = binary(t.v === '**' ? BIN[t.v] : BIN[t.v] + 1);
        left = APPLY[t.v](left, right);
      }
    }
    function ternary() {
      const cond = binary(1);
      if (peek() && peek().v === '?') {
        take('?');
        const a = ternary();
        take(':');
        const b = ternary();
        return cond ? a : b;
      }
      return cond;
    }
    const v = ternary();
    if (p < toks.length) throw new Error(`Unexpected "${toks[p].v}" in formula`);
    return isFinite(v) ? v : 0;
  }

  // Numeric option values may contain (formulas) anywhere: "X=(5*2)", "FontColor=(255*0.5),255,255".
  function resolveParens(text, lookup) {
    let out = '', i = 0;
    while (i < text.length) {
      if (text[i] !== '(') { out += text[i++]; continue; }
      let d = 0, j = i;
      for (; j < text.length; j++) { if (text[j] === '(') d++; else if (text[j] === ')' && --d === 0) break; }
      if (j >= text.length) { out += text.slice(i); break; }
      try { out += String(evaluate(text.slice(i, j + 1), lookup)); } catch { out += '0'; }
      i = j + 1;
    }
    return out;
  }

  const api = { evaluate, resolveParens };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RainmeterAddon = root.RainmeterAddon || {}).formula = api;
})(typeof window !== 'undefined' ? window : globalThis);
