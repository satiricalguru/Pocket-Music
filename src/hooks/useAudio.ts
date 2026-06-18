import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useDiscordStore } from '../store/useDiscordStore';

/**
 * Audio engine hook. Creates a single <audio> element, wires it to the
 * player store, and handles all playback events.
 */
export function useAudio(): HTMLAudioElement | null {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playCountSent = useRef(false);
  const loadedTrackIdRef = useRef<string | null>(null);
  // Fallback timer: if 'seeked' event never fires, release the seeking lock
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Circuit-breaker: count consecutive errors to prevent infinite next() loops
  const consecutiveErrorsRef = useRef(0);

  const getCurrentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);

  const setDuration = usePlayerStore((s) => s.setDuration);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setBuffering = usePlayerStore((s) => s.setBuffering);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const repeatMode = usePlayerStore((s) => s.repeatMode);

  // Create audio element once
  useEffect(() => {
    if (audioRef.current) return;
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audioRef.current = audio;
    window.spotlocalAudio = audio;
    return () => {
      delete window.spotlocalAudio;
    };
  }, []);

  // Sync track source
  const trackId = getCurrentTrack?.id;
  const filePath = getCurrentTrack?.file_path;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    const loadTrack = async () => {
      if (!trackId || !filePath) {
        loadedTrackIdRef.current = null;
        audio.src = '';
        return;
      }

      loadedTrackIdRef.current = null;
      setBuffering(true);
      consecutiveErrorsRef.current = 0; // reset on new track

      try {
        const url = await window.spotlocal.getAudioUrl(filePath);
        if (cancelled) return;
        audio.src = url;
        audio.load();

        loadedTrackIdRef.current = trackId;

        const currentIsPlaying = usePlayerStore.getState().isPlaying;
        if (currentIsPlaying) {
          audio.play().catch((err) => {
            console.warn('[audio] play() rejected on load:', err);
          });
        }
      } catch (err) {
        console.error('[audio] failed to get URL:', err);
      } finally {
        if (!cancelled) {
          setBuffering(false);
        }
      }
    };
    void loadTrack();
    playCountSent.current = false;

    // Notify Discord bot of new track
    if (filePath) {
      void window.spotlocal.discordNotifyTrackChange(filePath, 0, isPlaying).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [trackId, filePath, setBuffering]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !getCurrentTrack) return;
    if (loadedTrackIdRef.current !== getCurrentTrack.id) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('[audio] play() rejected:', err);
      });
      void window.spotlocal.discordNotifyResume().catch(() => {});
    } else {
      audio.pause();
      void window.spotlocal.discordNotifyPause().catch(() => {});
    }
  }, [isPlaying, getCurrentTrack]);

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Sync playback state to Discord bot when the bot joins a channel
  const discordChannelName = useDiscordStore((s) => s.channelName);
  const lastSyncedChannelRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (discordChannelName && discordChannelName !== lastSyncedChannelRef.current && filePath) {
      lastSyncedChannelRef.current = discordChannelName;
      const currentProgress = usePlayerStore.getState().progress;
      void window.spotlocal.discordNotifyTrackChange(filePath, currentProgress, isPlaying).catch(() => {});
    } else if (!discordChannelName) {
      lastSyncedChannelRef.current = undefined;
    }
  }, [discordChannelName, filePath, isPlaying]);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);

    const onSeeked = () => {
      // Clear the timeout fallback — seeked fired normally
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
      usePlayerStore.getState().setIsSeeking(false);
    };

    const onTimeUpdate = () => {
      if (!usePlayerStore.getState().isSeeking) {
        setProgress(audio.currentTime);
      }
      // Count play after 30 seconds
      const track = usePlayerStore.getState().currentTrack;
      if (track && audio.currentTime >= 30 && !playCountSent.current) {
        playCountSent.current = true;
        void window.spotlocal.incrementPlayCount(track.id);
      }
    };

    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);

    const onError = () => {
      setBuffering(false);
      console.error('[audio] error event');
      consecutiveErrorsRef.current += 1;
      // Circuit breaker: stop advancing queue after 3 consecutive errors
      if (consecutiveErrorsRef.current >= 3) {
        console.warn('[audio] circuit breaker: too many consecutive errors, pausing');
        usePlayerStore.getState().pause();
        consecutiveErrorsRef.current = 0;
        return;
      }
      const state = usePlayerStore.getState();
      if (state.queue.length > 1) {
        state.next();
      } else {
        state.pause();
      }
    };

    const onEnded = () => {
      consecutiveErrorsRef.current = 0; // successful playback resets the counter
      const state = usePlayerStore.getState();
      if (state.repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (state.repeatMode === 'all') {
        state.next();
      } else {
        if (state.currentIndex < state.queue.length - 1) {
          state.next();
        } else {
          state.pause();
        }
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, [setDuration, setProgress, setBuffering, pause, next, cycleRepeat, repeatMode]);

  // Watch isSeeking — arm a 600ms fallback in case 'seeked' event never fires
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prev) => {
      if (state.isSeeking && !prev.isSeeking) {
        // isSeeking just turned true — arm a fallback
        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => {
          usePlayerStore.getState().setIsSeeking(false);
          seekTimeoutRef.current = null;
        }, 600);
      }
    });
    return () => {
      unsub();
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    };
  }, []);

  // Media Session API (OS media controls)
  useEffect(() => {
    const track = getCurrentTrack;
    if (!track || !navigator.mediaSession) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album ?? '',
      artwork: track.cover_art_url
        ? [{ src: track.cover_art_url, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });
    return () => {
      navigator.mediaSession.metadata = null;
    };
  }, [getCurrentTrack]);

  useEffect(() => {
    if (!navigator.mediaSession) return;
    navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().resume());
    navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next());
    navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prev());
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, []);

  return audioRef.current;
}
