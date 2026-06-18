import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RenamePlaylistModalProps {
  currentName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

export const RenamePlaylistModal: React.FC<RenamePlaylistModalProps> = ({
  currentName,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-elevated rounded-lg shadow-2xl w-full max-w-md border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Edit details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-text3 hover:text-text1 hover:bg-surface-h transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <label className="block text-xs uppercase tracking-wider text-text3 mb-2 font-bold">
            Playlist name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoFocus
            className="w-full h-11 px-4 rounded bg-input border-2 border-transparent focus:border-white outline-none text-sm text-text1 placeholder:text-text3 transition-colors"
          />
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full text-sm font-bold text-text2 hover:text-text1 hover:scale-105 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-full text-sm font-bold bg-green text-black hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
