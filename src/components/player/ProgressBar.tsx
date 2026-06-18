import React, { useCallback, useRef, useState } from 'react';

interface ProgressBarProps {
  progress: number; // 0..100
  onSeek: (percent: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, onSeek }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Optimistic drag position — shown while dragging so the UI is fluid
  const [dragProgress, setDragProgress] = useState(0);

  const getPercent = useCallback((e: MouseEvent | React.MouseEvent): number => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startPct = getPercent(e);
      setDragProgress(startPct);
      setIsDragging(true);

      const handleMove = (ev: MouseEvent) => {
        const pct = getPercent(ev);
        setDragProgress(pct);
      };

      const handleUp = (ev: MouseEvent) => {
        const pct = getPercent(ev);
        setIsDragging(false);
        // Only call onSeek once on mouseup — prevents audio seek flooding
        onSeek(pct);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [getPercent, onSeek]
  );

  // While dragging show the locally tracked position; otherwise show store progress
  const displayProgress = isDragging ? dragProgress : progress;
  const active = isHovering || isDragging;

  return (
    <div
      ref={barRef}
      className="group relative flex items-center w-full rounded-full cursor-pointer"
      style={{
        height: active ? 6 : 4,
        transition: 'height var(--dur-fast) var(--ease-standard)',
        background: 'var(--color-surface)',
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => !isDragging && setIsHovering(false)}
      onMouseDown={handleMouseDown}
    >
      {/* Fill */}
      <div
        className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
        style={{
          width: `${displayProgress}%`,
          background: active ? 'var(--color-green)' : '#fff',
          transition: isDragging ? 'none' : 'background var(--dur-fast) var(--ease-standard)',
        }}
      />
      {/* Thumb — fades in on hover/drag */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg pointer-events-none"
        style={{
          left: `calc(${displayProgress}% - 6px)`,
          opacity: active ? 1 : 0,
          transition: isDragging ? 'none' : 'opacity var(--dur-fast) var(--ease-standard)',
        }}
      />
    </div>
  );
};
