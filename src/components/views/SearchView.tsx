import React, { useEffect, useMemo } from 'react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { TrackTable } from '../library/TrackTable';

export const SearchView: React.FC = () => {
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const tracks = useLibraryStore((s) => s.tracks);

  // Auto-focus the search input (the one in MainPanel topbar)
  useEffect(() => {
    // Brief delay so the MainPanel input mounts
    const timer = setTimeout(() => {
      const mainInput = document.querySelector<HTMLInputElement>(
        'main input[type="text"]'
      );
      mainInput?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="px-6 py-6 fade-in">
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
