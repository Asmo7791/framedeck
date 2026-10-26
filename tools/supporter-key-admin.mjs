#!/usr/bin/env node
// Checks or resets how many computers a supporter key is unlocked on.
//   node tools/supporter-key-admin.mjs status "FD1-…"
//   node tools/supporter-key-admin.mjs reset "FD1-…"     (frees all of that key's computers)
// Needs the relay's admin token: keys/relay-admin-token.txt, or FRAMEDECK_ADMIN_TOKEN.
// The same value must be set as the ADMIN_TOKEN secret on the Cloudflare worker.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { relayUrl } = createRequire(import.meta.url)('../src/relay.js');
const [action, key] = process.argv.slice(2);
if (!['status', 'reset'].includes(action) || !key) {
  console.error('Usage: node tools/supporter-key-admin.mjs status|reset "FD1-…"');
  process.exit(1);
}
const tokenFile = path.join(here, '..', 'keys', 'relay-admin-token.txt');
const token = process.env.FRAMEDECK_ADMIN_TOKEN || (fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '');
if (!token) { console.error(`No admin token: put it in ${tokenFile} or set FRAMEDECK_ADMIN_TOKEN.`); process.exit(1); }

const r = await fetch(`${relayUrl()}/admin/${action}`, {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
  body: JSON.stringify({ key: key.trim() }),
});
const d = await r.json().catch(() => ({}));
if (!r.ok) { console.error(`Failed: ${d.error || 'HTTP ' + r.status}`); process.exit(1); }
console.log(action === 'reset' ? `Reset. The key can now be unlocked on ${d.limit} new computers.` : `Unlocked on ${d.used} of ${d.limit} computers.`);
