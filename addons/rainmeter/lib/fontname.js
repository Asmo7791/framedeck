'use strict';
// The family name inside a .ttf / .otf file (its "name" table), so a skin's FontFace=
// can find fonts it bundles in @Resources/Fonts.
function fontFamily(buf) {
  try {
    const tables = buf.readUInt16BE(4);
    for (let i = 0; i < tables; i++) {
      const rec = 12 + i * 16;
      if (buf.toString('latin1', rec, rec + 4) !== 'name') continue;
      const base = buf.readUInt32BE(rec + 8);
      const count = buf.readUInt16BE(base + 2), strings = base + buf.readUInt16BE(base + 4);
      let best = null;
      for (let j = 0; j < count; j++) {
        const r = base + 6 + j * 12;
        const platform = buf.readUInt16BE(r), nameId = buf.readUInt16BE(r + 6);
        if (nameId !== 1 && nameId !== 16) continue; // family, or typographic family
        const len = buf.readUInt16BE(r + 8), off = strings + buf.readUInt16BE(r + 10);
        const raw = buf.subarray(off, off + len);
        const text = platform === 3 || platform === 0 ? Buffer.from(raw).swap16().toString('utf16le') : raw.toString('latin1');
        if (nameId === 1 && platform === 3) return text; // Windows family name: what Rainmeter matches
        if (!best) best = text;
      }
      return best;
    }
  } catch { /* not a font we can read */ }
  return null;
}

module.exports = { fontFamily };
