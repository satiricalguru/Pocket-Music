import React from 'react';

export const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <div
    className="rounded-full border-2 border-text4 border-t-green animate-spin"
    style={{ width: size, height: size }}
  />
);
