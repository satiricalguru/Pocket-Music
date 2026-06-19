import React, { useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { TrackTable } from '../library/TrackTable';
import { useIsMobile } from '../../hooks/useIsMobile';

export const SearchView: React.FC = () => {
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const tracks = useLibraryStore((s) => s.tracks);
  const isMobile = useIsMobile();

  // Auto-focus the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      // On mobile, let's focus the input inside the search view
      const targetInput = isMobile
        ? document.querySelector<HTMLInputElement>('.mobile-search-input')
        : document.querySelector<HTMLInputElement>('main input[type="text"]');
      targetInput?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const results = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album ?? '').toLowerCase().includes(q)
    );
  }, [searchQuery, tracks]);

  return (
    <div className="px-6 py-6 fade-in pb-24">
      {/* Mobile-only header and search input */}
      {isMobile && (
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-text1 mb-4 select-none">Search</h1>
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3" />
            <input
              type="text"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-input w-full h-12 pl-12 pr-4 rounded-md bg-highlight border border-transparent
                text-sm text-text1 placeholder:text-text3
                hover:border-text4 hover:bg-input-h
                focus:border-white focus:outline-none focus:ring-1 focus:ring-white
                transition-all duration-[var(--dur-fast)]"
            />
          </div>
        </div>
      )}

      {searchQuery.trim() ? (
        <>
          <h2 className="text-xl font-bold mb-4">
            Results for "{searchQuery}"
          </h2>
          {results.length === 0 ? (
            <div className="text-center py-20 text-text3">
              <p className="text-lg mb-2">No results found</p>
              <p className="text-sm">
                Try searching for something else, or{' '}
                <span className="text-green cursor-pointer hover:underline">
                  paste a Spotify link
                </span>{' '}
                to add new music.
              </p>
            </div>
          ) : (
            <TrackTable tracks={results} showAlbum />
          )}
        </>
      ) : (
        <div className="text-center py-20 text-text3">
          <p className="text-lg mb-2">Search your library</p>
          <p className="text-sm">Find songs, artists, and albums in your local collection.</p>
        </div>
      )}
    </div>
  );
};
