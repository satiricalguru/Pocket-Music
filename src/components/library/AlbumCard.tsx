import React from 'react';
import type { Album } from '../../types';

interface AlbumCardProps {
  album: Album;
  onClick: () => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer p-4 rounded-lg bg-surface hover:bg-surface-h transition-colors duration-[var(--dur-normal)]"
    >
      <div className="relative aspect-square mb-3 rounded-lg overflow-hidden shadow-lg bg-elevated">
        {album.cover_art_url ? (
          <img
            src={album.cover_art_url}
            alt={album.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 16l6-4 4 2 10-6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
        {/* Play button overlay */}
        <div className="absolute bottom-2 right-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-[var(--dur-normal)]">
          <div className="w-12 h-12 rounded-full bg-green flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="black">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </div>
        </div>
      </div>
      <div className="text-sm font-bold text-text1 truncate">{album.name}</div>
      <div className="text-xs text-text2 truncate mt-1">
        {album.artist}
        {album.year ? ` · ${album.year}` : ''}
      </div>
    </div>
  );
};
