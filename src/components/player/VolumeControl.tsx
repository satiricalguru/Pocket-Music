import React, { useCallback, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
  VolumeIcon: LucideIcon;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  VolumeIcon,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Optimistic drag volume so the slider feels instant
  const [dragVolume, setDragVolume] = useState(0);

  const displayPct = isMuted ? 0 : (isDragging ? dragVolume : volume) * 100;
  const active = isHovering || isDragging;

  const getVolume = useCallback((e: MouseEvent | React.MouseEvent): number => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startVol = getVolume(e);
      setDragVolume(startVol);
      setIsDragging(true);

      const handleMove = (ev: MouseEvent) => {
        const v = getVolume(ev);
        setDragVolume(v);
      };
      const handleUp = (ev: MouseEvent) => {
        const v = getVolume(ev);
        setIsDragging(false);
        onVolumeChange(v);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [getVolume, onVolumeChange]
  );

  return (
    <div
      className="flex items-center gap-1 group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => !isDragging && setIsHovering(false)}
    >
      <button
        onClick={onMuteToggle}
        className={`p-1 transition-colors ${
          isMuted ? 'text-text3' : 'text-text2 hover:text-text1'
        }`}
      >
        <VolumeIcon size={16} />
      </button>
      <div
        ref={barRef}
        className="relative w-[93px] flex items-center rounded-full cursor-pointer"
        style={{
          height: active ? 6 : 4,
          background: 'var(--color-surface)',
          transition: 'height var(--dur-fast) var(--ease-standard)',
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
          style={{
            width: `${displayPct}%`,
            background: active ? 'var(--color-green)' : '#fff',
            transition: isDragging ? 'none' : 'background var(--dur-fast) var(--ease-standard)',
          }}
        />
        {active && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg pointer-events-none"
            style={{
              left: `calc(${displayPct}% - 6px)`,
              transition: isDragging ? 'none' : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
};
