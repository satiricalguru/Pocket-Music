import React, { useMemo, useState } from 'react';
import { X, Heart, ExternalLink, ShieldCheck } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';

export const NowPlayingPanel: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const toggleNowPlaying = usePlayerStore((s) => s.toggleNowPlaying);
  const nowPlayingWidth = usePlayerStore((s) => s.nowPlayingWidth);
  
  const likeTrack = useLibraryStore((s) => s.likeTrack);
  const [isFollowing, setIsFollowing] = useState(false);

  const artistData = useMemo(() => {
    if (!currentTrack) return { listeners: '0', bio: '' };
    const artistName = currentTrack.artist;
    let hash = 0;
    for (let i = 0; i < artistName.length; i++) {
      hash = artistName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const listeners = Math.abs(hash % 45000000) + 5000000; // between 5M and 50M
    const formattedListeners = new Intl.NumberFormat().format(listeners);

    const bios: Record<string, string> = {
      'Coldplay': 'Coldplay are a British rock band formed in London in 1996. They have won seven Grammy Awards and sold over 100 million albums worldwide, making them one of the most successful bands of the 21st century.',
      'One Direction': 'One Direction are an English-Irish pop boy band formed in London in 2010. They have become one of the best-selling boy bands of all time, winning numerous awards and embarking on massive global tours.',
      'Selena Gomez': 'Selena Gomez is an American singer, songwriter, actress, and producer. She has sold over 7 million albums and 22 million singles worldwide, and has a massive global fan base.',
      'Taylor Swift': 'Taylor Swift is an American singer-songwriter. Famous for her narrative songwriting and musical versatility, she is one of the best-selling music artists of all time.',
      'Ed Sheeran': 'Ed Sheeran is an English singer-songwriter. He has sold more than 150 million records worldwide, making him one of the world\'s best-selling music artists.',
      'Justin Bieber': 'Justin Bieber is a Canadian singer. He is recognized for his genre-melding musicianship and has played an influential role in modern popular music.',
    };

    const bio = bios[artistName] || `${artistName} is a featured artist on Pocket Music. Discover more of their work in your local library and enjoy high-fidelity offline audio playback.`;
    return { listeners: formattedListeners, bio };
  }, [currentTrack]);

  const nextTrack = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      return queue[currentIndex + 1];
    }
    return null;
  }, [queue, currentIndex]);

  if (!currentTrack) return null;

  return (
    <aside
      className="shrink-0 bg-[#121212] border-l border-[#282828] flex flex-col h-full overflow-hidden select-none z-10"
      style={{ width: nowPlayingWidth }}
    >
      {/* Header */}
      <div className="h-[var(--topbar-h)] px-4 flex items-center justify-between border-b border-[#282828] shrink-0">
        <span className="font-bold text-sm text-text1 hover:underline cursor-pointer truncate max-w-[200px]">
          {currentTrack.album || 'Now Playing'}
        </span>
        <button
          onClick={toggleNowPlaying}
          className="p-1 rounded-full text-text3 hover:text-text1 hover:bg-surface-h transition-colors"
          title="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Large Cover Art */}
        <div className="w-full aspect-square rounded-lg overflow-hidden bg-surface shadow-2xl relative group">
          {currentTrack.cover_art_url ? (
            <img
              src={currentTrack.cover_art_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text4">
              <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12 2v10c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V4L7 5v7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V3l6-1z" />
              </svg>
            </div>
          )}
        </div>

        {/* Title & Artist & Like */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-text1 truncate hover:underline cursor-pointer">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-text2 truncate hover:underline cursor-pointer hover:text-text1 mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={() => void likeTrack(currentTrack.id, !currentTrack.is_liked)}
            className="text-text2 hover:scale-110 transition-transform shrink-0"
          >
            <Heart
              size={20}
              className={
                currentTrack.is_liked
                  ? 'text-green fill-green'
                  : 'hover:text-text1'
              }
            />
          </button>
        </div>

        {/* About the Artist card */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text1">About the artist</h3>
          <div className="relative rounded-lg overflow-hidden h-[230px] bg-surface flex flex-col justify-end p-4 shadow-lg group">
            {/* Background image blur/dark filter */}
            <div className="absolute inset-0">
              {currentTrack.cover_art_url ? (
                <img
                  src={currentTrack.cover_art_url}
                  alt=""
                  className="w-full h-full object-cover filter brightness-[0.4] group-hover:scale-105 transition-transform duration-[400ms]"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-[#1e1e1e]" />
              )}
              {/* Soft dark vertical gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            {/* Foreground details */}
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-text1 uppercase tracking-wider">
                <ShieldCheck size={14} className="text-[#3d91f4] fill-[#3d91f4] stroke-white" />
                <span>Verified Artist</span>
              </div>
              <h4 className="text-base font-bold text-text1 leading-tight truncate">
                {currentTrack.artist}
              </h4>
              <p className="text-xs text-text2 line-clamp-2 leading-relaxed">
                {artistData.listeners} monthly listeners. {artistData.bio}
              </p>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 ${
                    isFollowing
                      ? 'bg-transparent border border-text3 text-text1 hover:border-text1'
                      : 'bg-text1 text-black hover:bg-white'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                {currentTrack.spotify_id && (
                  <button
                    onClick={() =>
                      void window.spotlocal.openExternal(
                        `https://open.spotify.com/artist/${currentTrack.spotify_id}`
                      )
                    }
                    className="p-1.5 rounded-full bg-black/40 text-text2 hover:text-text1 hover:bg-black/60 transition-colors"
                    title="Open artist page on Spotify"
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Next in Queue card */}
        {nextTrack && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text1">Next in queue</h3>
              <button
                onClick={() => useLibraryStore.getState().setActiveView('library')}
                className="text-xs font-bold text-text2 hover:text-text1 hover:underline cursor-pointer"
              >
                Open queue
              </button>
            </div>
            <div className="flex items-center gap-3 p-2 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-colors cursor-default group">
              <div className="w-10 h-10 rounded overflow-hidden bg-surface shrink-0">
                {nextTrack.cover_art_url ? (
                  <img
                    src={nextTrack.cover_art_url}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text4">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M12 2v10c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V4L7 5v7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.35 0 .7.1 1 .27V3l6-1z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text1 truncate">
                  {nextTrack.title}
                </p>
                <p className="text-xs text-text2 truncate">
                  {nextTrack.artist}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
