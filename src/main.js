'use strict';
const { app, BrowserWindow, screen: electronScreen, shell, Menu, dialog } = require('electron');
const path = require('path');
const { createServer } = require('./server');

app.setName('FrameDeck');
if (process.platform === 'win32') app.setAppUserModelId('com.kaitungyu.framedeck');
const WINDOW_ICON = process.platform === 'darwin' ? undefined : path.join(__dirname, '..', 'app', 'icon.png');
if (!app.requestSingleInstanceLock()) app.quit();

let server;
let editorWin = null;
const displayWins = new Map(); // key -> { win, screenId, displayId, mode }

function baseUrl() { return `http://127.0.0.1:${server.port}`; }

function listDisplays() {
  const primary = electronScreen.getPrimaryDisplay().id;
  return {
    displays: electronScreen.getAllDisplays().map((d, i) => {
      // macOS reports a scaled size (e.g. 1512 x 982 on a 14" MacBook Pro). The panel's
      // real resolution is that times the scale factor (3024 x 1964).
      const rotated = d.rotation === 90 || d.rotation === 270;
      return {
        id: String(d.id),
        label: d.label || (d.internal ? 'Built-in display' : `Display ${i + 1}`),
        w: Math.round(d.size.width * d.scaleFactor),
        h: Math.round(d.size.height * d.scaleFactor),
        looksLikeW: d.size.width,
        looksLikeH: d.size.height,
        scale: d.scaleFactor,
        hz: Math.round(d.displayFrequency || 0) || null,
        rotation: d.rotation || 0,
        portrait: rotated || d.size.height > d.size.width,
        internal: !!d.internal,
        primary: d.id === primary,
      };
    }),
    open: [...displayWins.entries()].map(([key, v]) => ({ key, screenId: v.screenId, displayId: v.displayId, mode: v.mode })),
  };
}

function rememberOpenDisplays() {
  const cfg = server.config;
  cfg.session = cfg.session || {};
  cfg.session.openDisplays = [...displayWins.values()].map((v) => ({ screenId: v.screenId, displayId: v.displayId, mode: v.mode }));
  server.save();
}

function openDisplay({ screenId, displayId, mode = 'fullscreen' }) {
  const target = electronScreen.getAllDisplays().find((d) => String(d.id) === String(displayId))
    || electronScreen.getPrimaryDisplay();
  const scr = server.config.screens.find((s) => s.id === screenId);
  if (!scr) throw Object.assign(new Error('Unknown screen'), { status: 404 });

  // One display window per (screen, monitor) pair; reopening focuses it.
  const key = `${screenId}@${target.id}:${mode}`;
  const existing = displayWins.get(key);
  if (existing && !existing.win.isDestroyed()) { existing.win.focus(); return { key }; }

  const wa = target.workArea;
  let width = Math.min(scr.profile.w, Math.round(wa.width * 0.6));
  let height = Math.round(width * scr.profile.h / scr.profile.w);
  if (height > wa.height * 0.8) { height = Math.round(wa.height * 0.8); width = Math.round(height * scr.profile.w / scr.profile.h); }

  const win = new BrowserWindow({
    x: mode === 'fullscreen' ? target.bounds.x : wa.x + Math.round((wa.width - width) / 2),
    y: mode === 'fullscreen' ? target.bounds.y : wa.y + Math.round((wa.height - height) / 2),
    width, height,
    backgroundColor: '#000000',
    icon: WINDOW_ICON,
    title: `${scr.name} — FrameDeck`,
    fullscreen: mode === 'fullscreen',
    fullscreenable: true,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  if (mode === 'window') win.setAspectRatio(scr.profile.w / scr.profile.h);
  win.loadURL(`${baseUrl()}/display.html?screen=${encodeURIComponent(screenId)}&app=1`);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') { e.preventDefault(); win.close(); }
  });
  displayWins.set(key, { win, screenId, displayId: String(target.id), mode });
  win.on('closed', () => {
    displayWins.delete(key);
    if (!quitting) rememberOpenDisplays();
    server.broadcast('displays', {});
  });
  rememberOpenDisplays();
  server.broadcast('displays', {});
  return { key };
}

function closeDisplay({ key, screenId }) {
  for (const [k, v] of displayWins) {
    if ((key && k === key) || (screenId && v.screenId === screenId)) v.win.close();
  }
  return { ok: true };
}

function openEditor() {
  if (editorWin && !editorWin.isDestroyed()) { editorWin.show(); editorWin.focus(); return; }
  editorWin = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1040, minHeight: 640,
    title: 'FrameDeck',
    icon: WINDOW_ICON,
    backgroundColor: '#0b0d11',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  editorWin.loadURL(`${baseUrl()}/editor.html`);
  editorWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(baseUrl()) && url.includes('display.html')) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 960, height: 600, autoHideMenuBar: true } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  editorWin.on('closed', () => { editorWin = null; });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Show Editor', accelerator: 'CmdOrCtrl+1', click: openEditor },
        { label: 'Close All Displays', accelerator: 'CmdOrCtrl+Shift+W', click: () => { for (const v of displayWins.values()) v.win.close(); } },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Inspired by EpaperSystem', click: () => shell.openExternal('https://github.com/Feeengyuuu/EpaperSystem') },
        { label: 'Open Data Folder', click: () => shell.openPath(app.getPath('userData')) },
        { label: 'FrameDeck Guides', click: () => { openEditor(); if (editorWin) editorWin.webContents.executeJavaScript("document.querySelector('#guidesBtn') && document.querySelector('#guidesBtn').click()").catch(() => {}); } },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let quitting = false;
app.on('before-quit', () => { quitting = true; });
app.on('second-instance', openEditor);
app.on('activate', openEditor);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

app.whenReady().then(async () => {
  server = createServer({
    dataDir: app.getPath('userData'),
    staticDir: path.join(__dirname, '..', 'app'),
    hooks: {
      version: app.getVersion(),
      listDisplays,
      openDisplay,
      closeDisplay,
      // Linux has no standard login-item API in Electron, so the setting is hidden there.
      getLoginItem: () => (process.platform === 'linux' ? null : app.getLoginItemSettings().openAtLogin),
      setLoginItem: (enabled) => { app.setLoginItemSettings({ openAtLogin: enabled, args: process.platform === 'win32' ? ['--hidden'] : [] }); return { enabled }; },
    },
  });
  try {
    await server.listen();
  } catch (err) {
    dialog.showErrorBox('FrameDeck could not start', String(err && err.message || err));
    app.quit();
    return;
  }
  buildMenu();

  // Reopen the displays that were running last time, so it works like a picture frame.
  const restore = (server.config.session && server.config.session.openDisplays) || [];
  const opened = [];
  for (const d of restore) {
    try { openDisplay(d); opened.push(d); } catch { /* screen was deleted */ }
  }
  const launchedHidden = process.platform === 'darwin' ? app.getLoginItemSettings().wasOpenedAtLogin : process.argv.includes('--hidden');
  if (!(launchedHidden && opened.length)) openEditor();

  electronScreen.on('display-added', () => server.broadcast('displays', {}));
  electronScreen.on('display-removed', () => server.broadcast('displays', {}));
});
