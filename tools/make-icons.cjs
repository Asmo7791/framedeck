// Builds every icon file from the SVG masters in build/: npm run icons
// Electron renders the SVGs (so no extra image tools are needed); png2icons makes the .icns and .ico.
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const png2icons = require('png2icons');

const root = path.join(__dirname, '..');
const at = (...p) => path.join(root, ...p);

// Renders an SVG file to a 1024 x 1024 image with a transparent background.
async function render(svgFile) {
  const win = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true, frame: false, webPreferences: { offscreen: true } });
  const svg = fs.readFileSync(svgFile, 'utf8');
  const html = `<html><body style="margin:0;background:transparent">${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 300));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  win.destroy();
  return image.getSize().width === 1024 ? image : image.resize({ width: 1024, height: 1024, quality: 'best' });
}
// Each render closes its window; don't let that quit the app between renders.
app.on('window-all-closed', () => {});
const png = (image, size) => (size === 1024 ? image : image.resize({ width: size, height: size, quality: 'best' })).toPNG();

app.whenReady().then(async () => {
  const icon = await render(at('build', 'icon.svg'));
  const touch = await render(at('build', 'icon-touch.svg'));
  const big = png(icon, 1024);
  const out = {
    'build/icon.png': big,
    'build/icon.icns': png2icons.createICNS(big, png2icons.BICUBIC, 0),
    'build/icon.ico': png2icons.createICO(big, png2icons.BICUBIC, 0, false, true),
    'app/icon.png': big,
    'app/icon-512.png': png(icon, 512),
    'app/icon-192.png': png(icon, 192),
    'app/apple-touch-icon.png': png(touch, 180),
  };
  for (const [file, data] of Object.entries(out)) {
    if (!data) throw new Error('Could not make ' + file);
    fs.writeFileSync(at(file), data);
    console.log('wrote', file, data.length, 'bytes');
  }
  app.quit();
}).catch((err) => { console.error(err); app.exit(1); });
