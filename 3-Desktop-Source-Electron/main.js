// DanaFox — Electron desktop shell
const { app, BrowserWindow, shell, Menu, nativeTheme } = require('electron');
const path = require('path');

// keep the progress saved by older versions (the app was called VajeYar before 3.4)
app.setPath('userData', path.join(app.getPath('appData'), 'VajeYar'));
app.setAppUserModelId('com.vajeyar.app');
if (!app.requestSingleInstanceLock()) { app.quit(); }

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 840, minWidth: 380, minHeight: 600,
    title: 'DanaFox', backgroundColor: nativeTheme.shouldUseDarkColors ? '#13111C' : '#F8F6FF',
    icon: path.join(__dirname, 'app', 'icons', 'icon-512.png'),
    autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
  // dev tools with F12 / zoom shortcuts
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12') win.webContents.toggleDevTools();
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.control && (input.key === '=' || input.key === '+')) win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5);
    if (input.control && input.key === '-') win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5);
    if (input.control && input.key === '0') win.webContents.setZoomLevel(0);
  });
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
