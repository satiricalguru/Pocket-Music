import React from 'react';

interface EqualizerBarsProps {
  playing: boolean;
  size?: number;
}

export const EqualizerBars: React.FC<EqualizerBarsProps> = ({ playing, size = 12 }) => {
  return (
    <div
      className="flex items-end gap-[2px]"
      style={{ height: size }}
      aria-label={playing ? 'Now playing' : 'Paused'}
    >
      <div
        className="w-[3px] rounded-sm bg-green"
        style={{
          height: playing ? 'var(--eq-h1, 4px)' : '4px',
          animation: playing ? 'eq-bar-1 0.8s ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="w-[3px] rounded-sm bg-green"
        style={{
          height: playing ? 'var(--eq-h2, 12px)' : '4px',
          animation: playing ? 'eq-bar-2 0.6s ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="w-[3px] rounded-sm bg-green"
        style={{
          height: playing ? 'var(--eq-h3, 8px)' : '4px',
          animation: playing ? 'eq-bar-3 0.7s ease-in-out infinite' : 'none',
        }}
      />
    </div>
  );
};
