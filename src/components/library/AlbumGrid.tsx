import React from 'react';
import type { Album } from '../../types';
import { AlbumCard } from './AlbumCard';

interface AlbumGridProps {
  albums: Album[];
  onAlbumClick: (albumId: string) => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({ albums, onAlbumClick }) => {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      }}
    >
      {albums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          onClick={() => onAlbumClick(album.id)}
        />
      ))}
    </div>
  );
};
