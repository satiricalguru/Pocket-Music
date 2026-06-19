import React, { useState, useCallback, useMemo } from 'react';
import { Play, Pause, Heart, MoreHorizontal } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useContextMenu, type ContextMenuAction } from '../../hooks/useContextMenu';
import { ContextMenu } from '../ui/ContextMenu';
import { EqualizerBars } from '../player/EqualizerBars';
import { AddToPlaylistModal } from '../modals/AddToPlaylistModal';
import type { Track } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';

interface TrackRowProps {
  track: Track;
  index: number;
  showAlbum?: boolean;
  showDateAdded?: boolean;
  queue: Track[];
  contextPlaylistId?: string;
  onTracksChange?: () => void;
}

function formatDate(ms: number): string {
  if (!ms) return '';
  const date = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  showAlbum = true,
  showDateAdded = true,
  queue,
  contextPlaylistId,
  onTracksChange,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [isDragOver, setIsDragOver] = useState<'top' | 'bottom' | null>(null);

  const isMobile = useIsMobile();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const play = usePlayerStore((s) => s.play);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const likeTrack = useLibraryStore((s) => s.likeTrack);
  const deleteTrack = useLibraryStore((s) => s.deleteTrack);
  const removeFromPlaylist = useLibraryStore((s) => s.removeFromPlaylist);

  const { menu, containerRef, show, hide } = useContextMenu();
  const isActive = currentTrack?.id === track.id;

  const handleClick = useCallback(() => {
    if (isActive) {
      togglePlay();
    } else {
      play(track, queue);
    }
  }, [isActive, togglePlay, play, track, queue]);

  const handleDoubleClick = useCallback(() => {
    play(track, queue);
  }, [play, track, queue]);

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void likeTrack(track.id, !track.is_liked);
    },
    [likeTrack, track]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const items: ContextMenuAction[] = [
        {
          id: 'play-now',
          label: 'Play Now',
          onClick: () => play(track, queue),
        },
        {
          id: 'play-next',
          label: 'Play Next',
          onClick: () => usePlayerStore.getState().playNext(track),
        },
        {
          id: 'add-to-queue',
          label: 'Add to Queue',
          onClick: () => usePlayerStore.getState().addToQueue(track),
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'like',
          label: track.is_liked ? 'Unlike song' : 'Like song',
          onClick: () => void likeTrack(track.id, !track.is_liked),
        },
        {
          id: 'add-to-playlist',
          label: 'Add to playlist',
          submenu: useLibraryStore.getState().playlists.length > 0
            ? useLibraryStore.getState().playlists.map((pl) => ({
                id: `add-to-${pl.id}`,
                label: pl.name,
                onClick: () => void useLibraryStore.getState().addToPlaylist(track.id, pl.id),
              }))
            : [{ id: 'no-playlists', label: 'No playlists created', disabled: true }],
          onClick: () => setShowAddToPlaylist(true),
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: 'show-in-folder',
          label: window.spotlocal.getPlatform() === 'win32' ? 'Show in Explorer' : 'Show in Finder',
          onClick: () => void window.spotlocal.showInFolder(track.file_path),
        },
        ...(track.spotify_id
          ? [
              {
                id: 'open-in-spotify',
                label: 'Open in Spotify',
                onClick: () =>
                  void window.spotlocal.openExternal(
                    `https://open.spotify.com/track/${track.spotify_id}`
                  ),
              },
            ]
          : []),
        { id: 'sep3', label: '', separator: true },
        ...(contextPlaylistId
          ? [
              {
                id: 'remove-from-playlist',
                label: 'Remove from this playlist',
                danger: true,
                onClick: async () => {
                  await removeFromPlaylist(track.id, contextPlaylistId);
                  onTracksChange?.();
                },
              },
            ]
          : []),
        {
          id: 'remove-from-library',
          label: 'Remove from Library',
          danger: true,
          onClick: () => {
            if (confirm(`Delete "${track.title}"? This removes the file from disk.`)) {
              void deleteTrack(track.id);
            }
          },
        },
      ];
      show(e.clientX, e.clientY, items);
    },
    [track, queue, play, likeTrack, deleteTrack, removeFromPlaylist, contextPlaylistId, show, onTracksChange]
  );

  const handleMoreClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleContextMenu(e);
    },
    [handleContextMenu]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/spotlocal-track', JSON.stringify(track));
      e.dataTransfer.setData('text/plain', track.id);
      e.dataTransfer.setData('application/spotlocal-track-index', String(index));
      if (contextPlaylistId) {
        e.dataTransfer.setData('application/spotlocal-playlist-id', contextPlaylistId);
      }
      e.dataTransfer.effectAllowed = 'copyMove';
    },
    [track, index, contextPlaylistId]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!contextPlaylistId) return;
      if (!e.dataTransfer.types.includes('application/spotlocal-track-index')) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      if (relativeY < rect.height / 2) {
        setIsDragOver('top');
      } else {
        setIsDragOver('bottom');
      }
    },
    [contextPlaylistId]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      setIsDragOver(null);
      if (!contextPlaylistId) return;

      const sourceIndexStr = e.dataTransfer.getData('application/spotlocal-track-index');
      const sourcePlaylistId = e.dataTransfer.getData('application/spotlocal-playlist-id');

      if (!sourceIndexStr || sourcePlaylistId !== contextPlaylistId) {
        return;
      }

      const sourceIdx = parseInt(sourceIndexStr, 10);
      if (isNaN(sourceIdx) || sourceIdx === index) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const isTopHalf = relativeY < rect.height / 2;

      let targetPosInSpliced = sourceIdx < index ? index - 1 : index;
      if (!isTopHalf) {
        targetPosInSpliced += 1;
      }

      const ok = await window.spotlocal.reorderPlaylistTracks(contextPlaylistId, sourceIdx, targetPosInSpliced);
      if (ok) {
        onTracksChange?.();
      }
    },
    [contextPlaylistId, index, onTracksChange]
  );

  // Build dynamic grid template
  const gridTemplate = useMemo(() => {
    const cols = ['40px', '1fr'];
    if (showAlbum) cols.push('200px');
    if (showDateAdded) cols.push('160px');
    cols.push('40px', '60px', '32px');
    return cols.join(' ');
  }, [showAlbum, showDateAdded]);

  return (
    <>
      <div
        className={
          isMobile
            ? "flex items-center justify-between px-3 py-2 rounded cursor-default group transition-colors duration-[var(--dur-fast)] relative"
            : "grid items-center gap-2 px-4 rounded cursor-default group transition-colors duration-[var(--dur-fast)] relative"
        }
        style={{
          gridTemplateColumns: isMobile ? undefined : gridTemplate,
          height: 56,
          background: isActive ? 'rgba(255,255,255,0.1)' : undefined,
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragLeave}
        onDrop={handleDrop}
        draggable={!isMobile}
      >
        {isDragOver === 'top' && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-green z-10 pointer-events-none" />
        )}
        {isDragOver === 'bottom' && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-green z-10 pointer-events-none" />
        )}
        
        {/* Index / play / equalizer (Desktop Only) */}
        {!isMobile && (
          <div className="flex items-center justify-end pr-2">
            {isActive && isPlaying ? (
              isHovering ? (
                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                  <Pause size={14} className="text-text1" fill="currentColor" />
                </button>
              ) : (
                <EqualizerBars playing={true} />
              )
            ) : isHovering ? (
              <button onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                <Play size={14} className="text-text1" fill="currentColor" />
              </button>
            ) : (
              <span className={isActive ? 'text-green text-sm tabular-nums' : 'text-text3 text-sm tabular-nums'}>
                {index + 1}
              </span>
            )}
          </div>
        )}

        {/* Title + cover */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded shrink-0 overflow-hidden bg-surface">
            {track.cover_art_url ? (
              <img
                src={track.cover_art_url}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text4">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M12 2v10c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V4L7 5v7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V3l6-1z" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-sm font-medium truncate ${
                isActive ? 'text-green' : 'text-text1'
              }`}
            >
              {track.title}
            </div>
            <div className="text-xs text-text2 truncate hover:underline cursor-pointer hover:text-text1 mt-0.5">
              {track.artist}
            </div>
          </div>
        </div>

        {/* Album (Desktop Only) */}
        {!isMobile && showAlbum && (
          <div className="text-sm text-text2 truncate hover:underline cursor-pointer hover:text-text1">
            {track.album ?? '—'}
          </div>
        )}

        {/* Date added (Desktop Only) */}
        {!isMobile && showDateAdded && (
          <div className="text-sm text-text3 truncate">
            {formatDate(track.added_at)}
          </div>
        )}

        {/* Like (Visible always on mobile, hover on desktop) */}
        <div className="flex items-center justify-center shrink-0 px-2">
          <button
            onClick={handleLike}
            className={`transition-opacity ${
              track.is_liked || isHovering || isMobile ? 'opacity-100' : 'opacity-0'
            }`}
            title={track.is_liked ? 'Unlike' : 'Like'}
          >
            <Heart
              size={16}
              className={
                track.is_liked
                  ? 'text-green fill-green'
                  : 'text-text2 hover:text-text1'
              }
            />
          </button>
        </div>

        {/* Duration (Desktop Only) */}
        {!isMobile && (
          <div className="text-sm text-text3 text-right tabular-nums">
            {formatDuration(track.duration)}
          </div>
        )}

        {/* Actions (Three Dots) */}
        <div className="flex items-center justify-center shrink-0 pl-1">
          <button
            onClick={handleMoreClick}
            className={`transition-opacity duration-[var(--dur-fast)] ${
              isHovering || isMobile ? 'opacity-100' : 'opacity-0'
            }`}
            title="More options"
          >
            <MoreHorizontal
              size={16}
              className="text-text3 hover:text-text1"
            />
          </button>
        </div>
      </div>

      {/* Context menu portal */}
      <ContextMenu
        menu={menu}
        containerRef={containerRef}
        onClose={hide}
      />

      {/* Add to playlist modal */}
      {showAddToPlaylist && (
        <AddToPlaylistModal
          trackId={track.id}
          onClose={() => setShowAddToPlaylist(false)}
        />
      )}
    </>
  );
};
