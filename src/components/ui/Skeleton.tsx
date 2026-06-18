import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-surface-h rounded animate-pulse ${className}`} />
);
