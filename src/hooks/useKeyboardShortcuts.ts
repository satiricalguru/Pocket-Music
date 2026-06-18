import { useEffect, type RefObject } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

export function useKeyboardShortcuts(searchInputRef?: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Allow a few shortcuts even in inputs
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      const player = usePlayerStore.getState();
      const meta = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (meta || e.shiftKey) {
            player.next();
          } else {
            player.seek(Math.min(player.progress + 5, player.duration));
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (meta || e.shiftKey) {
            player.prev();
          } else {
            player.seek(Math.max(player.progress - 5, 0));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.setVolume(player.volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.setVolume(player.volume - 0.05);
          break;
        case 'm':
        case 'M':
          player.toggleMute();
          break;
        case 'l':
        case 'L': {
          const current = player.currentTrack;
          if (current) {
            void useLibraryStore.getState().likeTrack(current.id, !current.is_liked);
          }
          break;
        }
        case 'Escape':
          // Close modals/panels — handled by individual components via event
          document.dispatchEvent(new KeyboardEvent('escape'));
          break;
        case 'f':
          if (meta) {
            e.preventDefault();
            searchInputRef?.current?.focus();
          }
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchInputRef]);
}
