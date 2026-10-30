'use strict';
const { app, BrowserWindow, screen: electronScreen, shell, Menu, dialog, session } = require('electron');
const path = require('path');
const { createServer } = require('./server');
const { loadAddons } = require('./addons');

app.setName('FrameDeck');
if (process.platform === 'win32') app.setAppUserModelId('com.kaitungyu.framedeck');
const WINDOW_ICON = process.platform === 'darwin' ? undefined : path.join(__dirname, '..', 'app', 'icon.png');
if (!app.requestSingleInstanceLock()) app.quit();

let server;
let editorWin = null;
const displayWins = new Map(); // key -> { win, screenId, displayId, mode }

function baseUrl() { return `http://127.0.0.1:${server.port}`; }

// Links from widgets (a news feed's "Open article", say) come from the internet. Only web and
// mail links go to the system; anything else (file:, app schemes...) could start a program.
function openSafe(url) {
  try { if (['http:', 'https:', 'mailto:'].includes(new URL(url).protocol)) shell.openExternal(url); } catch { /* not a URL */ }
}
const isOwnPage = (url) => { try { return new URL(url).origin === new URL(baseUrl()).origin; } catch { return false; } };

// Every window: stays on FrameDeck's own pages, opens other links in the browser, no <webview>.
app.on('web-contents-created', (e, contents) => {
  contents.on('will-navigate', (ev, url) => { if (!isOwnPage(url)) { ev.preventDefault(); openSafe(url); } });
  contents.on('will-attach-webview', (ev) => ev.preventDefault());
});

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
  win.webContents.setWindowOpenHandler(({ url }) => { openSafe(url); return { action: 'deny' }; });
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
    if (isOwnPage(url) && new URL(url).pathname === '/display.html') {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 960, height: 600, autoHideMenuBar: true } };
    }
    openSafe(url);
    return { action: 'deny' };
  });
  editorWin.on('closed', () => { editorWin = null; });
}

// Menu text for the interface languages (the editor's own text lives in app/i18n/).
const MENU_TEXT = {
  'zh-Hans': {
    File: '文件', Edit: '编辑', View: '显示', Window: '窗口', Help: '帮助',
    'About FrameDeck': '关于 FrameDeck', 'Hide FrameDeck': '隐藏 FrameDeck', 'Hide Others': '隐藏其他', 'Show All': '全部显示', 'Quit FrameDeck': '退出 FrameDeck',
    Undo: '撤销', Redo: '重做', Cut: '剪切', Copy: '复制', Paste: '粘贴', 'Select All': '全选', Close: '关闭', Minimize: '最小化', Zoom: '缩放',
    'Show Editor': '显示编辑器', 'Close All Displays': '关闭所有显示', Reload: '重新加载', 'Toggle Developer Tools': '开发者工具', 'Toggle Full Screen': '切换全屏',
    'Inspired by EpaperSystem': '灵感来自 EpaperSystem', 'Open Data Folder': '打开数据文件夹', 'FrameDeck Guides': 'FrameDeck 使用指南',
  },
  'zh-Hant': {
    File: '檔案', Edit: '編輯', View: '顯示', Window: '視窗', Help: '說明',
    'About FrameDeck': '關於 FrameDeck', 'Hide FrameDeck': '隱藏 FrameDeck', 'Hide Others': '隱藏其他', 'Show All': '全部顯示', 'Quit FrameDeck': '結束 FrameDeck',
    Undo: '還原', Redo: '重做', Cut: '剪下', Copy: '拷貝', Paste: '貼上', 'Select All': '全選', Close: '關閉', Minimize: '最小化', Zoom: '縮放',
    'Show Editor': '顯示編輯器', 'Close All Displays': '關閉所有顯示', Reload: '重新載入', 'Toggle Developer Tools': '開發者工具', 'Toggle Full Screen': '切換全螢幕',
    'Inspired by EpaperSystem': '靈感來自 EpaperSystem', 'Open Data Folder': '打開資料夾', 'FrameDeck Guides': 'FrameDeck 使用指南',
  },
};

let menuLanguage = null;
function buildMenu(language = 'en') {
  if (language === menuLanguage) return;
  menuLanguage = language;
  const t = (text) => (MENU_TEXT[language] || {})[text] || text;
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'FrameDeck',
      submenu: [
        { role: 'about', label: t('About FrameDeck') }, { type: 'separator' },
        { role: 'hide', label: t('Hide FrameDeck') }, { role: 'hideOthers', label: t('Hide Others') }, { role: 'unhide', label: t('Show All') },
        { type: 'separator' }, { role: 'quit', label: t('Quit FrameDeck') },
      ],
    }] : []),
    { label: t('File'), submenu: [isMac ? { role: 'close', label: t('Close') } : { role: 'quit', label: t('Quit FrameDeck') }] },
    {
      label: t('Edit'),
      submenu: [
        { role: 'undo', label: t('Undo') }, { role: 'redo', label: t('Redo') }, { type: 'separator' },
        { role: 'cut', label: t('Cut') }, { role: 'copy', label: t('Copy') }, { role: 'paste', label: t('Paste') }, { role: 'selectAll', label: t('Select All') },
      ],
    },
    {
      label: t('View'),
      submenu: [
        { label: t('Show Editor'), accelerator: 'CmdOrCtrl+1', click: openEditor },
        { label: t('Close All Displays'), accelerator: 'CmdOrCtrl+Shift+W', click: () => { for (const v of displayWins.values()) v.win.close(); } },
        { type: 'separator' },
        { role: 'reload', label: t('Reload') },
        { role: 'toggleDevTools', label: t('Toggle Developer Tools') },
        { role: 'togglefullscreen', label: t('Toggle Full Screen') },
      ],
    },
    { role: 'window', label: t('Window'), submenu: [{ role: 'minimize', label: t('Minimize') }, { role: 'zoom', label: t('Zoom') }, ...(isMac ? [] : [{ role: 'close', label: t('Close') }])] },
    {
      role: 'help',
      label: t('Help'),
      submenu: [
        { label: t('Inspired by EpaperSystem'), click: () => shell.openExternal('https://github.com/Feeengyuuu/EpaperSystem') },
        { label: t('Open Data Folder'), click: () => shell.openPath(app.getPath('userData')) },
        { label: t('FrameDeck Guides'), click: () => { openEditor(); if (editorWin) editorWin.webContents.executeJavaScript("document.querySelector('#guidesBtn') && document.querySelector('#guidesBtn').click()").catch(() => {}); } },
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
  // Web pages shown in widgets get no camera, microphone, location, notifications...
  // Electron would otherwise allow every request. Fullscreen is all FrameDeck itself uses.
  // Settings → Advanced protection can allow camera, microphone, location and notifications.
  const allowed = new Set(['fullscreen', 'clipboard-sanitized-write']);
  const relaxed = new Set(['media', 'geolocation', 'notifications']);
  const permitted = (p) => allowed.has(p) || (relaxed.has(p) && !!(server && (server.config.security || {}).webPermissions));
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permitted(permission)));
  session.defaultSession.setPermissionCheckHandler((wc, permission) => permitted(permission));

  server = createServer({
    dataDir: app.getPath('userData'),
    staticDir: path.join(__dirname, '..', 'app'),
    addons: loadAddons(path.join(__dirname, '..')),
    hooks: {
      version: app.getVersion(),
      listDisplays,
      openDisplay,
      closeDisplay,
      // Linux has no standard login-item API in Electron, so the setting is hidden there.
      getLoginItem: () => (process.platform === 'linux' ? null : app.getLoginItemSettings().openAtLogin),
      onConfigChanged: (config) => buildMenu(config.language),
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
  buildMenu(server.config.language);

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
