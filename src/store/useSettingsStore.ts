import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SpotLocalSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

interface SettingsState {
  settings: SpotLocalSettings;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  saveSettings: (patch: Partial<SpotLocalSettings>) => Promise<void>;
  syncToSpotify: (enable: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    settings: { ...DEFAULT_SETTINGS },
    isLoaded: false,

    loadSettings: async () => {
      try {
        const s = (await window.spotlocal.getSettings()) as SpotLocalSettings;
        set((d) => {
          d.settings = { ...DEFAULT_SETTINGS, ...s };
          d.isLoaded = true;
        });
      } catch (err) {
        console.error('[settings] load failed:', err);
        set((d) => { d.isLoaded = true; });
      }
    },

    saveSettings: async (patch) => {
      try {
        const updated = (await window.spotlocal.saveSettings(patch)) as SpotLocalSettings;
        set((s) => {
          s.settings = { ...s.settings, ...updated };
        });
      } catch (err) {
        console.error('[settings] save failed:', err);
      }
    },

    syncToSpotify: async (enable) => {
      try {
        await window.spotlocal.syncToSpotify(enable);
        set((s) => {
          s.settings.syncToSpotify = enable;
        });
      } catch (err) {
        console.error('[settings] sync failed:', err);
      }
    },
  }))
);
