import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Track, Album, Playlist, SortField, SortDir } from '../types';
import { usePlayerStore } from './usePlayerStore';

export type ActiveView =
  | 'home'
  | 'library'
  | 'albums'
  | 'liked'
  | 'search'
  | 'downloads'
  | 'discord'
  | `album-${string}`
  | `playlist-${string}`;

interface LibraryState {
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
  isLoading: boolean;
  activeView: ActiveView;
  searchQuery: string;
  sortField: SortField;
  sortDir: SortDir;

  loadLibrary: () => Promise<void>;
  setActiveView: (v: ActiveView) => void;
  setSearchQuery: (q: string) => void;
  setSort: (field: SortField) => void;
  likeTrack: (id: string, liked: boolean) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist | undefined>;
  deletePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  addToPlaylist: (trackId: string, playlistId: string) => Promise<void>;
  removeFromPlaylist: (trackId: string, playlistId: string) => Promise<void>;

  // Derived helpers
  filteredTracks: () => Track[];
  getPlaylist: (id: string) => Playlist | undefined;
  getAlbumTracks: (album: string, artist: string) => Track[];
}

function compareTracks(field: SortField, dir: SortDir): (a: Track, b: Track) => number {
  const mul = dir === 'desc' ? -1 : 1;
  return (a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * mul;
    }
    return String(va).localeCompare(String(vb)) * mul;
  };
}

export const useLibraryStore = create<LibraryState>()(
  immer((set, get) => ({
    tracks: [],
    albums: [],
    playlists: [],
    isLoading: false,
    activeView: 'home',
    searchQuery: '',
    sortField: 'added_at',
    sortDir: 'desc',

    loadLibrary: async () => {
      set((s) => { s.isLoading = true; });
      try {
        const [tracks, albums, playlists] = await Promise.all([
          window.spotlocal.getTracks(),
          window.spotlocal.getAlbums(),
          window.spotlocal.getPlaylists(),
        ]);
        set((s) => {
          s.tracks = tracks as Track[];
          s.albums = albums as Album[];
          s.playlists = playlists as Playlist[];
          s.isLoading = false;
        });
      } catch (err) {
        console.error('[library] load failed:', err);
        set((s) => { s.isLoading = false; });
      }
    },

    setActiveView: (v) => set((s) => { s.activeView = v; }),

    setSearchQuery: (q) => set((s) => { s.searchQuery = q; }),

    setSort: (field) =>
      set((s) => {
        if (s.sortField === field) {
          s.sortDir = s.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          s.sortField = field;
          s.sortDir = field === 'added_at' ? 'desc' : 'asc';
        }
      }),

    likeTrack: async (id, liked) => {
      try {
        const updated = await window.spotlocal.likeTrack(id, liked);
        set((s) => {
          const idx = s.tracks.findIndex((t) => t.id === id);
          if (idx >= 0) {
            (s.tracks as Track[])[idx] = updated as Track;
          }
        });
      } catch (err) {
        console.error('[library] likeTrack failed:', err);
      }
    },

    deleteTrack: async (id) => {
      try {
        await window.spotlocal.deleteTrack(id);
        set((s) => {
          s.tracks = s.tracks.filter((t) => t.id !== id);
        });

        // Sync with player queue
        const player = usePlayerStore.getState();
        const inQueue = player.queue.some((t) => t.id === id);
        if (inQueue) {
          const newQueue = player.queue.filter((t) => t.id !== id);
          const newOrigQueue = player.originalQueue.filter((t) => t.id !== id);

          if (newQueue.length === 0) {
            usePlayerStore.setState({
              queue: [],
              originalQueue: [],
              currentIndex: -1,
              currentTrack: null,
              isPlaying: false,
              progress: 0,
              duration: 0,
            });
            if (window.spotlocalAudio) {
              window.spotlocalAudio.pause();
              window.spotlocalAudio.src = '';
            }
            void window.spotlocal.discordNotifyPause().catch(() => {});
          } else {
            const isCurrent = player.currentTrack?.id === id;
            if (isCurrent) {
              const deletedIndex = player.queue.findIndex((t) => t.id === id);
              let nextIdx = deletedIndex;
              if (nextIdx >= newQueue.length) {
                nextIdx = newQueue.length - 1;
              }
              const nextTrack = newQueue[nextIdx];
              usePlayerStore.setState({
                queue: newQueue,
                originalQueue: newOrigQueue,
                currentIndex: nextIdx,
                currentTrack: nextTrack,
                progress: 0,
                duration: nextTrack.duration ?? 0,
              });
            } else {
              const deletedIndex = player.queue.findIndex((t) => t.id === id);
              let newIdx = player.currentIndex;
              if (deletedIndex < player.currentIndex) {
                newIdx -= 1;
              }
              usePlayerStore.setState({
                queue: newQueue,
                originalQueue: newOrigQueue,
                currentIndex: newIdx,
              });
            }
          }
        }
      } catch (err) {
        console.error('[library] deleteTrack failed:', err);
      }
    },

    createPlaylist: async (name) => {
      try {
        const pl = await window.spotlocal.createPlaylist(name);
        set((s) => { s.playlists.push(pl as Playlist); });
        return pl as Playlist;
      } catch (err) {
        console.error('[library] createPlaylist failed:', err);
      }
    },

    deletePlaylist: async (id) => {
      try {
        await window.spotlocal.deletePlaylist(id);
        set((s) => {
          s.playlists = s.playlists.filter((p) => p.id !== id);
        });
      } catch (err) {
        console.error('[library] deletePlaylist failed:', err);
      }
    },

    renamePlaylist: async (id, name) => {
      try {
        const updated = await window.spotlocal.renamePlaylist(id, name);
        set((s) => {
          const idx = s.playlists.findIndex((p) => p.id === id);
          if (idx >= 0) {
            (s.playlists as Playlist[])[idx] = updated as Playlist;
          }
        });
      } catch (err) {
        console.error('[library] renamePlaylist failed:', err);
      }
    },

    addToPlaylist: async (trackId, playlistId) => {
      try {
        await window.spotlocal.addTrackToPlaylist(trackId, playlistId);
        // Refresh playlist track counts
        const playlists = await window.spotlocal.getPlaylists();
        set((s) => { s.playlists = playlists as Playlist[]; });
      } catch (err) {
        console.error('[library] addToPlaylist failed:', err);
      }
    },

    removeFromPlaylist: async (trackId, playlistId) => {
      try {
        await window.spotlocal.removeTrackFromPlaylist(trackId, playlistId);
        const playlists = await window.spotlocal.getPlaylists();
        set((s) => { s.playlists = playlists as Playlist[]; });
      } catch (err) {
        console.error('[library] removeFromPlaylist failed:', err);
      }
    },

    filteredTracks: () => {
      const { tracks, sortField, sortDir } = get();
      return tracks.slice().sort(compareTracks(sortField, sortDir));
    },

    getPlaylist: (id) => get().playlists.find((p) => p.id === id),

    getAlbumTracks: (album, artist) =>
      get()
        .tracks.filter(
          (t) =>
            (t.album ?? '').toLowerCase() === album.toLowerCase() &&
            (t.album_artist ?? t.artist).toLowerCase() === artist.toLowerCase()
        )
        .sort((a, b) => (a.track_number ?? 0) - (b.track_number ?? 0)),
  }))
);
