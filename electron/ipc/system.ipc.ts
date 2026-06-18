import { ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let MUSIC_DIR = '';

export function registerSystemIpc(_musicDir?: string): void {
  if (_musicDir) MUSIC_DIR = _musicDir;

  ipcMain.handle('system:showInFolder', (_evt, p: string) => {
    const target = path.isAbsolute(p) ? p : path.join(MUSIC_DIR, p);
    if (!fs.existsSync(target)) {
      // Fall back to containing folder
      const dir = path.dirname(target);
      if (fs.existsSync(dir)) {
        shell.openPath(dir);
      }
      return false;
    }
    shell.showItemInFolder(target);
    return true;
  });

  ipcMain.handle('system:openFolder', (_evt, p: string) => {
    const target = p || MUSIC_DIR;
    if (fs.existsSync(target)) {
      void shell.openPath(target);
      return true;
    }
    fs.mkdirSync(target, { recursive: true });
    void shell.openPath(target);
    return true;
  });

  ipcMain.handle('system:openExternal', (_evt, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      void shell.openExternal(url);
      return true;
    }
    return false;
  });
}
