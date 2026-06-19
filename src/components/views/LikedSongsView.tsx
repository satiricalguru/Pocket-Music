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
    <div className="fade-in pb-24">
      {/* Hero section with gradient */}
      <div
        className="px-6 pt-16 pb-6 md:pt-20 md:pb-6 md:px-8"
        style={{
          background: 'linear-gradient(135deg, #450af5 0%, #c4efd9 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          {/* Liked Songs cover */}
          <div
            className="w-40 h-40 md:w-[232px] md:h-[232px] rounded flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #450af5 0%, #8e8ee5 100%)',
              boxShadow: '0 4px 60px rgba(0,0,0,0.5)',
            }}
          >
            <Heart size={64} fill="white" className="text-white md:scale-125" />
          </div>

          <div className="pb-2">
            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-text2">Playlist</p>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Liked Songs</h1>
            <p className="text-sm opacity-80">
              {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-6 py-4 flex items-center justify-center md:justify-start gap-4">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 rounded-full bg-green flex items-center justify-center hover:scale-105 transition-transform shadow-lg shrink-0"
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
