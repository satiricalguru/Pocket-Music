import type { SpotLocalApi } from '../electron/preload';

// Check if we are running in an environment without Electron
if (typeof window !== 'undefined' && !window.spotlocal) {
  const mockListeners = {
    downloadEvent: [] as ((data: unknown) => void)[],
    appReady: [] as ((data: unknown) => void)[],
    appLoading: [] as ((data: unknown) => void)[],
    appError: [] as ((data: unknown) => void)[],
    discordStatus: [] as ((data: unknown) => void)[],
  };

  // Helper to get from / save to localStorage
  const getStorage = <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`spotlocal:${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveStorage = <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`spotlocal:${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  };

  // Default mock tracks
  const defaultTracks = [
    {
      id: 'mock-1',
      title: 'Pocket Music Welcome Song',
      artist: 'Pocket Music Team',
      album: 'Pocket Music Album',
      album_artist: 'Pocket Music Team',
      duration: 231,
      file_path: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      liked: 1,
      added_at: new Date().toISOString(),
      track_number: 1,
      cover_art_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
      id: 'mock-2',
      title: 'Acoustic Chill Beats',
      artist: 'Lofi Generator',
      album: 'Chill Instrumental',
      album_artist: 'Lofi Generator',
      duration: 172,
      file_path: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      liked: 0,
      added_at: new Date().toISOString(),
      track_number: 2,
      cover_art_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    }
  ];

  const defaultSettings = {
    musicDir: 'Music',
    spotifyEnabled: false,
    spotifyConnected: false,
    theme: 'dark',
  };

  const api: SpotLocalApi = {
    getTracks: async () => getStorage('tracks', defaultTracks),
    getTrack: async (id) => {
      const tracks = getStorage('tracks', defaultTracks);
      return tracks.find((t) => t.id === id);
    },
    getAlbums: async () => {
      const tracks = getStorage('tracks', defaultTracks);
      // Group unique albums
      const map = new Map<string, any>();
      for (const t of tracks) {
        const key = `${t.album ?? ''}-${t.album_artist ?? t.artist}`;
        if (!map.has(key)) {
          map.set(key, {
            name: t.album ?? 'Unknown Album',
            artist: t.album_artist ?? t.artist,
            cover_art_url: t.cover_art_url || '',
            tracks_count: 0,
          });
        }
        map.get(key).tracks_count += 1;
      }
      return Array.from(map.values());
    },
    getPlaylists: async () => getStorage('playlists', []),
    getPlaylistTracks: async (id) => {
      const playlists = getStorage('playlists', [] as any[]);
      const pl = playlists.find((p) => p.id === id);
      if (!pl) return [];
      const tracks = getStorage('tracks', defaultTracks);
      const trackIds = pl.track_ids || [];
      return tracks.filter((t) => trackIds.includes(t.id));
    },
    searchLibrary: async (q) => {
      const tracks = getStorage('tracks', defaultTracks);
      const query = q.toLowerCase();
      return tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          (t.album ?? '').toLowerCase().includes(query)
      );
    },
    deleteTrack: async (id) => {
      const tracks = getStorage('tracks', defaultTracks);
      const filtered = tracks.filter((t) => t.id !== id);
      saveStorage('tracks', filtered);
    },
    likeTrack: async (id, liked) => {
      const tracks = getStorage('tracks', defaultTracks);
      const idx = tracks.findIndex((t) => t.id === id);
      if (idx >= 0) {
        tracks[idx].liked = liked ? 1 : 0;
        saveStorage('tracks', tracks);
        return tracks[idx];
      }
      throw new Error('Track not found');
    },
    updateTrack: async (id, patch: any) => {
      const tracks = getStorage('tracks', defaultTracks);
      const idx = tracks.findIndex((t) => t.id === id);
      if (idx >= 0) {
        tracks[idx] = { ...tracks[idx], ...patch };
        saveStorage('tracks', tracks);
        return tracks[idx];
      }
      throw new Error('Track not found');
    },
    incrementPlayCount: async () => {},
    createPlaylist: async (name) => {
      const playlists = getStorage('playlists', [] as any[]);
      const newPl = {
        id: `playlist-${Date.now()}`,
        name,
        tracks_count: 0,
        track_ids: [] as string[],
      };
      playlists.push(newPl);
      saveStorage('playlists', playlists);
      return newPl;
    },
    deletePlaylist: async (id) => {
      const playlists = getStorage('playlists', [] as any[]);
      const filtered = playlists.filter((p) => p.id !== id);
      saveStorage('playlists', filtered);
    },
    renamePlaylist: async (id, name) => {
      const playlists = getStorage('playlists', [] as any[]);
      const idx = playlists.findIndex((p) => p.id === id);
      if (idx >= 0) {
        playlists[idx].name = name;
        saveStorage('playlists', playlists);
        return playlists[idx];
      }
      throw new Error('Playlist not found');
    },
    addTrackToPlaylist: async (trackId, playlistId) => {
      const playlists = getStorage('playlists', [] as any[]);
      const idx = playlists.findIndex((p) => p.id === playlistId);
      if (idx >= 0) {
        if (!playlists[idx].track_ids) {
          playlists[idx].track_ids = [];
        }
        if (!playlists[idx].track_ids.includes(trackId)) {
          playlists[idx].track_ids.push(trackId);
          playlists[idx].tracks_count = playlists[idx].track_ids.length;
          saveStorage('playlists', playlists);
        }
      }
    },
    removeTrackFromPlaylist: async (trackId, playlistId) => {
      const playlists = getStorage('playlists', [] as any[]);
      const idx = playlists.findIndex((p) => p.id === playlistId);
      if (idx >= 0 && playlists[idx].track_ids) {
        playlists[idx].track_ids = playlists[idx].track_ids.filter((tid: string) => tid !== trackId);
        playlists[idx].tracks_count = playlists[idx].track_ids.length;
        saveStorage('playlists', playlists);
      }
    },
    reorderPlaylistTracks: async (playlistId, startIndex, endIndex) => {
      const playlists = getStorage('playlists', [] as any[]);
      const idx = playlists.findIndex((p) => p.id === playlistId);
      if (idx >= 0 && playlists[idx].track_ids) {
        const ids = [...playlists[idx].track_ids];
        const [removed] = ids.splice(startIndex, 1);
        ids.splice(endIndex, 0, removed);
        playlists[idx].track_ids = ids;
        saveStorage('playlists', playlists);
        return true;
      }
      return false;
    },
    previewUrl: async () => {
      return { title: 'Mock Download Track', artist: 'Mock Downloader', duration: 200, thumbnail: '' };
    },
    startDownload: async (url, playlistName) => {
      const jobId = `job-${Date.now()}`;
      setTimeout(() => {
        // Add downloaded track to library
        const tracks = getStorage('tracks', defaultTracks);
        const newTrack = {
          id: `track-${Date.now()}`,
          title: 'Downloaded Track',
          artist: 'Online Source',
          album: playlistName || 'Downloads',
          album_artist: 'Online Source',
          duration: 200,
          file_path: url, // Or a mock audio path
          liked: 0,
          added_at: new Date().toISOString(),
          track_number: tracks.length + 1,
          cover_art_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
        };
        tracks.push(newTrack);
        saveStorage('tracks', tracks);

        // Notify download listeners
        mockListeners.downloadEvent.forEach((cb) =>
          cb({ job_id: jobId, status: 'completed', track: newTrack })
        );
      }, 3000);
      return { job_id: jobId };
    },
    observeDownload: async () => {},
    cancelDownload: async () => {},
    onDownloadEvent: (cb) => {
      mockListeners.downloadEvent.push(cb);
      return () => {
        mockListeners.downloadEvent = mockListeners.downloadEvent.filter((c) => c !== cb);
      };
    },
    getAudioUrl: async (filePath) => {
      // If filePath is a normal URL, return it
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
      }
      // Otherwise, return a public test MP3 to avoid breaking the player
      return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    },
    getMusicDir: async () => 'Music',
    getSettings: async () => getStorage('settings', defaultSettings),
    saveSettings: async (s) => {
      const current = getStorage('settings', defaultSettings);
      const updated = { ...current, ...(s as any) };
      saveStorage('settings', updated);
      return updated;
    },
    syncToSpotify: async () => {},
    syncAllNow: async () => ({ synced: 0 }),
    showInFolder: async () => {},
    openFolder: async () => {},
    openExternal: async (url) => {
      window.open(url, '_blank');
    },
    getPlatform: () => 'browser',
    onAppReady: (cb) => {
      mockListeners.appReady.push(cb);
      // Trigger ready immediately
      setTimeout(() => cb({ hasFfmpeg: true }), 100);
      return () => {
        mockListeners.appReady = mockListeners.appReady.filter((c) => c !== cb);
      };
    },
    onAppLoading: (cb) => {
      mockListeners.appLoading.push(cb);
      return () => {
        mockListeners.appLoading = mockListeners.appLoading.filter((c) => c !== cb);
      };
    },
    onAppError: (cb) => {
      mockListeners.appError.push(cb);
      return () => {
        mockListeners.appError = mockListeners.appError.filter((c) => c !== cb);
      };
    },
    minimizeWindow: async () => {},
    maximizeWindow: async () => {},
    closeWindow: async () => {},
    discordGetStatus: async () => ({ status: 'disconnected' }),
    discordStartBot: async () => ({ ok: false, error: 'Not supported on mobile' }),
    discordStopBot: async () => {},
    discordNotifyTrackChange: async () => {},
    discordNotifySeek: async () => {},
    discordNotifyPause: async () => {},
    discordNotifyResume: async () => {},
    discordDisconnect: async () => {},
    onDiscordStatusUpdate: (cb) => {
      mockListeners.discordStatus.push(cb);
      return () => {
        mockListeners.discordStatus = mockListeners.discordStatus.filter((c) => c !== cb);
      };
    },
  };

  window.spotlocal = api;
}
