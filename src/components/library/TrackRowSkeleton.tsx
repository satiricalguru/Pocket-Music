import React from 'react';

/** Skeleton placeholder row for loading states. */
export const TrackRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 h-14 animate-pulse">
    <div className="w-4 h-4 bg-surface-h rounded" />
    <div className="w-10 h-10 bg-surface-h rounded shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 bg-surface-h rounded" />
      <div className="h-3 w-1/4 bg-surface-h rounded" />
    </div>
    <div className="w-1/4 h-3 bg-surface-h rounded hidden md:block" />
    <div className="w-12 h-3 bg-surface-h rounded" />
  </div>
);
