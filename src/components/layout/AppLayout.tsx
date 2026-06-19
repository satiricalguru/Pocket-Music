import React from 'react';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';
import { PlayerBar } from './PlayerBar';
import { WindowsTitleBar } from '../titlebar/WindowsTitleBar';
import { MacOSDragRegion } from '../titlebar/MacOSDragRegion';

import { SettingsModal } from '../modals/SettingsModal';
import { Toast } from '../ui/Toast';
import { usePlayerStore } from '../../store/usePlayerStore';
import { NowPlayingPanel } from './NowPlayingPanel';
import { FullscreenView } from '../player/FullscreenView';

import { FfmpegMissingModal } from '../modals/FfmpegMissingModal';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobilePlayerAndNav } from './MobilePlayerAndNav';
import { MobileNowPlaying } from './MobileNowPlaying';

interface AppLayoutProps {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  hasFfmpeg: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ searchInputRef, hasFfmpeg }) => {
  const [platform, setPlatform] = React.useState<string>('darwin');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [showFfmpegModal, setShowFfmpegModal] = React.useState(!hasFfmpeg);

  const isMobile = useIsMobile();

  React.useEffect(() => {
    setPlatform(window.spotlocal.getPlatform());
  }, []);

  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';

  const isNowPlayingOpen = usePlayerStore((s) => s.isNowPlayingOpen);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const setSidebarWidth = usePlayerStore((s) => s.setSidebarWidth);
  const setNowPlayingWidth = usePlayerStore((s) => s.setNowPlayingWidth);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(120, Math.min(450, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleNowPlayingMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(450, window.innerWidth - moveEvent.clientX));
      setNowPlayingWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base">
      {/* Windows custom titlebar or macOS drag region */}
      {!isMobile && (
        isWindows ? (
          <WindowsTitleBar />
        ) : isMac ? (
          <MacOSDragRegion />
        ) : null
      )}

      {/* Main content area: sidebar + main panel */}
      <div className="flex flex-1 min-h-0 relative">
        {!isMobile && <Sidebar onOpenSettings={() => setSettingsOpen(true)} />}
        
        {/* Left Sidebar Resize Handle */}
        {!isMobile && (
          <div
            onMouseDown={handleSidebarMouseDown}
            className="w-[2px] hover:w-[4px] bg-[#282828] hover:bg-[#b3b3b3] active:bg-green cursor-col-resize transition-all z-20 shrink-0 h-full"
          />
        )}

        <MainPanel
          searchInputRef={searchInputRef}
          isMobile={isMobile}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Right NowPlayingPanel Resize Handle */}
        {!isMobile && isNowPlayingOpen && currentTrack && (
          <div
            onMouseDown={handleNowPlayingMouseDown}
            className="w-[2px] hover:w-[4px] bg-[#282828] hover:bg-[#b3b3b3] active:bg-green cursor-col-resize transition-all z-20 shrink-0 h-full"
          />
        )}
        
        {!isMobile && isNowPlayingOpen && currentTrack && <NowPlayingPanel />}
      </div>

      {/* Bottom Player / Nav Bar */}
      {isMobile ? <MobilePlayerAndNav /> : <PlayerBar />}

      {/* Toast container */}
      <Toast />

      {/* Settings modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* ffmpeg missing modal alert */}
      {showFfmpegModal && (
        <FfmpegMissingModal onClose={() => setShowFfmpegModal(false)} />
      )}

      {/* Fullscreen presentation view */}
      {isFullscreen && currentTrack && (
        isMobile ? <MobileNowPlaying /> : <FullscreenView />
      )}
    </div>
  );
};
