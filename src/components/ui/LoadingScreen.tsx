import React from 'react';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-black">
    <div className="w-16 h-16 mb-6 rounded-full bg-green flex items-center justify-center animate-pulse">
      <svg width="32" height="32" viewBox="0 0 16 16" fill="white">
        <path d="M11.5 8C11.5 8 9 9.5 9 12C9 13.1 9.9 14 11 14C12.1 14 13 13.1 13 12C13 9.5 11.5 8 11.5 8ZM5.5 5C5.5 5 3 6.5 3 9C3 10.1 3.9 11 5 11C6.1 11 7 10.1 7 9C7 6.5 5.5 5 5.5 5ZM11.5 3C11.5 3 9 4.5 9 7C9 8.1 9.9 9 11 9C12.1 9 13 8.1 13 7C13 4.5 11.5 3 11.5 3ZM5.5 2C5.5 2 3 3.5 3 6C3 7.1 3.9 8 5 8C6.1 8 7 7.1 7 6C7 3.5 5.5 2 5.5 2Z" />
      </svg>
    </div>
    <div className="text-text2 text-sm mb-3">Pocket Music</div>
    <div className="w-6 h-6 rounded-full border-2 border-text4 border-t-green animate-spin" />
    {message && <div className="text-text3 text-xs mt-3">{message}</div>}
  </div>
);
