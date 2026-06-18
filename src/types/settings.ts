export type AudioQuality = '128k' | '256k' | '320k';

export interface SpotLocalSettings {
  musicDir: string;
  audioQuality: AudioQuality;
  syncToSpotify: boolean;
  spotifyLocalFilesPath: string;
  theme: 'dark';
  closeToTray: boolean;
  hwAcceleration: boolean;
  launchAtLogin: boolean;
}

export const DEFAULT_SETTINGS: SpotLocalSettings = {
  musicDir: '',
  audioQuality: '320k',
  syncToSpotify: false,
  spotifyLocalFilesPath: '',
  theme: 'dark',
  closeToTray: false,
  hwAcceleration: true,
  launchAtLogin: false,
};
