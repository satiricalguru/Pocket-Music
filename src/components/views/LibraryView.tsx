import React, { useMemo } from 'react';
import { ArrowDown, ArrowUp, Clock, Music2, ListMusic } from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { SortField } from '../../types';
import { TrackTable } from '../library/TrackTable';

export const LibraryView: React.FC = () => {
  const tracks = useLibraryStore((s) => s.tracks);
  const sortField = useLibraryStore((s) => s.sortField);
  const sortDir = useLibraryStore((s) => s.sortDir);
  const setSort = useLibraryStore((s) => s.setSort);

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
