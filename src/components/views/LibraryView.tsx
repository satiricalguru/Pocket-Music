import React, { useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Music2,
  ListMusic,
  Heart,
  Download,
  Radio,
  Plus,
} from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { SortField } from '../../types';
import { TrackTable } from '../library/TrackTable';
import { useIsMobile } from '../../hooks/useIsMobile';
import { PlaylistCover } from '../ui/PlaylistCover';

interface LibraryViewProps {
  forceTracksView?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ forceTracksView = false }) => {
  const isMobile = useIsMobile();
  const tracks = useLibraryStore((s) => s.tracks);
  const playlists = useLibraryStore((s) => s.playlists);
  const setActiveView = useLibraryStore((s) => s.setActiveView);
  
  const sortField = useLibraryStore((s) => s.sortField);
  const sortDir = useLibraryStore((s) => s.sortDir);
  const setSort = useLibraryStore((s) => s.setSort);

  const likedCount = useMemo(() => tracks.filter((t) => t.is_liked).length, [tracks]);

  const sortedTracks = useMemo(() => {
    const mul = sortDir === 'desc' ? -1 : 1;
    return tracks.slice().sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * mul;
      }
      return String(va).localeCompare(String(vb)) * mul;
    });
  }, [tracks, sortField, sortDir]);

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  const handleCreatePlaylist = async () => {
    const name = `My Playlist #${playlists.length + 1}`;
    await useLibraryStore.getState().createPlaylist(name);
  };

  const showMobileView = isMobile && !forceTracksView;

  if (showMobileView) {
    return (
      <div className="px-5 py-4 fade-in pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Library</h1>
          <button
            onClick={handleCreatePlaylist}
            className="p-2 rounded-full hover:bg-surface-h text-text2 hover:text-text1 transition-colors"
            title="Create playlist"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Library Hub Rows */}
        <div className="space-y-1">
          {/* Liked Songs */}
          <button
            onClick={() => setActiveView('liked')}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-h transition-colors text-left"
          >
            <div
              className="w-12 h-12 rounded flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #450af5 0%, #c4efd9 100%)',
              }}
            >
              <Heart size={20} fill="white" className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text1 text-sm">Liked Songs</div>
              <div className="text-xs text-text3 mt-0.5">
                {likedCount} {likedCount === 1 ? 'song' : 'songs'}
              </div>
            </div>
          </button>

          {/* All Tracks */}
          <button
            onClick={() => setActiveView('library-tracks')}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-h transition-colors text-left"
          >
            <div className="w-12 h-12 rounded bg-highlight flex items-center justify-center shrink-0">
              <Music2 size={20} className="text-green" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text1 text-sm">All Songs</div>
              <div className="text-xs text-text3 mt-0.5">
                {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
              </div>
            </div>
          </button>

          {/* Downloads */}
          <button
            onClick={() => setActiveView('downloads')}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-h transition-colors text-left"
          >
            <div className="w-12 h-12 rounded bg-highlight flex items-center justify-center shrink-0">
              <Download size={20} className="text-text2" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text1 text-sm">Downloads</div>
              <div className="text-xs text-text3 mt-0.5">Offline music</div>
            </div>
          </button>

          {/* Soundboard */}
          <button
            onClick={() => setActiveView('soundboard')}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-h transition-colors text-left"
          >
            <div className="w-12 h-12 rounded bg-highlight flex items-center justify-center shrink-0">
              <Radio size={20} className="text-text2" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text1 text-sm">Soundboard</div>
              <div className="text-xs text-text3 mt-0.5">Interactive board</div>
            </div>
          </button>

          {/* Discord */}
          <button
            onClick={() => setActiveView('discord')}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-h transition-colors text-left"
          >
            <div className="w-12 h-12 rounded bg-highlight flex items-center justify-center shrink-0 text-text2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text1 text-sm">Discord Presence</div>
              <div className="text-xs text-text3 mt-0.5">Streaming presence</div>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-white/10" />

        {/* Playlists List */}
        <h2 className="text-sm font-bold text-text2 px-2 mb-2">Playlists</h2>
        <div className="space-y-1">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setActiveView(`playlist-${pl.id}`)}
              className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-h transition-colors text-left"
            >
              <PlaylistCover
                coverArt={pl.cover_art}
                coverArtGrid={pl.cover_art_grid}
                iconSize={16}
                className="w-12 h-12 rounded shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-text1 text-sm truncate">{pl.name}</div>
                <div className="text-xs text-text3 mt-0.5 font-normal">
                  {pl.track_count ?? 0} {(pl.track_count ?? 0) === 1 ? 'song' : 'songs'}
                </div>
              </div>
            </button>
          ))}
          {playlists.length === 0 && (
            <div className="px-2 py-4 text-text3 text-xs">
              No playlists yet. Create one above!
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop / Force tracks view
  return (
    <div className="px-6 py-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Library</h1>
        <div className="flex items-center gap-2">
          <span className="text-text3 text-sm">{tracks.length} tracks</span>
        </div>
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-4 mb-4 text-xs text-text3">
        {([
          { field: 'title' as SortField, label: 'Title', icon: Music2 },
          { field: 'artist' as SortField, label: 'Artist', icon: Music2 },
          { field: 'album' as SortField, label: 'Album', icon: ListMusic },
          { field: 'added_at' as SortField, label: 'Date added', icon: Clock },
          { field: 'play_count' as SortField, label: 'Plays', icon: Music2 },
        ]).map((item) => (
          <button
            key={item.field}
            onClick={() => setSort(item.field)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              sortField === item.field
                ? 'text-text1 bg-surface'
                : 'hover:text-text2'
            }`}
          >
            {item.label}
            {sortField === item.field && <SortIcon size={10} />}
          </button>
        ))}
      </div>

      <TrackTable tracks={sortedTracks} showAlbum />
    </div>
  );
};
