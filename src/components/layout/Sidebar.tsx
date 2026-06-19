import React, { useCallback } from 'react';
import {
  Home,
  Search,
  Download,
  Library,
  Plus,
  Heart,
  ListMusic,
  Settings,
  Radio,
} from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { PlaylistCover } from '../ui/PlaylistCover';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useDiscordStore } from '../../store/useDiscordStore';
import type { ActiveView } from '../../store/useLibraryStore';
import type { Track } from '../../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-4 w-full px-3 py-2 rounded-md text-sm font-semibold
      transition-colors duration-[var(--dur-fast)]
      ${active ? 'text-text1' : 'text-text2 hover:text-text1'}
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const activeView = useLibraryStore((s) => s.activeView);
  const setActiveView = useLibraryStore((s) => s.setActiveView);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedCount = useLibraryStore((s) => s.tracks.filter((t) => t.is_liked).length);
  const sidebarWidth = usePlayerStore((s) => s.sidebarWidth);
  const discordStatus = useDiscordStore((s) => s.status);

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
  };

  const handlePlaylistClick = (playlistId: string) => {
    setActiveView(`playlist-${playlistId}`);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, playlistId: string) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/spotlocal-track');
      if (data) {
        try {
          const track = JSON.parse(data) as Track;
          void useLibraryStore.getState().addToPlaylist(track.id, playlistId);
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  const handleCreatePlaylist = async () => {
    const name = `My Playlist #${playlists.length + 1}`;
    await useLibraryStore.getState().createPlaylist(name);
  };

  return (
    <aside
      className="flex flex-col shrink-0 bg-black"
      style={{ width: sidebarWidth }}
    >
      {/* Spacer for macOS traffic lights */}
      <div className="h-[28px] macos-drag-region" />

      {/* SpotLocal branding */}
      <div className="px-6 pt-4 pb-2 macos-drag-region">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <path d="M11.5 8C11.5 8 9 9.5 9 12C9 13.1 9.9 14 11 14C12.1 14 13 13.1 13 12C13 9.5 11.5 8 11.5 8ZM5.5 5C5.5 5 3 6.5 3 9C3 10.1 3.9 11 5 11C6.1 11 7 10.1 7 9C7 6.5 5.5 5 5.5 5ZM11.5 3C11.5 3 9 4.5 9 7C9 8.1 9.9 9 11 9C12.1 9 13 8.1 13 7C13 4.5 11.5 3 11.5 3ZM5.5 2C5.5 2 3 3.5 3 6C3 7.1 3.9 8 5 8C6.1 8 7 7.1 7 6C7 3.5 5.5 2 5.5 2Z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Pocket Music</span>
        </div>
      </div>

      {/* Nav section */}
      <nav className="px-3 pt-2 space-y-1">
        <NavItem
          icon={<Home size={24} />}
          label="Home"
          active={activeView === 'home'}
          onClick={() => handleNavClick('home')}
        />
        <NavItem
          icon={<Search size={24} />}
          label="Search"
          active={activeView === 'search'}
          onClick={() => handleNavClick('search')}
        />
        <NavItem
          icon={<Download size={24} />}
          label="Downloads"
          active={activeView === 'downloads'}
          onClick={() => handleNavClick('downloads')}
        />
        <NavItem
          icon={<Radio size={24} />}
          label="Soundboard"
          active={activeView === 'soundboard'}
          onClick={() => handleNavClick('soundboard')}
        />
        {/* Discord with live indicator */}
        <button
          onClick={() => handleNavClick('discord')}
          className={`
            flex items-center gap-4 w-full px-3 py-2 rounded-md text-sm font-semibold
            transition-colors duration-[var(--dur-fast)]
            ${activeView === 'discord' ? 'text-text1' : 'text-text2 hover:text-text1'}
          `}
        >
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            {(discordStatus === 'streaming' || discordStatus === 'ready') && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 ring-1 ring-black" />
            )}
          </div>
          <span>Discord</span>
          {discordStatus === 'streaming' && (
            <span className="ml-auto text-[10px] font-bold text-green-400 uppercase tracking-wider">Live</span>
          )}
        </button>
      </nav>

      {/* Divider */}
      <div className="mx-6 my-3 border-t border-white/10" />

      {/* Library section */}
      <div className="px-6 flex items-center justify-between mb-2">
        <button
          onClick={() => handleNavClick('library')}
          className="flex items-center gap-2 text-text2 hover:text-text1 transition-colors macos-no-drag"
        >
          <Library size={24} />
          <span className="text-sm font-semibold">Your Library</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreatePlaylist}
            className="p-1.5 rounded-full text-text3 hover:text-text1 hover:bg-surface-h transition-colors"
            title="Create playlist"
          >
            <Plus size={20} />
          </button>
          <button className="p-1.5 rounded-full text-text3 hover:text-text1 hover:bg-surface-h transition-colors">
            <ListMusic size={20} />
          </button>
        </div>
      </div>

      {/* Library list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {/* Liked Songs */}
        <button
          onClick={() => handleNavClick('liked')}
          className={`
            flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm
            transition-colors duration-[var(--dur-fast)]
            ${activeView === 'liked' ? 'text-text1' : 'text-text2 hover:text-text1'}
          `}
        >
          <div className="w-12 h-12 rounded flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #450af5 0%, #c4efd9 100%)',
            }}
          >
            <Heart size={16} fill="white" className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-text1 truncate">Liked Songs</div>
            <div className="text-xs text-text3">
              {likedCount} {likedCount === 1 ? 'song' : 'songs'}
            </div>
          </div>
        </button>

        {/* Playlists */}
        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => handlePlaylistClick(pl.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, pl.id)}
            className={`
              flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm
              transition-colors duration-[var(--dur-fast)]
              ${activeView === `playlist-${pl.id}` ? 'text-text1 font-medium' : 'text-text2 hover:text-text1'}
            `}
          >
            <PlaylistCover
              coverArt={pl.cover_art}
              coverArtGrid={pl.cover_art_grid}
              iconSize={16}
              className="w-12 h-12 rounded"
            />
            <div className="min-w-0">
              <div className="truncate">{pl.name}</div>
              <div className="text-xs text-text3">
                {pl.track_count ?? 0} {(pl.track_count ?? 0) === 1 ? 'song' : 'songs'}
              </div>
            </div>
          </button>
        ))}

        {playlists.length === 0 && likedCount === 0 && (
          <div className="px-3 py-6 text-center text-text3 text-xs">
            <p>No playlists yet.</p>
            <p className="mt-1">Create one with the + button above.</p>
          </div>
        )}
      </div>

      {/* Settings button at bottom */}
      <div className="px-3 py-3 border-t border-white/5">
        <button onClick={onOpenSettings} className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-text2 hover:text-text1 transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
