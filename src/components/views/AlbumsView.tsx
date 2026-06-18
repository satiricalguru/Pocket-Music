import React from 'react';
import { ListMusic } from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { AlbumGrid } from '../library/AlbumGrid';

export const AlbumsView: React.FC = () => {
  const albums = useLibraryStore((s) => s.albums);

  const handleAlbumClick = (albumId: string) => {
    useLibraryStore.getState().setActiveView(`album-${albumId}`);
  };

  return (
    <div className="px-6 py-6 fade-in">
      <h1 className="text-2xl font-bold mb-6">Albums</h1>
      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text3">
          <ListMusic size={48} className="mb-4 opacity-30" />
          <p>No albums yet. Download some music to see albums here.</p>
        </div>
      ) : (
        <AlbumGrid albums={albums} onAlbumClick={handleAlbumClick} />
      )}
    </div>
  );
};
