import React, { useEffect, useMemo, useState } from 'react';
import {
  Trash2,
  Pencil,
  Shuffle,
} from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { TrackTable } from '../library/TrackTable';
import { RenamePlaylistModal } from '../modals/RenamePlaylistModal';
import { PlaylistCover } from '../ui/PlaylistCover';

interface PlaylistViewProps {
  playlistId: string;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId }) => {
  const playlists = useLibraryStore((s) => s.playlists);
  const [playlistTracks, setPlaylistTracks] = useState<
    import('../../types').Track[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const playlist = useMemo(
    () => playlists.find((p) => p.id === playlistId),
    [playlists, playlistId]
  );

  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const isCurrentPlaylistPlaying = useMemo(() => {
    if (!currentTrack || playlistTracks.length === 0) return false;
    return isPlaying && playlistTracks.some((t) => t.id === currentTrack.id);
  }, [currentTrack, isPlaying, playlistTracks]);

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const tracks = await window.spotlocal.getPlaylistTracks(playlistId);
      setPlaylistTracks(tracks as import('../../types').Track[]);
    } catch (err) {
      console.error('[playlist] load tracks failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTracks();
  }, [playlistId]);

  const handlePlayAll = () => {
    if (playlistTracks.length === 0) return;
    const playerStore = usePlayerStore.getState();
    const isCurrentTrackInPlaylist = playlistTracks.some((t) => t.id === playerStore.currentTrack?.id);

    if (isCurrentTrackInPlaylist) {
      playerStore.togglePlay();
    } else {
      if (playerStore.isShuffle) {
        const randomIdx = Math.floor(Math.random() * playlistTracks.length);
        playerStore.play(playlistTracks[randomIdx], playlistTracks);
      } else {
        playerStore.play(playlistTracks[0], playlistTracks);
      }
    }
  };

  const handleDelete = async () => {
    if (playlist && confirm(`Delete "${playlist.name}"?`)) {
      await useLibraryStore.getState().deletePlaylist(playlistId);
      useLibraryStore.getState().setActiveView('library');
    }
  };

  const handleRename = () => {
    setShowRenameModal(true);
  };

  if (!playlist) {
    return (
      <div className="px-6 py-10 text-text3">
        Playlist not found.
      </div>
    );
  }

  return (
    <div className="fade-in pb-24">
      {/* Hero */}
      <div
        className="px-6 pt-16 pb-6 md:pt-20 md:pb-6 md:px-8"
        style={{
          background: 'linear-gradient(135deg, #1a3a2a 0%, #0d1b14 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          <PlaylistCover
            coverArt={playlist.cover_art}
            coverArtGrid={playlist.cover_art_grid}
            iconSize={64}
            className="w-40 h-40 md:w-[232px] md:h-[232px] rounded shadow-2xl bg-surface shrink-0"
          />
          <div className="pb-2">
            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-text2">Playlist</p>
            <h1
              onClick={handleRename}
              className="text-3xl md:text-5xl font-extrabold mb-2 hover:underline cursor-pointer select-none"
              title="Click to rename"
            >
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-sm opacity-70 mb-1">{playlist.description}</p>
            )}
            <p className="text-sm opacity-80">
              {playlistTracks.length} {playlistTracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-6 py-4 flex items-center justify-center md:justify-start gap-4">
        <button
          onClick={handlePlayAll}
          disabled={playlistTracks.length === 0}
          className="w-14 h-14 rounded-full bg-green flex items-center justify-center hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          title={isCurrentPlaylistPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentPlaylistPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
              <rect x="6" y="4" width="3" height="16" />
              <rect x="15" y="4" width="3" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          )}
        </button>
        <button
          onClick={() => {
            const playerStore = usePlayerStore.getState();
            playerStore.toggleShuffle();
            if (!playerStore.isShuffle && !isCurrentPlaylistPlaying && playlistTracks.length > 0) {
              const randomIdx = Math.floor(Math.random() * playlistTracks.length);
              playerStore.play(playlistTracks[randomIdx], playlistTracks);
            }
          }}
          disabled={playlistTracks.length === 0}
          className={`p-2 rounded-full transition-colors relative ${
            isShuffle ? 'text-green hover:text-green-h' : 'text-text3 hover:text-text1'
          }`}
          title="Shuffle play"
        >
          <Shuffle size={22} />
          {isShuffle && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
          )}
        </button>
        <button
          onClick={handleRename}
          className="p-2 rounded-full text-text3 hover:text-text1 transition-colors"
          title="Rename playlist"
        >
          <Pencil size={20} />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-full text-text3 hover:text-red-400 transition-colors"
          title="Delete playlist"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Track table */}
      <div className="px-6">
        {isLoading ? (
          <div className="text-text3 text-sm py-10 text-center">Loading tracks…</div>
        ) : (
          <TrackTable 
            tracks={playlistTracks} 
            showAlbum 
            contextPlaylistId={playlistId}
            onTracksChange={loadTracks}
          />
        )}
      </div>

      {/* Rename playlist modal */}
      {showRenameModal && (
        <RenamePlaylistModal
          currentName={playlist.name}
          onClose={() => setShowRenameModal(false)}
          onConfirm={async (newName) => {
            await useLibraryStore.getState().renamePlaylist(playlistId, newName);
          }}
        />
      )}
    </div>
  );
};
