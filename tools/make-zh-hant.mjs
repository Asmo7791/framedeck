#!/usr/bin/env node
// Makes app/i18n/zh-Hant.js (Traditional Chinese, Taiwan phrasing) from app/i18n/zh-Hans.js.
//   npm run i18n
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as OpenCC from 'opencc-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const convert = OpenCC.Converter({ from: 'cn', to: 'twp' });
const src = fs.readFileSync(path.join(root, 'app/i18n/zh-Hans.js'), 'utf8');
const out = convert(src)
  .replace(/^\/\/ .*\n\/\/ .*\n/, '// 繁體中文 interface text. Generated from zh-Hans.js by tools/make-zh-hant.mjs: don\'t edit by hand.\n')
  .replace("FD.I18N['zh-Hans']", "FD.I18N['zh-Hant']")
  // Taiwan and Hong Kong use corner brackets for quotation marks.
  .replace(/“/g, '「').replace(/”/g, '」').replace(/‘/g, '『').replace(/’/g, '』');
fs.writeFileSync(path.join(root, 'app/i18n/zh-Hant.js'), out);
console.log('Wrote app/i18n/zh-Hant.js');
