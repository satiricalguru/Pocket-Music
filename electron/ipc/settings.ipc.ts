import { ipcMain, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, type SpotLocalSettings } from '../../src/types';
import { getSpotifyLocalFilesPath } from '../utils/spotifyLocalPath';
import { syncAllTracksToSpotify } from './library.ipc';

const SETTINGS_FILE = () => {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'settings.json');
  } else {
    return path.join(app.getAppPath(), 'settings.json');
  }
};

let MUSIC_DIR = '';
let cached: SpotLocalSettings | null = null;

export function getSettings(): SpotLocalSettings {
  if (cached) return cached;
  try {
    if (fs.existsSync(SETTINGS_FILE())) {
      const raw = fs.readFileSync(SETTINGS_FILE(), 'utf8');
      const parsed = JSON.parse(raw) as Partial<SpotLocalSettings>;
      cached = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      cached = { ...DEFAULT_SETTINGS };
    }
  } catch (err) {
    console.error('[settings] failed to read, using defaults:', err);
    cached = { ...DEFAULT_SETTINGS };
  }
  // Ensure derived defaults are populated
  if (!cached.musicDir) cached.musicDir = MUSIC_DIR;
  if (!cached.spotifyLocalFilesPath) {
    cached.spotifyLocalFilesPath = getSpotifyLocalFilesPath();
  }
  return cached;
}

export function setSettingsPartial(patch: Partial<SpotLocalSettings>): SpotLocalSettings {
  const current = getSettings();
  cached = { ...current, ...patch };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE()), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(cached, null, 2), 'utf8');
  } catch (err) {
    console.error('[settings] failed to save:', err);
  }
  return cached;
}

export function registerSettingsIpc(musicDir: string): void {
  MUSIC_DIR = musicDir;

  ipcMain.handle('settings:get', () => getSettings());

  ipcMain.handle('settings:save', (_evt, patch: Partial<SpotLocalSettings>) =>
    setSettingsPartial(patch)
  );

  ipcMain.handle('settings:syncSpotify', (_evt, enable: boolean) => {
    const before = getSettings();
    setSettingsPartial({
      syncToSpotify: enable,
      spotifyLocalFilesPath: before.spotifyLocalFilesPath || getSpotifyLocalFilesPath(),
    });
    if (enable) {
      const count = syncAllTracksToSpotify();
      return { enabled: true, synced: count };
    }
    return { enabled: false, synced: 0 };
  });

  ipcMain.handle('settings:syncAllNow', () => {
    const settings = getSettings();
    if (!settings.syncToSpotify) {
      setSettingsPartial({ syncToSpotify: true });
    }
    return { synced: syncAllTracksToSpotify() };
  });
}
