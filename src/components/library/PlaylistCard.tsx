import React from 'react';
import type { Playlist } from '../../types';
import { PlaylistCover } from '../ui/PlaylistCover';

interface PlaylistCardProps {
  playlist: Playlist;
  onClick: () => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onClick }) => (
  <div
    onClick={onClick}
    className="group cursor-pointer p-4 rounded-lg bg-surface hover:bg-surface-h transition-colors duration-[var(--dur-normal)]"
  >
    <PlaylistCover
      coverArt={playlist.cover_art}
      coverArtGrid={playlist.cover_art_grid}
      iconSize={48}
      className="relative aspect-square mb-3 rounded-lg overflow-hidden shadow-lg bg-elevated w-full"
    />
    <div className="text-sm font-bold text-text1 truncate">{playlist.name}</div>
    <div className="text-xs text-text2 truncate mt-1">
      {playlist.track_count ?? 0} {(playlist.track_count ?? 0) === 1 ? 'song' : 'songs'}
    </div>
  </div>
);
