import React, { useMemo } from 'react';
import { useLibraryStore } from '../../store/useLibraryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { TrackTable } from '../library/TrackTable';
import { AddUrlBar } from '../downloader/AddUrlBar';

export const HomeView: React.FC = () => {
  const tracks = useLibraryStore((s) => s.tracks);

  const recentTracks = useMemo(
    () =>
      tracks
        .slice()
        .sort((a, b) => b.added_at - a.added_at)
        .slice(0, 20),
    [tracks]
  );

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-surface flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-text3">
              <path
                d="M9 18V5l12-2v13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Your Pocket Music library is empty</h1>
          <p className="text-text2 mb-6">
            Paste a Spotify link above to download music locally. Tracks, albums, and playlists — all saved on your disk.
          </p>
          <AddUrlBar expanded />
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 fade-in">
      <h1 className="text-2xl font-bold mb-6">Good evening</h1>

      {/* Quick access grid — up to 6 recently added tracks */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-8">
        {recentTracks.slice(0, 6).map((track) => {
          const isCurrentlyPlaying =
            usePlayerStore.getState().currentTrack?.id === track.id &&
            usePlayerStore.getState().isPlaying;
          return (
            <div
              key={track.id}
              className="flex items-center bg-surface hover:bg-surface-h rounded overflow-hidden cursor-pointer group transition-colors"
              style={{ minHeight: 64 }}
              onClick={() => {
                const player = usePlayerStore.getState();
                player.play(track, recentTracks);
              }}
            >
              {track.cover_art_url ? (
                <img
                  src={track.cover_art_url}
                  alt=""
                  className="w-16 h-16 object-cover shrink-0"
                  draggable={false}
                />
              ) : (
                <div className="w-16 h-16 bg-highlight shrink-0 flex items-center justify-center text-text4">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12 2v10c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V4L7 5v7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V3l6-1z" />
                  </svg>
                </div>
              )}
              <span className="text-sm font-bold px-4 text-text1 truncate flex-1">
                {track.title}
              </span>
              <div className="mr-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <div className="w-10 h-10 rounded-full bg-green flex items-center justify-center shadow-lg">
                  {isCurrentlyPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="black">
                      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="black">
                      <polygon points="6,3 20,12 6,21" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent tracks table */}
      <h2 className="text-xl font-bold mb-4">Recently added</h2>
      <TrackTable tracks={recentTracks} showAlbum />
    </div>
  );
};
