import { ipcMain } from 'electron';
import { buildAudioUrl } from '../utils/spotifyLocalPath';

let MUSIC_DIR = '';
let BASE_URL = '';

export function registerPlayerIpc(musicDir: string, baseUrl: string): void {
  MUSIC_DIR = musicDir;
  BASE_URL = baseUrl;

  ipcMain.handle('player:getAudioUrl', (_evt, filePath: string) => {
    if (!filePath) return '';
    return buildAudioUrl(BASE_URL, filePath);
  });

  ipcMain.handle('player:getMusicDir', () => MUSIC_DIR);
}
