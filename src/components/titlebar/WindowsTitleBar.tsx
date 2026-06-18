import React from 'react';

/**
 * Custom title bar for Windows (frame: false). macOS uses native traffic lights.
 */
export const WindowsTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  React.useEffect(() => {
    const onResize = () => {
      const maximized = window.outerWidth === screen.availWidth;
      document.documentElement.classList.toggle('maximized', maximized);
      setIsMaximized(maximized);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleDoubleClick = () => {
    void window.spotlocal.maximizeWindow();
    setIsMaximized((v) => !v);
  };

  return (
    <div
      className="flex items-center h-8 bg-base select-none shrink-0"
      onDoubleClick={handleDoubleClick}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex-1" />
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => void window.spotlocal.minimizeWindow()}
          className="w-[46px] h-full flex items-center justify-center text-text2 hover:text-text1 transition-colors"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={() => void window.spotlocal.maximizeWindow()}
          className="w-[46px] h-full flex items-center justify-center text-text2 hover:text-text1 transition-colors"
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3L3.5 3L3.5 6.5L7 6.5L7 8L2 8L2 3Z" stroke="currentColor" strokeWidth="1" />
              <path d="M8 7L6.5 7L6.5 3.5L3 3.5L3 2L8 2L8 7Z" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button
          onClick={() => void window.spotlocal.closeWindow()}
          className="w-[46px] h-full flex items-center justify-center text-text2 hover:bg-red-500 hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
