const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
function create() {
  const w = new BrowserWindow({ width: 460, height: 860, minWidth: 380, minHeight: 600, title: 'تقویم · Taqweem', backgroundColor: '#0E2523', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true, webPreferences: { autoplayPolicy: 'no-user-gesture-required', contextIsolation: true } });
  Menu.setApplicationMenu(null);
  w.loadFile(path.join(__dirname, 'app', 'index.html'));
  w.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
