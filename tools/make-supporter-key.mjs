#!/usr/bin/env node
// Makes a supporter key for someone who donated.
//   node tools/make-supporter-key.mjs "Their Name" [tier]
// Needs the private key at keys/framedeck-supporter-PRIVATE.pem (never commit or share it).
// Set FRAMEDECK_PRIVATE_KEY to use a different path.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const keyPath = process.env.FRAMEDECK_PRIVATE_KEY || path.join(here, '..', 'keys', 'framedeck-supporter-PRIVATE.pem');
const [name, tier = 'supporter'] = process.argv.slice(2);
if (!name) { console.error('Usage: node tools/make-supporter-key.mjs "Their Name" [tier]'); process.exit(1); }
if (!fs.existsSync(keyPath)) { console.error(`Private key not found at ${keyPath}`); process.exit(1); }
const payload = Buffer.from(JSON.stringify({ n: name, t: tier, d: new Date().toISOString().slice(0, 10) }));
const sig = crypto.sign(null, payload, fs.readFileSync(keyPath));
const b64u = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log(`FD1-${b64u(payload)}.${b64u(sig)}`);
