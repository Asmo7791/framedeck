'use strict';
// Supporter keys: a small signed note ("this person supported FrameDeck").
// Keys are signed with a private key only the project owner has
// (tools/make-supporter-key.mjs) and checked here with the public key, offline.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAZe8d7frOPBw9SbZ1KkhzvuS51zNDSKVl/35OxI3qgEI=
-----END PUBLIC KEY-----`;

const b64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function verifyKey(key) {
  const m = String(key || '').trim().replace(/\s+/g, '').match(/^FD1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try {
    const payload = b64u(m[1]);
    if (!crypto.verify(null, payload, PUBLIC_KEY, b64u(m[2]))) return null;
    const data = JSON.parse(payload.toString('utf8'));
    return { name: String(data.n || 'Supporter'), tier: String(data.t || 'supporter'), issued: data.d || null };
  } catch { return null; }
}

function licenseStore(dataDir) {
  const file = path.join(dataDir, 'supporter.json');
  let current = null;
  try { const saved = JSON.parse(fs.readFileSync(file, 'utf8')); current = verifyKey(saved.key) ? { key: saved.key, ...verifyKey(saved.key) } : null; } catch { /* none yet */ }
  return {
    get: () => (current ? { supporter: true, name: current.name, tier: current.tier, issued: current.issued } : { supporter: false }),
    set(key) {
      const v = verifyKey(key);
      if (!v) return null;
      current = { key: key.trim(), ...v };
      fs.writeFileSync(file, JSON.stringify({ key: current.key }), { mode: 0o600 });
      return this.get();
    },
    clear() { current = null; try { fs.unlinkSync(file); } catch { /* already gone */ } return this.get(); },
  };
}

module.exports = { verifyKey, licenseStore };
