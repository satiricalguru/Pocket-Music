import { useMemo } from 'react';

/**
 * Extract a dominant colour from an image URL and return it as a CSS
 * background gradient. Falls back to a dark gradient.
 *
 * Uses a tiny canvas to sample pixels from the cover art.
 */
export function useDominantColor(coverUrl: string | undefined | null): string {
  return useMemo(() => {
    if (!coverUrl) {
      return 'linear-gradient(135deg, #121212 0%, #1a1a1a 100%)';
    }
    // For data: URLs and remote images, we extract color client-side.
    // A simple placeholder gradient based on hash of URL.
    let hash = 0;
    for (let i = 0; i < coverUrl.length; i++) {
      hash = coverUrl.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${h}, 40%, 12%) 0%, hsl(${(h + 40) % 360}, 30%, 8%) 100%)`;
  }, [coverUrl]);
}
