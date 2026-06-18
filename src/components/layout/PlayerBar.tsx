import React, { useCallback, useMemo } from 'react';
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
  Maximize2,
  ListMusic,
  Mic2,
  PanelRight,
  PictureInPicture2,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useDominantColor } from '../../hooks/useDominantColor';
import { ProgressBar } from '../player/ProgressBar';
import { VolumeControl } from '../player/VolumeControl';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PlayerBar: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const isNowPlayingOpen = usePlayerStore((s) => s.isNowPlayingOpen);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleNowPlaying = usePlayerStore((s) => s.toggleNowPlaying);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setVolume = usePlayerStore((s) => s.setVolume);

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

  if (!currentTrack) {
    return (
      <div
        className="h-[var(--playerbar-h)] border-t border-border flex items-center justify-center bg-elevated"
        style={{ background: bgColor }}
      >
        <span className="text-text3 text-sm">Play a song to get started</span>
      </div>
    );
  }

  return (
    <footer
      className="h-[var(--playerbar-h)] border-t border-border flex items-center px-4 select-none"
      style={{ background: bgColor }}
    >
      {/* Left: now playing info */}
      <div className="flex items-center gap-3 w-[30%] min-w-[180px]">
        {/* Cover art */}
        <div className="w-14 h-14 rounded overflow-hidden bg-surface shrink-0">
          {currentTrack.cover_art_url ? (
            <img
              src={currentTrack.cover_art_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text4">
              <ListMusic size={20} />
            </div>
          )}
        </div>
        {/* Title & artist */}
        <div className="min-w-0">
          <div className="text-sm font-medium text-text1 truncate max-w-[148px] hover:underline cursor-pointer">
            {currentTrack.title}
          </div>
          <div className="text-xs text-text2 truncate max-w-[148px] hover:underline cursor-pointer hover:text-text1">
            {currentTrack.artist}
          </div>
        </div>
        {/* Like button */}
        <button
          onClick={() =>
            void likeTrack(currentTrack.id, !currentTrack.is_liked)
          }
          className="shrink-0 text-text2 hover:scale-110 transition-transform"
        >
          <Heart
            size={16}
            className={
              currentTrack.is_liked
                ? 'text-green fill-green'
                : 'hover:text-text1'
            }
          />
        </button>
      </div>

      {/* Center: transport + progress */}
      <div className="flex flex-col items-center gap-1 w-[40%] max-w-[722px]">
        {/* Transport controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            className={`relative p-1 transition-colors ${
              isShuffle ? 'text-green' : 'text-text3 hover:text-text1'
            }`}
            title="Shuffle"
          >
            <Shuffle size={16} />
            {isShuffle && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green" />
            )}
          </button>

          <button
            onClick={prev}
            className="p-1 text-text3 hover:text-text1 transition-colors"
          >
            <SkipBack size={16} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause size={18} className="text-black" fill="black" />
            ) : (
              <Play size={18} className="text-black ml-0.5" fill="black" />
            )}
          </button>

          <button
            onClick={next}
            className="p-1 text-text3 hover:text-text1 transition-colors"
          >
            <SkipForward size={16} fill="currentColor" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`relative p-1 transition-colors ${
              repeatMode !== 'none'
                ? 'text-green'
                : 'text-text3 hover:text-text1'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <span className="relative">
                <Repeat size={16} />
                <span className="absolute -top-1 -right-1.5 text-[9px] font-bold text-green">
                  1
                </span>
              </span>
            ) : (
              <Repeat size={16} />
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-[11px] text-text3 min-w-[35px] text-right tabular-nums">
            {formatTime(progress)}
          </span>
          <ProgressBar
            progress={duration > 0 ? (progress / duration) * 100 : 0}
            onSeek={handleSeek}
          />
          <span className="text-[11px] text-text3 min-w-[35px] tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: volume + extras */}
      <div className="flex items-center justify-end gap-1 w-[30%] min-w-[240px]">
        <button
          className="p-1 text-text3 hover:text-text1 transition-colors"
          title="Lyrics"
        >
          <Mic2 size={16} />
        </button>
        <button
          onClick={() => useLibraryStore.getState().setActiveView('library')}
          className="p-1 text-text3 hover:text-text1 transition-colors"
          title="Queue"
        >
          <ListMusic size={16} />
        </button>
        <button
          onClick={toggleNowPlaying}
          className={`p-1 transition-colors relative ${
            isNowPlayingOpen ? 'text-green' : 'text-text3 hover:text-text1'
          }`}
          title="Now Playing View"
        >
          <PanelRight size={16} />
          {isNowPlayingOpen && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green" />
          )}
        </button>
        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={setVolume}
          onMuteToggle={toggleMute}
          VolumeIcon={VolumeIcon}
        />
        <button
          className="p-1 text-text3 hover:text-text1 transition-colors"
          title="Miniplayer"
        >
          <PictureInPicture2 size={16} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1 text-text3 hover:text-text1 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </footer>
  );
};
