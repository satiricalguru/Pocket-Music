import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { useLibraryStore, type ActiveView } from '../../store/useLibraryStore';
import { useDownloadStore } from '../../store/useDownloadStore';
import { AddUrlBar } from '../downloader/AddUrlBar';
import { DownloadPanel } from '../downloader/DownloadPanel';
import { HomeView } from '../views/HomeView';
import { LibraryView } from '../views/LibraryView';
import { AlbumsView } from '../views/AlbumsView';
import { LikedSongsView } from '../views/LikedSongsView';
import { SearchView } from '../views/SearchView';
import { AlbumDetailView } from '../views/AlbumDetailView';
import { PlaylistView } from '../views/PlaylistView';
import { DownloadsView } from '../views/DownloadsView';
import { DiscordPanel } from '../discord/DiscordPanel';

interface MainPanelProps {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const MainPanel: React.FC<MainPanelProps> = ({ searchInputRef }) => {
  const [viewHistory, setViewHistory] = useState<ActiveView[]>(['home']);
  const [forwardHistory, setForwardHistory] = useState<ActiveView[]>([]);
  const [urlBarVisible, setUrlBarVisible] = useState(true);

  const activeView = useLibraryStore((s) => s.activeView);
  const setActiveView = useLibraryStore((s) => s.setActiveView);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const activeJobs = useDownloadStore((s) =>
    s.jobs.filter((j) => j.status === 'downloading' || j.status === 'fetching')
  );
  const togglePanel = useDownloadStore((s) => s.togglePanel);
  const isPanelOpen = useDownloadStore((s) => s.isPanelOpen);
  const tracks = useLibraryStore((s) => s.tracks);

  const searchInputRefInternal = useRef<HTMLInputElement>(null);
  const searchRef = (searchInputRef ?? searchInputRefInternal) as React.RefObject<HTMLInputElement>;

  // Synchronize activeView changes with history stack
  useEffect(() => {
    setViewHistory((history) => {
      const current = history[history.length - 1];
      if (current === activeView) return history;
      setForwardHistory([]);
      return [...history, activeView];
    });
  }, [activeView]);

  const goBack = () => {
    if (viewHistory.length > 1) {
      const current = viewHistory[viewHistory.length - 1];
      const prev = viewHistory[viewHistory.length - 2];
      setViewHistory((h) => h.slice(0, -1));
      setForwardHistory((f) => [current, ...f]);
      setActiveView(prev);
    }
  };

  const goForward = () => {
    if (forwardHistory.length > 0) {
      const nextView = forwardHistory[0];
      setForwardHistory((f) => f.slice(1));
      setViewHistory((h) => [...h, nextView]);
      setActiveView(nextView);
    }
  };

  const navigateTo = (view: ActiveView) => {
    setActiveView(view);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim() && activeView !== 'search') {
      navigateTo('search');
    }
  };

  // Show URL bar when there are few tracks (onboarding nudge)
  useEffect(() => {
    setUrlBarVisible(tracks.length < 20);
  }, [tracks.length]);

  const renderView = () => {
    if (activeView === 'home') return <HomeView />;
    if (activeView === 'library') return <LibraryView />;
    if (activeView === 'albums') return <AlbumsView />;
    if (activeView === 'liked') return <LikedSongsView />;
    if (activeView === 'search') return <SearchView />;
    if (activeView === 'downloads') return <DownloadsView />;
    if (activeView === 'discord') return <DiscordPanel />;
    if (activeView.startsWith('album-')) {
      return <AlbumDetailView albumId={activeView.slice('album-'.length)} />;
    }
    if (activeView.startsWith('playlist-')) {
      return <PlaylistView playlistId={activeView.slice('playlist-'.length)} />;
    }
    return <HomeView />;
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      {/* Top navigation bar */}
      <div className="flex items-center h-[var(--topbar-h)] px-6 gap-4 shrink-0">
        {/* Back/forward */}
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={viewHistory.length <= 1}
            className="p-1 rounded-full text-text2 hover:text-text1 disabled:text-text4 transition-colors"
            title="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goForward}
            disabled={forwardHistory.length === 0}
            className="p-1 rounded-full text-text2 hover:text-text1 disabled:text-text4 transition-colors"
            title="Go forward"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-[364px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            ref={searchRef}
            type="text"
            placeholder="What do you want to listen to?"
            value={activeView === 'search' ? searchQuery : ''}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => {
              if (!searchQuery) navigateTo('search');
            }}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-input border border-transparent
              text-sm text-text1 placeholder:text-text3
              hover:border-text4 hover:bg-input-h
              focus:border-white focus:outline-none focus:ring-1 focus:ring-white
              transition-all duration-[var(--dur-fast)]"
          />
        </div>

        {/* Downloads toggle */}
        <button
          onClick={togglePanel}
          className="p-2 rounded-full text-text2 hover:text-text1 hover:bg-surface-h transition-colors relative ml-auto"
          title="Downloads"
        >
          <Download size={20} />
          {activeJobs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeJobs.length}
            </span>
          )}
        </button>
      </div>

      {/* URL bar (onboarding) */}
      {urlBarVisible && !activeView.startsWith('playlist-') && !activeView.startsWith('album-') && activeView !== 'liked' && activeView !== 'home' && activeView !== 'downloads' && activeView !== 'search' && <AddUrlBar />}

      {/* Downloads Popover Panel */}
      {isPanelOpen && <DownloadPanel />}

      {/* View content */}
      <div className="flex-1 overflow-y-auto">{renderView()}</div>
    </main>
  );
};
