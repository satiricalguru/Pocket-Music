import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Track } from '../types';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  queue: Track[];
  originalQueue: Track[]; // pre-shuffle order, restored on un-shuffle
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  duration: number; // seconds
  progress: number; // seconds
  volume: number; // 0..1
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  buffering: boolean;
  isSeeking: boolean;
  isNowPlayingOpen: boolean;
  sidebarWidth: number;
  nowPlayingWidth: number;

  play: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setDuration: (d: number) => void;
  setProgress: (p: number) => void;
  setIsSeeking: (val: boolean) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setBuffering: (b: boolean) => void;
  toggleNowPlaying: () => void;
  setNowPlayingOpen: (open: boolean) => void;
  setSidebarWidth: (w: number) => void;
  setNowPlayingWidth: (w: number) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  setFullscreen: (val: boolean) => void;
}

/** Fisher–Yates shuffle returning a new array. */
function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    immer((set, get) => ({
      queue: [],
      originalQueue: [],
      currentIndex: -1,
      currentTrack: null,
      isPlaying: false,
      duration: 0,
      progress: 0,
      volume: 0.7,
      isMuted: false,
      repeatMode: 'none' as RepeatMode,
      isShuffle: false,
      buffering: false,
      isSeeking: false,
      isNowPlayingOpen: false,
      sidebarWidth: 240,
      nowPlayingWidth: 300,
      isFullscreen: false,

      toggleNowPlaying: () => set((s) => { s.isNowPlayingOpen = !s.isNowPlayingOpen; }),
      setNowPlayingOpen: (open) => set((s) => { s.isNowPlayingOpen = open; }),
      setSidebarWidth: (w) => set((s) => { s.sidebarWidth = w; }),
      setNowPlayingWidth: (w) => set((s) => { s.nowPlayingWidth = w; }),
      toggleFullscreen: () => set((s) => { s.isFullscreen = !s.isFullscreen; }),
      setFullscreen: (val) => set((s) => { s.isFullscreen = val; }),

      play: (track, queue) => {
        const contextQueue = queue && queue.length > 0 ? queue : [track];
        const idx = contextQueue.findIndex((t) => t.id === track.id);
        const safeIdx = idx >= 0 ? idx : 0;

        if (get().isShuffle) {
          // Shuffle the queue but keep the chosen track first
          const rest = shuffle(contextQueue.filter((_, i) => i !== safeIdx));
          const shuffled = [contextQueue[safeIdx], ...rest];
          set((s) => {
            s.queue = shuffled;
            s.originalQueue = contextQueue.slice();
            s.currentIndex = 0;
            s.currentTrack = shuffled[0];
            s.isPlaying = true;
            s.progress = 0;
            s.duration = shuffled[0]?.duration ?? 0;
          });
        } else {
          set((s) => {
            s.queue = contextQueue.slice();
            s.originalQueue = contextQueue.slice();
            s.currentIndex = safeIdx;
            s.currentTrack = contextQueue[safeIdx];
            s.isPlaying = true;
            s.progress = 0;
            s.duration = contextQueue[safeIdx]?.duration ?? 0;
          });
        }
      },

      pause: () => set((s) => { s.isPlaying = false; }),
      resume: () => set((s) => { if (s.currentTrack) s.isPlaying = true; }),
      togglePlay: () => {
        const s = get();
        if (!s.currentTrack) return;
        set((d) => { d.isPlaying = !s.isPlaying; });
      },

      next: () => {
        const { queue, currentIndex, repeatMode } = get();
        if (queue.length === 0) return;
        let nextIdx = currentIndex + 1;
        if (nextIdx >= queue.length) {
          if (repeatMode === 'all') {
            nextIdx = 0;
          } else {
            // Stop at end
            set((s) => { s.isPlaying = false; s.progress = 0; });
            return;
          }
        }
        set((s) => {
          s.currentIndex = nextIdx;
          s.currentTrack = s.queue[nextIdx];
          s.progress = 0;
          s.duration = s.queue[nextIdx]?.duration ?? 0;
          s.isPlaying = true;
        });
      },

      prev: () => {
        const { queue, currentIndex, progress } = get();
        if (queue.length === 0) return;
        // If more than 3s in, restart current track (Spotify behavior)
        if (progress > 3) {
          set((s) => { s.progress = 0; });
          return;
        }
        let prevIdx = currentIndex - 1;
        if (prevIdx < 0) {
          prevIdx = get().repeatMode === 'all' ? queue.length - 1 : 0;
        }
        set((s) => {
          s.currentIndex = prevIdx;
          s.currentTrack = s.queue[prevIdx];
          s.progress = 0;
          s.duration = s.queue[prevIdx]?.duration ?? 0;
          s.isPlaying = true;
        });
      },

      seek: (seconds) => {
        const safeSecs = Math.max(0, seconds);
        set((s) => {
          s.progress = safeSecs;
        });
        if (window.spotlocalAudio) {
          get().setIsSeeking(true);
          window.spotlocalAudio.currentTime = safeSecs;
        }
        const isPlaying = get().isPlaying;
        void window.spotlocal.discordNotifySeek(safeSecs, isPlaying).catch(() => {});
      },
      setDuration: (d) => set((s) => { s.duration = d; }),
      setProgress: (p) => set((s) => { s.progress = p; }),
      setIsSeeking: (val) => set((s) => { s.isSeeking = val; }),

      setVolume: (v) => set((s) => {
        s.volume = Math.min(1, Math.max(0, v));
        if (v > 0) s.isMuted = false;
      }),

      toggleMute: () => set((s) => { s.isMuted = !s.isMuted; }),

      toggleShuffle: () => {
        const { isShuffle, queue, originalQueue, currentTrack } = get();
        if (!isShuffle) {
          // Turn shuffle ON
          if (queue.length === 0 || !currentTrack) {
            set((s) => { s.isShuffle = true; });
            return;
          }
          const rest = shuffle(queue.filter((t) => t.id !== currentTrack.id));
          const newQueue = [currentTrack, ...rest];
          set((s) => {
            s.originalQueue = queue.slice();
            s.queue = newQueue;
            s.currentIndex = 0;
            s.isShuffle = true;
          });
        } else {
          // Turn shuffle OFF — restore original order, keep current track playing
          const targetId = currentTrack?.id;
          const restored = originalQueue.length > 0 ? originalQueue : queue;
          const newIdx = targetId
            ? Math.max(0, restored.findIndex((t) => t.id === targetId))
            : 0;
          set((s) => {
            s.queue = restored.slice();
            s.currentIndex = newIdx;
            s.isShuffle = false;
          });
        }
      },

      cycleRepeat: () => set((s) => {
        s.repeatMode =
          s.repeatMode === 'none' ? 'all' : s.repeatMode === 'all' ? 'one' : 'none';
      }),

      addToQueue: (track) => set((s) => { s.queue.push(track); }),

      playNext: (track) => set((s) => {
        s.queue.splice(s.currentIndex + 1, 0, track);
      }),

      removeFromQueue: (index) => set((s) => {
        if (index < 0 || index >= s.queue.length) return;
        s.queue.splice(index, 1);
        if (index < s.currentIndex) s.currentIndex -= 1;
        if (s.queue.length === 0) {
          s.currentTrack = null;
          s.currentIndex = -1;
          s.isPlaying = false;
        } else if (index === s.currentIndex) {
          s.currentTrack = s.queue[Math.min(index, s.queue.length - 1)];
        }
      }),

      clearQueue: () => set((s) => {
        s.queue = [];
        s.originalQueue = [];
        s.currentIndex = -1;
        s.currentTrack = null;
        s.isPlaying = false;
        s.progress = 0;
      }),

      setBuffering: (b) => set((s) => { s.buffering = b; }),
    })),
    {
      name: 'spotlocal-player',
      // Only persist user preferences, not ephemeral playback state
      partialize: (s) => ({
        volume: s.volume,
        isMuted: s.isMuted,
        repeatMode: s.repeatMode,
        isShuffle: s.isShuffle,
        isNowPlayingOpen: s.isNowPlayingOpen,
        sidebarWidth: s.sidebarWidth,
        nowPlayingWidth: s.nowPlayingWidth,
      }),
    }
  )
);
