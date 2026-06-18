import React, { useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  Minimize2,
  Mic2,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useDominantColor } from '../../hooks/useDominantColor';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const FullscreenView: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setFullscreen = usePlayerStore((s) => s.setFullscreen);

  const likeTrack = useLibraryStore((s) => s.likeTrack);
  const bgColor = useDominantColor(currentTrack?.cover_art_url);

  const VolumeIcon = useMemo(() => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  }, [isMuted, volume]);

  const handleSeek = useCallback(
    (pct: number) => {
      seek((pct / 100) * duration);
    },
    [seek, duration]
  );

  // Sync state with HTML5 Fullscreen API
  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('HTML5 requestFullscreen rejected:', err);
      });
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.warn('HTML5 exitFullscreen rejected:', err);
        });
      }
    }
  }, [isFullscreen]);

  // Sync Escape key and OS exit events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (isCurrentlyFullscreen !== isFullscreen) {
        setFullscreen(isCurrentlyFullscreen);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, setFullscreen]);

  if (!currentTrack) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between p-12 text-white select-none transition-all duration-500 ease-out"
      style={{ background: bgColor }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between w-full opacity-70 hover:opacity-100 transition-opacity duration-300">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-text2">
            Playing from Album
          </span>
          <span className="text-sm font-bold text-text1 truncate max-w-[400px] mt-0.5">
            {currentTrack.album || 'Pocket Music Library'}
          </span>
        </div>
        <button
          onClick={() => setFullscreen(false)}
          className="p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-text2 hover:text-text1 hover:scale-105 transition-all"
          title="Exit Fullscreen"
        >
          <Minimize2 size={20} />
        </button>
      </div>

      {/* Center Cover Art */}
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <div className="w-[380px] h-[380px] md:w-[440px] md:h-[440px] rounded-lg overflow-hidden bg-[#242424] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative group transition-all duration-500 hover:scale-[1.02]">
          {currentTrack.cover_art_url ? (
            <img
              src={currentTrack.cover_art_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text4">
              <svg width="96" height="96" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12 2v10c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V4L7 5v7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V3l6-1z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Track Details & Like */}
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold text-text1 tracking-tight truncate hover:underline cursor-pointer">
              {currentTrack.title}
            </h1>
            <p className="text-lg text-text2 font-medium truncate hover:text-text1 hover:underline cursor-pointer mt-1">
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={() => void likeTrack(currentTrack.id, !currentTrack.is_liked)}
            className="p-2 text-text2 hover:scale-110 transition-transform shrink-0"
          >
            <Heart
              size={28}
              className={
                currentTrack.is_liked
                  ? 'text-green fill-green'
                  : 'hover:text-text1'
              }
            />
          </button>
        </div>

        {/* Progress Bar (Time labels at ends) */}
        <div className="flex items-center gap-4 w-full">
          <span className="text-xs text-text2 min-w-[40px] text-right tabular-nums">
            {formatTime(progress)}
          </span>
          <div className="flex-1">
            <ProgressBar
              progress={duration > 0 ? (progress / duration) * 100 : 0}
              onSeek={handleSeek}
            />
          </div>
          <span className="text-xs text-text2 min-w-[40px] tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Footer controls layout: similar to PlayerBar but spacious */}
        <div className="flex items-center justify-between pt-2">
          {/* Left: Empty spacer to balance layout columns */}
          <div className="w-[30%] min-w-[120px]" />

          {/* Center: Playback Transport controls */}
          <div className="flex items-center gap-6">
            <button
              onClick={toggleShuffle}
              className={`relative p-1.5 transition-colors ${
                isShuffle ? 'text-green' : 'text-text3 hover:text-text1'
              }`}
              title="Shuffle"
            >
              <Shuffle size={20} />
              {isShuffle && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green" />
              )}
            </button>

            <button
              onClick={prev}
              className="p-1.5 text-text3 hover:text-text1 transition-colors"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause size={28} fill="black" />
              ) : (
                <Play size={28} className="ml-1" fill="black" />
              )}
            </button>

            <button
              onClick={next}
              className="p-1.5 text-text3 hover:text-text1 transition-colors"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`relative p-1.5 transition-colors ${
                repeatMode !== 'none'
                  ? 'text-green'
                  : 'text-text3 hover:text-text1'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? (
                <span className="relative">
                  <Repeat size={20} />
                  <span className="absolute -top-1 -right-1.5 text-[9px] font-bold text-green">
                    1
                  </span>
                </span>
              ) : (
                <Repeat size={20} />
              )}
            </button>
          </div>

          {/* Right: Extra Action controls */}
          <div className="flex items-center justify-end gap-3 w-[30%] min-w-[200px]">
            <button
              className="p-1.5 text-text3 hover:text-text1 transition-colors"
              title="Lyrics"
            >
              <Mic2 size={18} />
            </button>
            <button
              onClick={() => {
                setFullscreen(false);
                useLibraryStore.getState().setActiveView('library');
              }}
              className="p-1.5 text-text3 hover:text-text1 transition-colors"
              title="Queue"
            >
              <ListMusic size={18} />
            </button>
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={setVolume}
              onMuteToggle={toggleMute}
              VolumeIcon={VolumeIcon}
            />
            <button
              onClick={() => setFullscreen(false)}
              className="p-1.5 text-text3 hover:text-text1 hover:scale-105 transition-transform"
              title="Exit Fullscreen"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
