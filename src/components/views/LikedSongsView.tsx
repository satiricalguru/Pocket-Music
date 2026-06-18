import React, { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { TrackTable } from '../library/TrackTable';

export const LikedSongsView: React.FC = () => {
  const tracks = useLibraryStore((s) => s.tracks);

  const likedTracks = useMemo(
    () => tracks.filter((t) => t.is_liked),
    [tracks]
  );

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      usePlayerStore.getState().play(likedTracks[0], likedTracks);
    }
  };

  return (
    <div className="fade-in">
      {/* Hero section with gradient */}
      <div
        className="px-6 pb-6"
        style={{
          background: 'linear-gradient(135deg, #450af5 0%, #c4efd9 100%)',
          padding: '60px 32px 24px',
        }}
      >
        <div className="flex items-end gap-6">
          {/* Liked Songs cover */}
          <div
            className="w-[232px] h-[232px] rounded flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #450af5 0%, #8e8ee5 100%)',
              boxShadow: '0 4px 60px rgba(0,0,0,0.5)',
            }}
          >
            <Heart size={80} fill="white" className="text-white" />
          </div>

          <div className="pb-2">
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Playlist</p>
            <h1 className="text-5xl font-extrabold mb-4">Liked Songs</h1>
            <p className="text-sm opacity-80">
              {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-6 py-4 flex items-center gap-4">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 rounded-full bg-green flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </button>
      </div>

      {/* Track table */}
      <div className="px-6">
        <TrackTable tracks={likedTracks} showAlbum />
      </div>
    </div>
  );
};
