import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrackRow } from './TrackRow';
import type { Track } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';

interface TrackTableProps {
  tracks: Track[];
  showAlbum?: boolean;
  showDateAdded?: boolean;
  contextPlaylistId?: string;
  onTracksChange?: () => void;
}

const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 56;

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  showAlbum = true,
  showDateAdded = true,
  contextPlaylistId,
  onTracksChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Virtualize when there are more than 100 tracks
  const shouldVirtualize = tracks.length > 100;

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: shouldVirtualize,
  });

  const totalHeight = virtualizer.getTotalSize();

  const headerCells = useMemo(
    () => [
      { key: 'index', label: '#', width: '40px', align: 'right' },
      { key: 'title', label: 'Title', flex: 1 },
      ...(showAlbum ? [{ key: 'album', label: 'Album', width: '200px' }] : []),
      ...(showDateAdded
        ? [{ key: 'added', label: 'Date added', width: '160px' }]
        : []),
      { key: 'like', label: '', width: '40px', align: 'center' },
      { key: 'duration', label: '⏱', width: '60px', align: 'right' },
      { key: 'actions', label: '', width: '32px', align: 'center' },
    ],
    [showAlbum, showDateAdded]
  );

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-text3 text-sm">
        No tracks here yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header row */}
      {!isMobile && (
        <div
          className="grid items-center gap-2 px-4 border-b border-border text-xs uppercase tracking-wider text-text3"
          style={{
            gridTemplateColumns: headerCells
              .map((c) => c.width === 'flex' ? '1fr' : c.width ?? '1fr')
              .join(' '),
            height: HEADER_HEIGHT,
          }}
        >
          {headerCells.map((cell) => (
            <div
              key={cell.key}
              className={cell.align === 'right' ? 'text-right' : cell.align === 'center' ? 'text-center' : ''}
            >
              {cell.label}
            </div>
          ))}
        </div>
      )}

      {/* Rows */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{
          maxHeight: isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 360px)',
        }}
      >
        {shouldVirtualize ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const track = tracks[virtualRow.index];
              if (!track) return null;
              return (
                <div
                  key={track.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TrackRow
                    track={track}
                    index={virtualRow.index}
                    showAlbum={showAlbum}
                    showDateAdded={showDateAdded}
                    queue={tracks}
                    contextPlaylistId={contextPlaylistId}
                    onTracksChange={onTracksChange}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              showAlbum={showAlbum}
              showDateAdded={showDateAdded}
              queue={tracks}
              contextPlaylistId={contextPlaylistId}
              onTracksChange={onTracksChange}
            />
          ))
        )}
      </div>
    </div>
  );
};
