'use strict';
// Supporter keys: a small signed note ("this person supported FrameDeck").
// Keys are signed with a private key only the project owner has
// (tools/make-supporter-key.mjs) and checked here with the public key, offline.
// Unlocking also registers this computer with the relay, which allows each key on a few
// computers; after that the key works offline.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { relayUrl } = require('./relay');

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAZe8d7frOPBw9SbZ1KkhzvuS51zNDSKVl/35OxI3qgEI=
-----END PUBLIC KEY-----`;

const b64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function verifyKey(key, publicKey = PUBLIC_KEY) {
  const m = String(key || '').trim().replace(/\s+/g, '').match(/^FD1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try {
    const payload = b64u(m[1]);
    if (!crypto.verify(null, payload, publicKey, b64u(m[2]))) return null;
    const data = JSON.parse(payload.toString('utf8'));
    return { name: String(data.n || 'Supporter'), tier: String(data.t || 'supporter'), issued: data.d || null };
  } catch { return null; }
}

const fail = (status, message) => Object.assign(new Error(message), { status });

async function callRelay(base, route, body) {
  let r;
  try {
    r = await fetch(base + route, {
      method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'FrameDeck' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw fail(502, "Couldn't reach FrameDeck's activation server. Check your internet connection and try again.");
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 403 && data.limit) {
    throw fail(403, `This key is already unlocked on ${data.limit} computers. Remove it from one of them (♥ Supporter → Remove key from this computer), or ask the developer to reset it.`);
  }
  if (!r.ok) throw fail(502, `The activation server answered: ${data.error || 'HTTP ' + r.status}`);
  return data;
}

// options.publicKey and options.relay are for tests; the app uses the defaults.
function licenseStore(dataDir, { publicKey = PUBLIC_KEY, relay = relayUrl } = {}) {
  const file = path.join(dataDir, 'supporter.json');
  const deviceFile = path.join(dataDir, 'device.json');
  let current = null;
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Keys unlocked before activation existed keep working.
    current = verifyKey(saved.key, publicKey) ? { key: saved.key, ...verifyKey(saved.key, publicKey) } : null;
  } catch { /* none yet */ }

  // A random ID for this computer, so the relay can count computers without knowing anything about them.
  function deviceId() {
    try { const d = JSON.parse(fs.readFileSync(deviceFile, 'utf8')); if (/^[a-f0-9-]{16,64}$/.test(d.id)) return d.id; } catch { /* make one */ }
    const id = crypto.randomUUID();
    fs.writeFileSync(deviceFile, JSON.stringify({ id }), { mode: 0o600 });
    return id;
  }

  return {
    get: () => (current ? { supporter: true, name: current.name, tier: current.tier, issued: current.issued } : { supporter: false }),
    async set(key) {
      const v = verifyKey(key, publicKey);
      if (!v) return null;
      const clean = key.trim().replace(/\s+/g, '');
      await callRelay(relay(), '/activate', { key: clean, device: deviceId() });
      current = { key: clean, ...v };
      fs.writeFileSync(file, JSON.stringify({ key: current.key, activated: true }), { mode: 0o600 });
      return this.get();
    },
    async clear() {
      // Free this computer's place for the key. If the relay can't be reached, remove it anyway.
      if (current) await callRelay(relay(), '/release', { key: current.key, device: deviceId() }).catch(() => {});
      current = null;
      try { fs.unlinkSync(file); } catch { /* already gone */ }
      return this.get();
    },
  };
}

module.exports = { verifyKey, licenseStore };
