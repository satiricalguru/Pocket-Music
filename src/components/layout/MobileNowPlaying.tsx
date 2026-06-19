import React, { useCallback } from 'react';
import {
  ChevronDown,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useDominantColor } from '../../hooks/useDominantColor';
import { ProgressBar } from '../player/ProgressBar';
import { useContextMenu, type ContextMenuAction } from '../../hooks/useContextMenu';
import { ContextMenu } from '../ui/ContextMenu';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const MobileNowPlaying: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setFullscreen = usePlayerStore((s) => s.setFullscreen);

  const likeTrack = useLibraryStore((s) => s.likeTrack);
  const bgColor = useDominantColor(currentTrack?.cover_art_url);

  const { menu, containerRef, show, hide } = useContextMenu();

  const handleSeek = useCallback(
    (pct: number) => {
      seek((pct / 100) * duration);
    },
    [seek, duration]
  );

  const handleOptionsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentTrack) return;
      
      const items: ContextMenuAction[] = [
        {
          id: 'play-next',
          label: 'Play Next',
          onClick: () => usePlayerStore.getState().playNext(currentTrack),
        },
        {
          id: 'add-to-queue',
          label: 'Add to Queue',
          onClick: () => usePlayerStore.getState().addToQueue(currentTrack),
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'like',
          label: currentTrack.is_liked ? 'Unlike song' : 'Like song',
          onClick: () => void likeTrack(currentTrack.id, !currentTrack.is_liked),
        },
        {
          id: 'show-in-folder',
          label: window.spotlocal.getPlatform() === 'win32' ? 'Show in Explorer' : 'Show in Finder',
          onClick: () => void window.spotlocal.showInFolder(currentTrack.file_path),
        },
        ...(currentTrack.spotify_id
          ? [
              {
                id: 'open-in-spotify',
                label: 'Open in Spotify',
                onClick: () =>
                  void window.spotlocal.openExternal(
                    `https://open.spotify.com/track/${currentTrack.spotify_id}`
                  ),
              },
            ]
          : []),
      ];
      show(e.clientX, e.clientY, items);
    },
    [currentTrack, likeTrack, show]
  );

  if (!currentTrack) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between px-6 py-8 text-white select-none transition-all duration-300 ease-out"
      style={{
        background: `linear-gradient(to bottom, ${bgColor || '#121212'} 0%, #121212 100%)`,
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between w-full h-12">
        <button
          onClick={() => setFullscreen(false)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Collapse"
        >
          <ChevronDown size={28} />
        </button>
        <div className="flex flex-col items-center max-w-[200px] text-center">
          <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-text2">
            Playing from
          </span>
          <span className="text-xs font-bold text-text1 truncate w-full mt-0.5">
            {currentTrack.album || 'Pocket Music Library'}
          </span>
        </div>
        <button
          onClick={handleOptionsClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Options"
        >
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Album Cover Art */}
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="w-[85vw] h-[85vw] max-w-[340px] max-h-[340px] rounded-lg overflow-hidden bg-highlight shadow-2xl relative">
          {currentTrack.cover_art_url ? (
            <img
              src={currentTrack.cover_art_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text4">
              <svg width="64" height="64" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12 2v10c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V4L7 5v7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V3l6-1z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full space-y-5 pb-6">
        {/* Track Details & Like */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h1 className="text-xl font-extrabold text-text1 truncate">
              {currentTrack.title}
            </h1>
            <p className="text-sm text-text2 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={() => void likeTrack(currentTrack.id, !currentTrack.is_liked)}
            className="p-2 text-text2 hover:scale-105 transition-transform shrink-0"
          >
            <Heart
              size={24}
              className={
                currentTrack.is_liked
                  ? 'text-green fill-green'
                  : 'text-text2 hover:text-text1'
              }
            />
          </button>
        </div>

        {/* Progress Bar & Time Labels */}
        <div className="space-y-1">
          <ProgressBar
            progress={duration > 0 ? (progress / duration) * 100 : 0}
            onSeek={handleSeek}
          />
          <div className="flex items-center justify-between text-[10px] text-text2 font-medium tabular-nums">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between px-2 pt-1">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-green' : 'text-text3 hover:text-text1'
            }`}
            title="Shuffle"
          >
            <Shuffle size={20} />
          </button>

          <button
            onClick={prev}
            className="p-2 text-text1 hover:text-text2 transition-colors"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform shrink-0 shadow-md"
          >
            {isPlaying ? (
              <Pause size={28} fill="black" />
            ) : (
              <Play size={28} className="ml-1" fill="black" />
            )}
          </button>

          <button
            onClick={next}
            className="p-2 text-text1 hover:text-text2 transition-colors"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`relative p-2 transition-colors ${
              repeatMode !== 'none' ? 'text-green' : 'text-text3 hover:text-text1'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <span className="relative">
                <Repeat size={20} />
                <span className="absolute -top-1 -right-1 text-[8px] font-extrabold text-green bg-[#121212] px-0.5 rounded-full">
                  1
                </span>
              </span>
            ) : (
              <Repeat size={20} />
            )}
          </button>
        </div>

        {/* Footer Accessories */}
        <div className="flex items-center justify-between px-2 pt-2">
          {/* Left Spacer / Connect Device placeholder */}
          <div className="w-8" />
          
          <button
            onClick={() => {
              setFullscreen(false);
              useLibraryStore.getState().setActiveView('library');
            }}
            className="p-2 text-text3 hover:text-text1 transition-colors"
            title="Queue"
          >
            <ListMusic size={20} />
          </button>
        </div>
      </div>

      {/* Context menu portal */}
      <ContextMenu
        menu={menu}
        containerRef={containerRef}
        onClose={hide}
      />
    </div>
  );
};
