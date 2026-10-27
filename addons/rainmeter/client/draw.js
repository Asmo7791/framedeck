// Draws a Rainmeter skin (engine.js) onto a canvas. Everything is drawn as pixels, so text
// from a skin can never turn into HTML on the page.
(function (root) {
  const rgba = (c) => `rgba(${c[0]},${c[1]},${c[2]},${(c[3] ?? 255) / 255})`;
  const WHITE = [255, 255, 255, 255];

  // images(path) gives a loaded HTMLImageElement, or null while it loads (or if it's missing).
  function drawSkin(g, skin, images) {
    const { w: W, h: H } = skin.size;
    g.clearRect(0, 0, W, H);
    background(g, skin, images, W, H);
    for (const mt of skin.meters) {
      if (mt.hidden || !mt.box || mt.type === 'container') continue;
      g.save();
      try { meter(g, skin, mt, images); } catch { /* one broken meter doesn't stop the rest */ }
      g.restore();
    }
  }

  function background(g, skin, images, W, H) {
    const bgPath = skin.path('rainmeter', 'Background');
    const mode = skin.num('rainmeter', 'BackgroundMode', bgPath ? 0 : 1);
    if (mode === 2) { fillBox(g, skin, 'rainmeter', { x: 0, y: 0, w: W, h: H }, [128, 128, 128, 255]); return; }
    if (!bgPath || mode === 1) { fillBox(g, skin, 'rainmeter', { x: 0, y: 0, w: W, h: H }, null); return; }
    const img = images(bgPath);
    if (!img) return;
    skin.bgSize = { w: img.naturalWidth, h: img.naturalHeight };
    if (mode === 0) g.drawImage(img, 0, 0);
    else if (mode === 4) { g.fillStyle = g.createPattern(img, 'repeat'); g.fillRect(0, 0, W, H); }
    else {
      // Mode 3: stretch, keeping BackgroundMargins (left, top, right, bottom) unscaled.
      const [l, t, r, b] = String(skin.str('rainmeter', 'BackgroundMargins', '0,0,0,0')).split(',').map((x) => parseFloat(x) || 0);
      nineSlice(g, img, { l, t, r, b }, 0, 0, W, H);
    }
  }

  function nineSlice(g, img, m, x, y, w, h) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const sx = [0, m.l, iw - m.r, iw], sy = [0, m.t, ih - m.b, ih];
    const dx = [x, x + m.l, x + w - m.r, x + w], dy = [y, y + m.t, y + h - m.b, y + h];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const swd = sx[i + 1] - sx[i], sht = sy[j + 1] - sy[j], dwd = dx[i + 1] - dx[i], dht = dy[j + 1] - dy[j];
      if (swd > 0 && sht > 0 && dwd > 0 && dht > 0) g.drawImage(img, sx[i], sy[j], swd, sht, dx[i], dy[j], dwd, dht);
    }
  }

  // SolidColor (and SolidColor2 + GradientAngle) behind a meter.
  function fillBox(g, skin, key, box, def) {
    const c1 = skin.color(key, 'SolidColor', def);
    if (!c1 || c1[3] === 0 && !skin.raw(key, 'SolidColor2', null)) return;
    const c2 = skin.color(key, 'SolidColor2', null);
    if (c2) {
      const a = skin.num(key, 'GradientAngle', 0);
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2, r = Math.max(box.w, box.h) / 2;
      const grad = g.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      grad.addColorStop(0, rgba(c1)); grad.addColorStop(1, rgba(c2));
      g.fillStyle = grad;
    } else g.fillStyle = rgba(c1);
    g.fillRect(box.x, box.y, box.w, box.h);
  }

  function meter(g, skin, mt, images) {
    const k = mt.key, b = mt.box;
    if (mt.type !== 'bar') fillBox(g, skin, k, b, null);
    const [pl = 0, pt = 0, pr = 0, pb = 0] = b.pad || [];
    const inner = { x: b.x + pl, y: b.y + pt, w: Math.max(0, b.w - pl - pr), h: Math.max(0, b.h - pt - pb) };
    switch (mt.type) {
      case 'string': return text(g, skin, mt, inner);
      case 'image': return image(g, skin, mt, inner, images(mt.image));
      case 'bar': return bar(g, skin, mt, b, images);
      case 'line': case 'histogram': return graph(g, skin, mt, inner);
      case 'roundline': return roundline(g, skin, mt, inner);
      case 'rotator': return rotator(g, skin, mt, inner, images(mt.image));
      case 'shape': return shapes(g, mt);
      case 'button': return frames(g, mt, inner, images(mt.image), 3, 0);
      case 'bitmap': return frames(g, mt, inner, images(mt.image), Math.max(1, skin.num(k, 'BitmapFrames', 1)), skin.meterValue(mt));
      default: return undefined;
    }
  }

  function text(g, skin, mt, box) {
    const k = mt.key;
    const color = skin.color(k, 'FontColor', [0, 0, 0, 255]);
    const align = skin.str(k, 'StringAlign', 'Left').toLowerCase();
    const h = align.startsWith('right') ? 'right' : align.startsWith('center') ? 'center' : 'left';
    const v = align.endsWith('bottom') ? 'bottom' : align.endsWith('center') && align !== 'center' ? 'middle' : 'top';
    g.font = mt.fontCss;
    g.textAlign = h;
    g.textBaseline = v === 'top' ? 'top' : v === 'bottom' ? 'bottom' : 'middle';
    const lineH = mt.fontPx * 1.2;
    const clip = skin.num(k, 'ClipString', 0);
    let lines = String(mt.text || '').split('\n');
    if (clip >= 1 && box.w > 0) lines = wrapOrClip(g, lines, box.w, clip, Math.max(1, Math.floor((box.h || lineH) / lineH)));
    const angle = skin.num(k, 'Angle', 0);
    const x = h === 'right' ? box.x + box.w : h === 'center' ? box.x + box.w / 2 : box.x;
    const total = lines.length * lineH;
    const y0 = v === 'top' ? box.y : v === 'bottom' ? box.y + box.h - total + lineH : box.y + box.h / 2 - total / 2 + lineH / 2;
    if (clip >= 1) { g.beginPath(); g.rect(box.x - 1, box.y - 1, box.w + 2, box.h + 2); g.clip(); }
    if (angle) { const cx = box.x + box.w / 2, cy = box.y + box.h / 2; g.translate(cx, cy); g.rotate(angle); g.translate(-cx, -cy); }
    const effect = skin.str(k, 'StringEffect', 'None').toLowerCase();
    const fx = skin.color(k, 'FontEffectColor', [0, 0, 0, 255]);
    lines.forEach((line, i) => {
      const y = y0 + i * lineH;
      if (effect === 'shadow') { g.fillStyle = rgba(fx); g.fillText(line, x + 1, y + 1); }
      if (effect === 'border') { g.strokeStyle = rgba(fx); g.lineWidth = 2; g.lineJoin = 'round'; g.strokeText(line, x, y); }
      g.fillStyle = rgba(color);
      g.fillText(line, x, y);
    });
  }
  // ClipString=1 cuts a line with "…"; when the meter is tall enough for more lines, it wraps.
  function wrapOrClip(g, lines, width, clip, maxLines) {
    const out = [];
    for (const line of lines) {
      if (g.measureText(line).width <= width) { out.push(line); continue; }
      if (maxLines > 1 || clip === 2) {
        let cur = '';
        for (const word of line.split(/(\s+)/)) {
          if (g.measureText(cur + word).width > width && cur.trim()) { out.push(cur.trimEnd()); cur = word.trimStart(); } else cur += word;
        }
        if (cur) out.push(cur);
      } else out.push(ellipsize(g, line, width));
    }
    if (out.length > maxLines && clip !== 2) { const keep = out.slice(0, maxLines); keep[keep.length - 1] = ellipsize(g, keep[keep.length - 1] + '…', width); return keep; }
    return out;
  }
  function ellipsize(g, s, width) {
    if (g.measureText(s).width <= width) return s;
    let lo = 0, hi = s.length;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (g.measureText(s.slice(0, mid) + '…').width <= width) lo = mid; else hi = mid - 1; }
    return s.slice(0, lo).replace(/…$/, '') + '…';
  }

  function image(g, skin, mt, box, img) {
    if (!img || !box.w || !box.h) return;
    const k = mt.key;
    const keep = skin.num(k, 'PreserveAspectRatio', 0);
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let dx = box.x, dy = box.y, dw = box.w, dh = box.h, sx = 0, sy = 0, sw = iw, sh = ih;
    if (keep === 1) { const s = Math.min(box.w / iw, box.h / ih); dw = iw * s; dh = ih * s; dx += (box.w - dw) / 2; dy += (box.h - dh) / 2; }
    else if (keep === 2) { const s = Math.max(box.w / iw, box.h / ih); sw = box.w / s; sh = box.h / s; sx = (iw - sw) / 2; sy = (ih - sh) / 2; }
    g.globalAlpha = Math.max(0, Math.min(1, skin.num(k, 'ImageAlpha', 255) / 255));
    if (skin.num(k, 'Greyscale', 0) === 1) g.filter = 'grayscale(1)';
    const tint = skin.color(k, 'ImageTint', null);
    if (tint && (tint[0] < 255 || tint[1] < 255 || tint[2] < 255 || tint[3] < 255)) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(dw)); c.height = Math.max(1, Math.round(dh));
      const cg = c.getContext('2d');
      cg.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      cg.globalCompositeOperation = 'multiply'; cg.fillStyle = rgba([tint[0], tint[1], tint[2], 255]); cg.fillRect(0, 0, c.width, c.height);
      cg.globalCompositeOperation = 'destination-in'; cg.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      g.globalAlpha *= tint[3] / 255;
      g.drawImage(c, dx, dy, dw, dh);
    } else g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function bar(g, skin, mt, b, images) {
    const k = mt.key;
    const v = skin.meterValue(mt);
    const vertical = skin.str(k, 'BarOrientation', 'Vertical').toLowerCase().startsWith('v');
    const flip = skin.num(k, 'Flip', 0) === 1;
    fillBox(g, skin, k, b, null);
    const barImg = skin.path(k, 'BarImage');
    const img = barImg ? images(barImg) : null;
    let x = b.x, y = b.y, w = b.w, h = b.h;
    if (vertical) { h = b.h * v; y = flip ? b.y : b.y + b.h - h; } else { w = b.w * v; x = flip ? b.x + b.w - w : b.x; }
    if (w <= 0 || h <= 0) return;
    if (img) {
      const sx = ((x - b.x) / b.w) * img.naturalWidth, sy = ((y - b.y) / b.h) * img.naturalHeight;
      g.drawImage(img, sx, sy, (w / b.w) * img.naturalWidth, (h / b.h) * img.naturalHeight, x, y, w, h);
    } else { g.fillStyle = rgba(skin.color(k, 'BarColor', [0, 255, 0, 255])); g.fillRect(x, y, w, h); }
  }

  function graph(g, skin, mt, b) {
    const k = mt.key;
    const auto = skin.num(k, 'AutoScale', 0) === 1;
    const flip = skin.num(k, 'Flip', 0) === 1;
    const fromLeft = skin.str(k, 'GraphStart', 'Right').toLowerCase() === 'left';
    if (skin.num(k, 'HorizontalLines', 0) === 1) {
      g.strokeStyle = rgba(skin.color(k, 'HorizontalLineColor', [0, 0, 0, 255])); g.lineWidth = 1;
      for (let i = 1; i < 4; i++) { const y = Math.round(b.y + (b.h * i) / 4) + 0.5; g.beginPath(); g.moveTo(b.x, y); g.lineTo(b.x + b.w, y); g.stroke(); }
    }
    const histories = mt.history || [];
    const n = Math.max(1, Math.floor(b.w));
    let peak = 0;
    if (auto) for (const h of histories) for (const p of h.slice(-n)) peak = Math.max(peak, p.raw);
    const norm = (p) => (auto ? (peak > 0 ? p.raw / peak : 0) : p.max > p.min ? Math.min(1, Math.max(0, (p.raw - p.min) / (p.max - p.min))) : 0);
    histories.forEach((h, i) => {
      const pts = h.slice(-n);
      if (!pts.length) return;
      const color = skin.color(k, mt.type === 'histogram' ? (i === 0 ? 'PrimaryColor' : 'SecondaryColor') : i === 0 ? 'LineColor' : 'LineColor' + (i + 1), mt.type === 'histogram' ? [0, 128, 0, 255] : WHITE);
      const xAt = (j) => (fromLeft ? b.x + j : b.x + b.w - (pts.length - 1 - j));
      const yAt = (p) => (flip ? b.y + norm(p) * b.h : b.y + b.h - norm(p) * b.h);
      g.beginPath();
      pts.forEach((p, j) => (j ? g.lineTo(xAt(j), yAt(p)) : g.moveTo(xAt(j), yAt(p))));
      if (mt.type === 'histogram') {
        g.lineTo(xAt(pts.length - 1), flip ? b.y : b.y + b.h); g.lineTo(xAt(0), flip ? b.y : b.y + b.h); g.closePath();
        g.fillStyle = rgba(color); g.fill();
      } else { g.strokeStyle = rgba(color); g.lineWidth = skin.num(k, 'LineWidth', 1); g.lineJoin = 'round'; g.stroke(); }
    });
  }

  // Roundline: angles in radians, 0 at 3 o'clock, clockwise (like the canvas).
  function roundline(g, skin, mt, b) {
    const k = mt.key;
    const v = skin.meterValue(mt);
    const start = skin.num(k, 'StartAngle', 0), turn = skin.num(k, 'RotationAngle', Math.PI * 2);
    const len = skin.num(k, 'LineLength', Math.min(b.w, b.h) / 2), inner = skin.num(k, 'LineStart', 0);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const a = start + turn * v;
    const color = rgba(skin.color(k, 'LineColor', WHITE));
    if (skin.num(k, 'Solid', 0) === 1) {
      if (!v) return;
      g.beginPath();
      g.arc(cx, cy, len, start, a, turn < 0);
      g.arc(cx, cy, inner, a, start, turn >= 0);
      g.closePath();
      g.fillStyle = color; g.fill();
    } else {
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      g.strokeStyle = color; g.lineWidth = skin.num(k, 'LineWidth', 1); g.lineCap = 'round'; g.stroke();
    }
  }

  function rotator(g, skin, mt, b, img) {
    if (!img) return;
    const k = mt.key;
    const a = skin.num(k, 'StartAngle', 0) + skin.num(k, 'RotationAngle', Math.PI * 2) * skin.meterValue(mt);
    g.translate(b.x + b.w / 2, b.y + b.h / 2);
    g.rotate(a);
    g.drawImage(img, -skin.num(k, 'OffsetX', 0), -skin.num(k, 'OffsetY', 0));
  }

  function shapes(g, mt) {
    for (const s of mt.shapes || []) {
      g.save();
      g.translate(mt.box.x + (s.offset[0] || 0), mt.box.y + (s.offset[1] || 0));
      const [a = 0, b = 0, c = 0, d = 0, r = 0] = s.nums;
      // "Rotate <degrees>" turns the shape around its center.
      if (s.rotate) {
        const [cx, cy] = s.kind === 'rectangle' ? [a + c / 2, b + d / 2] : s.kind === 'ellipse' ? [a, b] : [(a + c) / 2, (b + d) / 2];
        g.translate(cx, cy); g.rotate((s.rotate * Math.PI) / 180); g.translate(-cx, -cy);
      }
      g.beginPath();
      if (s.kind === 'rectangle') { if (r && g.roundRect) g.roundRect(a, b, c, d, r); else g.rect(a, b, c, d); }
      else if (s.kind === 'ellipse') g.ellipse(a, b, Math.abs(c), Math.abs(s.nums.length > 3 ? d : c), 0, 0, Math.PI * 2);
      else if (s.kind === 'line' || s.kind === 'arc' || s.kind === 'curve') { g.moveTo(a, b); g.lineTo(c, d); }
      else { g.restore(); continue; }
      if (s.kind !== 'line' && s.kind !== 'arc' && s.kind !== 'curve' && s.fill[3] > 0) { g.fillStyle = rgba(s.fill); g.fill(); }
      if (s.strokeWidth > 0 && s.stroke[3] > 0) { g.strokeStyle = rgba(s.stroke); g.lineWidth = s.strokeWidth; g.stroke(); }
      g.restore();
    }
  }

  // Button and Bitmap meters show one frame of an image strip (side by side, or stacked if taller).
  function frames(g, mt, b, img, count, v) {
    if (!img) return;
    const across = img.naturalWidth >= img.naturalHeight;
    const fw = across ? img.naturalWidth / count : img.naturalWidth, fh = across ? img.naturalHeight : img.naturalHeight / count;
    const i = Math.min(count - 1, Math.max(0, Math.round(v * (count - 1))));
    g.drawImage(img, across ? fw * i : 0, across ? 0 : fh * i, fw, fh, b.x, b.y, b.w || fw, b.h || fh);
  }

  const api = { drawSkin };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RainmeterAddon = root.RainmeterAddon || {}).draw = api;
})(typeof window !== 'undefined' ? window : globalThis);
