'use strict';
// Reads .zip and .rmskin files (an .rmskin is a zip with a short footer after it).
// Only "stored" and "deflate" entries, which is what skin packagers produce.
const zlib = require('zlib');

function readZip(buf, { maxFiles = 4000, maxBytes = 200 * 1024 * 1024 } = {}) {
  // The end-of-central-directory record is in the last 64 KB (plus an .rmskin footer).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65600); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("This isn't a zip or .rmskin file");
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count > maxFiles) throw new Error('This file has too many files inside');
  const entries = [];
  let p = cdOffset, total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('This zip file is damaged');
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const rawName = buf.subarray(p + 46, p + 46 + nameLen);
    // Bit 11 means UTF-8 names; older Windows tools use the system code page.
    const name = (flags & 0x800 ? rawName.toString('utf8') : new TextDecoder('windows-1252').decode(rawName)).replace(/\\/g, '/');
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    total += size;
    if (total > maxBytes) throw new Error('This file is too large once unpacked');
    entries.push({
      name, size,
      read() {
        if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error('This zip file is damaged');
        const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
        const data = buf.subarray(start, start + compSize);
        if (method === 0) return Buffer.from(data);
        if (method === 8) return zlib.inflateRawSync(data, { maxOutputLength: Math.max(size, 1) });
        throw new Error(`Unsupported compression in ${name}`);
      },
    });
  }
  return entries;
}

module.exports = { readZip };
