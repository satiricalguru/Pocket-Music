import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';

interface AddToPlaylistModalProps {
  trackId: string;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ trackId, onClose }) => {
  const playlists = useLibraryStore((s) => s.playlists);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAdd = async (playlistId: string) => {
    await addToPlaylist(trackId, playlistId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-elevated rounded-lg shadow-2xl w-full max-w-md max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Add to playlist</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-text3 hover:text-text1 hover:bg-surface-h transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {playlists.length === 0 ? (
            <div className="px-6 py-8 text-center text-text3 text-sm">
              You don't have any playlists yet.
            </div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => void handleAdd(pl.id)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-surface/60 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded bg-surface flex items-center justify-center shrink-0">
                  <Check size={16} className="text-text3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text1 truncate">{pl.name}</div>
                  <div className="text-xs text-text3">
                    {pl.track_count ?? 0} {(pl.track_count ?? 0) === 1 ? 'song' : 'songs'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
