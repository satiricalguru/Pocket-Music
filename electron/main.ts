import { app, BrowserWindow, ipcMain, shell, session, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// ESM compatibility: vite-plugin-electron outputs ESM format, so __dirname
// is not available natively. Derive it from import.meta.url.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { BackendManager } from './utils/backendManager';
import { detectPython } from './utils/detectPython';
import { detectFfmpeg } from './utils/detectFfmpeg';
import { registerLibraryIpc } from './ipc/library.ipc';
import { registerDownloaderIpc } from './ipc/downloader.ipc';
import { registerPlayerIpc } from './ipc/player.ipc';
import { registerSettingsIpc } from './ipc/settings.ipc';
import { registerSystemIpc } from './ipc/system.ipc';
import { registerDiscordIpc, stopDiscordBot } from './ipc/discord.ipc';

const backend = new BackendManager();
let mainWindow: BrowserWindow | null = null;

function getAppFolder(): string {
  if (app.isPackaged) {
    const exeDir = path.dirname(app.getPath('exe'));
    if (process.platform === 'darwin') {
      // exeDir is SpotLocal.app/Contents/MacOS, go up 3 levels to the folder containing SpotLocal.app
      return path.resolve(exeDir, '../../..');
    }
    return exeDir;
  } else {
    return app.getAppPath();
  }
}

const MUSIC_DIR = app.isPackaged
  ? path.join(app.getPath('music'), 'Pocket Music')
  : path.join(getAppFolder(), 'music');

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

async function createWindow(): Promise<void> {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#000000',
    show: false,
    icon: path.join(__dirname, '../resources/icon.png'),
    // macOS: keep native traffic lights, translucent sidebar
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          vibrancy: 'under-window' as const,
          visualEffectState: 'active' as const,
          trafficLightPosition: { x: 16, y: 16 },
        }
      : {}),
    // Windows: frameless, custom titlebar rendered in React
    ...(isWin
      ? {
          frame: false,
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // required for http://localhost:7842 audio src
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load dev server or built file
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Prevent the webview from navigating away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    if (!allowed) {
      event.preventDefault();
    }
  });

  // Open external links (e.g. "Open in Spotify") in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function ensureMacOsEnvPath(): void {
  if (process.platform !== 'darwin') return;
  const paths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/opt/local/bin',
    '/Library/Frameworks/Python.framework/Versions/3.14/bin',
    '/Library/Frameworks/Python.framework/Versions/3.13/bin',
    '/Library/Frameworks/Python.framework/Versions/3.12/bin',
    '/Library/Frameworks/Python.framework/Versions/3.11/bin',
    '/Library/Frameworks/Python.framework/Versions/Current/bin',
  ];
  const currentPath = process.env.PATH || '';
  const newPaths = paths.filter((p) => fs.existsSync(p) && !currentPath.includes(p));
  if (newPaths.length > 0) {
    process.env.PATH = `${newPaths.join(path.delimiter)}${path.delimiter}${currentPath}`;
  }
}

app.whenReady().then(async () => {
  ensureMacOsEnvPath();
  // Set dock icon on macOS in development or runtime
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, '../resources/icon.png');
    if (fs.existsSync(iconPath)) {
      try {
        app.dock.setIcon(nativeImage.createFromPath(iconPath));
      } catch (err) {
        console.error('[spotlocal] Failed to set dock icon:', err);
      }
    }
  }

  // Single-instance lock — quit if another instance is already running
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // Detect Python (non-fatal: renderer will show install dialog if missing)
  let pythonBin = 'python3';
  try {
    pythonBin = await detectPython();
  } catch (err) {
    console.error('[spotlocal] Python detection failed:', err);
  }

  const hasFfmpeg = await detectFfmpeg();

  // Register all IPC handlers before the window loads so the renderer
  // can issue calls as soon as it mounts.
  registerLibraryIpc(MUSIC_DIR);
  registerDownloaderIpc(getMainWindow, MUSIC_DIR, backend.baseUrl);
  registerPlayerIpc(MUSIC_DIR, backend.baseUrl);
  registerSettingsIpc(MUSIC_DIR);
  registerSystemIpc(MUSIC_DIR);
  registerDiscordIpc(getMainWindow);

  // Window controls (Windows only, but harmless elsewhere)
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    }
    mainWindow.maximize();
    return true;
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

  await createWindow();

  // Tell the renderer we're starting the backend, then spawn it.
  mainWindow!.webContents.send('app:loading', { message: 'Starting backend…' });
  try {
    await backend.start(pythonBin, MUSIC_DIR);
    mainWindow!.webContents.send('app:ready', { hasFfmpeg, pythonBin, baseUrl: backend.baseUrl });
  } catch (err) {
    mainWindow!.webContents.send('app:error', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  backend.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  backend.stop();
  void stopDiscordBot();
});
