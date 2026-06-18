import React from 'react';
import { ListMusic } from 'lucide-react';

interface PlaylistCoverProps {
  coverArt?: string;
  coverArtGrid?: string[];
  iconSize?: number;
  className?: string;
}

export const PlaylistCover: React.FC<PlaylistCoverProps> = ({
  coverArt,
  coverArtGrid = [],
  iconSize = 24,
  className = '',
}) => {
  // 1. If explicit cover_art exists, prioritize it
  if (coverArt) {
    return (
      <div className={`relative overflow-hidden bg-surface-h flex items-center justify-center select-none shrink-0 ${className}`}>
        <img
          src={coverArt}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  const validCovers = coverArtGrid.filter((url) => !!url);

  // 2. If 4 or more covers are available, render a 2x2 grid
  if (validCovers.length >= 4) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 overflow-hidden bg-surface-h select-none shrink-0 ${className}`}>
        {validCovers.slice(0, 4).map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ))}
      </div>
    );
  }

  // 3. If 1 to 3 covers are available, render the first one as a single cover
  if (validCovers.length > 0) {
    return (
      <div className={`relative overflow-hidden bg-surface-h flex items-center justify-center select-none shrink-0 ${className}`}>
        <img
          src={validCovers[0]}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  // 4. Default fallback: render a music placeholder icon
  return (
    <div className={`flex items-center justify-center bg-surface-h text-text4 select-none shrink-0 ${className}`}>
      <ListMusic size={iconSize} />
    </div>
  );
};
