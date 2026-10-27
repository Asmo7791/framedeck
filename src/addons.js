'use strict';
// Add-ons: optional features that live in addons/<name>/ and plug into FrameDeck without the
// core knowing anything about them. An add-on folder may have:
//   server.js  exports { routes, localOnly }: routes like 'GET /skins' are served at
//              /api/addons/<name>/skins and get (req, url, local, kit); localOnly lists the
//              routes only this computer may call (like the core's editing endpoints).
//              It may also export setup(kit), called once.
//   client/    browser files, served at /addons/<name>/. client/index.js is loaded by the
//              editor and display pages before they draw anything.
// Removing an add-on's folder removes the feature and nothing else.
const fs = require('fs');
const path = require('path');

function loadAddons(rootDir) {
  const dir = path.join(rootDir, 'addons');
  const out = [];
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort(); } catch { return out; }
  for (const name of names) {
    if (!/^[a-z0-9-]+$/.test(name)) continue;
    const base = path.join(dir, name);
    const addon = { name, dir: base, routes: {}, localOnly: [], setup: null, client: null };
    try {
      if (fs.existsSync(path.join(base, 'server.js'))) Object.assign(addon, require(path.join(base, 'server.js')));
    } catch (err) {
      console.error(`FrameDeck add-on "${name}" failed to load:`, err.message);
      continue;
    }
    if (fs.existsSync(path.join(base, 'client', 'index.js'))) addon.client = path.join(base, 'client');
    out.push(addon);
  }
  return out;
}

module.exports = { loadAddons };
