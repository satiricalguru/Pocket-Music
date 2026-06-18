import React from 'react';

/** Invisible drag region for macOS to complement native traffic lights. */
export const MacOSDragRegion: React.FC = () => (
  <div
    className="absolute top-0 left-0 right-0 h-[28px] macos-drag-region z-10 pointer-events-none"
  />
);
