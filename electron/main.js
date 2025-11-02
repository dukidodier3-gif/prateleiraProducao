// Processo principal do Electron
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function startBackendIfNeeded() {
  try {
    if (!isDev) {
      // Em produção, inicia o backend compilado (backend/dist/index.js)
      require(path.join(__dirname, '..', 'backend', 'dist', 'index.js'));
    } else {
      // Em desenvolvimento, o backend é iniciado via script (ts-node)
    }
  } catch (err) {
    console.error('Falha ao iniciar backend:', err);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Carrega build do Vite
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  startBackendIfNeeded();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
