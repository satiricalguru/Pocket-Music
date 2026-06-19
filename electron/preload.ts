import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * The full typed IPC surface exposed to the renderer under `window.spotlocal`.
 * Keep this in sync with the handlers registered in electron/ipc/*.ts.
 */
const api = {
  // === Library ===
  getTracks: () => ipcRenderer.invoke('library:getTracks'),
  getTrack: (id: string) => ipcRenderer.invoke('library:getTrack', id),
  getAlbums: () => ipcRenderer.invoke('library:getAlbums'),
  getPlaylists: () => ipcRenderer.invoke('library:getPlaylists'),
  getPlaylistTracks: (id: string) => ipcRenderer.invoke('library:getPlaylistTracks', id),
  searchLibrary: (q: string) => ipcRenderer.invoke('library:search', q),
  deleteTrack: (id: string) => ipcRenderer.invoke('library:deleteTrack', id),
  likeTrack: (id: string, liked: boolean) => ipcRenderer.invoke('library:likeTrack', id, liked),
  updateTrack: (id: string, patch: unknown) =>
    ipcRenderer.invoke('library:updateTrack', id, patch),
  incrementPlayCount: (id: string) => ipcRenderer.invoke('library:incrementPlayCount', id),
  createPlaylist: (name: string) => ipcRenderer.invoke('library:createPlaylist', name),
  deletePlaylist: (id: string) => ipcRenderer.invoke('library:deletePlaylist', id),
  renamePlaylist: (id: string, name: string) =>
    ipcRenderer.invoke('library:renamePlaylist', id, name),
  addTrackToPlaylist: (trackId: string, playlistId: string) =>
    ipcRenderer.invoke('library:addToPlaylist', trackId, playlistId),
  removeTrackFromPlaylist: (trackId: string, playlistId: string) =>
    ipcRenderer.invoke('library:removeFromPlaylist', trackId, playlistId),
  reorderPlaylistTracks: (playlistId: string, startIndex: number, endIndex: number) =>
    ipcRenderer.invoke('library:reorderPlaylistTracks', playlistId, startIndex, endIndex),

  // === Downloads ===
  previewUrl: (url: string) => ipcRenderer.invoke('download:preview', url),
  startDownload: (url: string, playlistName?: string) => ipcRenderer.invoke('download:start', url, playlistName),
  observeDownload: (jobId: string) => ipcRenderer.invoke('download:observe', jobId),
  cancelDownload: (jobId: string) => ipcRenderer.invoke('download:cancel', jobId),
  onDownloadEvent: (cb: (data: unknown) => void) => {
    const handler = (_: IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on('download:event', handler);
    return () => {
      ipcRenderer.removeListener('download:event', handler);
    };
  },

  // === Player ===
  getAudioUrl: (filePath: string) => ipcRenderer.invoke('player:getAudioUrl', filePath),
  getMusicDir: () => ipcRenderer.invoke('player:getMusicDir'),

  // === Settings ===
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('settings:save', s),
  syncToSpotify: (enable: boolean) => ipcRenderer.invoke('settings:syncSpotify', enable),
  syncAllNow: () => ipcRenderer.invoke('settings:syncAllNow'),

  // === System ===
  showInFolder: (p: string) => ipcRenderer.invoke('system:showInFolder', p),
  openFolder: (p: string) => ipcRenderer.invoke('system:openFolder', p),
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  getPlatform: () => process.platform as any,

  // === App lifecycle events ===
  onAppReady: (cb: (d: unknown) => void) => {
    const handler = (_: IpcRendererEvent, d: unknown) => cb(d);
    ipcRenderer.on('app:ready', handler);
    return () => { ipcRenderer.removeListener('app:ready', handler); };
  },
  onAppLoading: (cb: (d: unknown) => void) => {
    const handler = (_: IpcRendererEvent, d: unknown) => cb(d);
    ipcRenderer.on('app:loading', handler);
    return () => { ipcRenderer.removeListener('app:loading', handler); };
  },
  onAppError: (cb: (d: unknown) => void) => {
    const handler = (_: IpcRendererEvent, d: unknown) => cb(d);
    ipcRenderer.on('app:error', handler);
    return () => { ipcRenderer.removeListener('app:error', handler); };
  },

  // === Window controls (Windows only) ===
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // === Discord bot ===
  discordGetStatus: () => ipcRenderer.invoke('discord:getStatus'),
  discordStartBot: (token: string) => ipcRenderer.invoke('discord:startBot', token),
  discordStopBot: () => ipcRenderer.invoke('discord:stopBot'),
  discordNotifyTrackChange: (filePath: string, seekSeconds: number, isPlaying: boolean) =>
    ipcRenderer.invoke('discord:notifyTrackChange', filePath, seekSeconds, isPlaying),
  discordNotifySeek: (seekSeconds: number, isPlaying: boolean) => ipcRenderer.invoke('discord:notifySeek', seekSeconds, isPlaying),
  discordNotifyPause: () => ipcRenderer.invoke('discord:notifyPause'),
  discordNotifyResume: () => ipcRenderer.invoke('discord:notifyResume'),
  discordDisconnect: () => ipcRenderer.invoke('discord:disconnect'),
  onDiscordStatusUpdate: (cb: (state: unknown) => void) => {
    const handler = (_: IpcRendererEvent, state: unknown) => cb(state);
    ipcRenderer.on('discord:statusUpdate', handler);
    return () => { ipcRenderer.removeListener('discord:statusUpdate', handler); };
  },
};

contextBridge.exposeInMainWorld('spotlocal', api);

export type SpotLocalApi = typeof api;
