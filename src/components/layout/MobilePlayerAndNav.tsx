import React from 'react';
import { Home, Search, Library, Play, Pause, Heart } from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useDominantColor } from '../../hooks/useDominantColor';

export const MobilePlayerAndNav: React.FC = () => {
  const activeView = useLibraryStore((s) => s.activeView);
  const setActiveView = useLibraryStore((s) => s.setActiveView);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const setFullscreen = usePlayerStore((s) => s.setFullscreen);
  const likeTrack = useLibraryStore((s) => s.likeTrack);

  const bgColor = useDominantColor(currentTrack?.cover_art_url);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  const handleMiniPlayerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setFullscreen(true);
  };

  const isLibraryActive =
    activeView === 'library' ||
    activeView === 'library-tracks' ||
    activeView === 'liked' ||
    activeView === 'downloads' ||
    activeView === 'soundboard' ||
    activeView === 'discord' ||
    activeView.startsWith('playlist-') ||
    activeView.startsWith('album-');

  return (
    <div className="flex flex-col shrink-0 bg-[#000000] z-30 border-t border-border/40 pb-safe-bottom">
      {/* Floating Mini Player */}
      {currentTrack && (
        <div
          onClick={handleMiniPlayerClick}
          className="mx-2 my-1.5 h-14 rounded-md flex items-center justify-between px-3 relative overflow-hidden cursor-pointer shadow-lg select-none"
          style={{
            backgroundColor: bgColor ? `${bgColor}d0` : '#1a1a1acc',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Left: Cover & Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded overflow-hidden bg-surface shrink-0">
              {currentTrack.cover_art_url ? (
                <img
                  src={currentTrack.cover_art_url}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text4">
                  <Library size={16} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text1 truncate max-w-[200px]">
                {currentTrack.title}
              </div>
              <div className="text-[10px] text-text2 truncate max-w-[200px]">
                {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => void likeTrack(currentTrack.id, !currentTrack.is_liked)}
              className="p-2 text-text2 hover:scale-105 transition-transform"
            >
              <Heart
                size={20}
                className={currentTrack.is_liked ? 'text-green fill-green' : 'text-text2'}
              />
            </button>
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shrink-0 hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause size={16} fill="black" className="text-black" />
              ) : (
                <Play size={16} fill="black" className="text-black ml-0.5" />
              )}
            </button>
          </div>

          {/* Bottom Progress Line */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="h-14 flex items-center justify-around text-text3 py-1">
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center justify-center w-20 ${
            activeView === 'home' ? 'text-text1' : 'hover:text-text2'
          }`}
        >
          <Home size={20} className={activeView === 'home' ? 'text-text1' : ''} />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>

        <button
          onClick={() => setActiveView('search')}
          className={`flex flex-col items-center justify-center w-20 ${
            activeView === 'search' ? 'text-text1' : 'hover:text-text2'
          }`}
        >
          <Search size={20} className={activeView === 'search' ? 'text-text1' : ''} />
          <span className="text-[10px] mt-1 font-medium">Search</span>
        </button>

        <button
          onClick={() => setActiveView('library')}
          className={`flex flex-col items-center justify-center w-20 ${
            isLibraryActive ? 'text-text1' : 'hover:text-text2'
          }`}
        >
          <Library size={20} className={isLibraryActive ? 'text-text1' : ''} />
          <span className="text-[10px] mt-1 font-medium">Library</span>
        </button>
      </div>
    </div>
  );
};
