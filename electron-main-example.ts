// @ts-nocheck
// Configuração básica do processo principal do Electron
// Salve como src/electron/main.ts

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Carregar a aplicação
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers para comunicação com o renderer
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});