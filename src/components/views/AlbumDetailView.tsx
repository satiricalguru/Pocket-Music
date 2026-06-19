import React, { useMemo } from 'react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useDominantColor } from '../../hooks/useDominantColor';
import { TrackTable } from '../library/TrackTable';

interface AlbumDetailViewProps {
  albumId: string;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({ albumId }) => {
  const albums = useLibraryStore((s) => s.albums);
  const getAlbumTracks = useLibraryStore((s) => s.getAlbumTracks);

  const album = useMemo(
    () => albums.find((a) => a.id === albumId),
    [albums, albumId]
  );

  const albumTracks = useMemo(() => {
    if (!album) return [];
    return getAlbumTracks(album.name, album.artist);
  }, [album, getAlbumTracks]);

  const bgColor = useDominantColor(album?.cover_art_url);

  const handlePlayAll = () => {
    if (albumTracks.length > 0) {
      usePlayerStore.getState().play(albumTracks[0], albumTracks);
    }
  };

  if (!album) {
    return (
      <div className="px-6 py-10 text-text3">
        Album not found. It may have been removed.
      </div>
    );
  }

  return (
    <div className="fade-in pb-24">
      {/* Hero */}
      <div
        className="px-6 pt-16 pb-6 md:pt-20 md:pb-6 md:px-8"
        style={{
          background: bgColor || 'linear-gradient(135deg, #242424 0%, #121212 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          <div className="w-40 h-40 md:w-[232px] md:h-[232px] rounded bg-surface flex items-center justify-center shrink-0 overflow-hidden shadow-2xl">
            {album.cover_art_url ? (
              <img
                src={album.cover_art_url}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-text4">
                <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 16l6-4 4 2 10-6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </div>
          <div className="pb-2">
            <p className="text-xs font-bold uppercase tracking-wider mb-1 text-text2">Album</p>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{album.name}</h1>
            <p className="text-sm opacity-80">
              {album.artist}
              {album.year ? ` · ${album.year}` : ''} · {albumTracks.length}{' '}
              {albumTracks.length === 1 ? 'song' : 'songs'}
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

      {/* Track list */}
      <div className="px-6">
        <TrackTable tracks={albumTracks} showAlbum={false} />
      </div>
    </div>
  );
};
