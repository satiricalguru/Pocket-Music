/** Shared domain types used across renderer + IPC. No electron import. */

export interface Track {
  id: string;
  spotify_id?: string;
  title: string;
  artist: string;
  album?: string;
  album_artist?: string;
  year?: string;
  genre?: string;
  track_number?: number;
  duration: number; // seconds
  file_path: string; // relative POSIX path under musicDir
  size_bytes?: number;
  cover_art_url?: string;
  added_at: number; // unix ms
  play_count: number;
  last_played_at?: number;
  is_liked: boolean;
}

export type SortField = 'added_at' | 'title' | 'artist' | 'album' | 'play_count';
export type SortDir = 'asc' | 'desc';

/** Shape returned by the backend scan endpoint before we persist to SQLite. */
export interface RawScannedTrack {
  title: string;
  artist: string;
  album: string;
  album_artist: string;
  year: string;
  genre: string;
  track_number: number;
  duration: number;
  cover_art_url: string | null;
  spotify_id: string;
  file_path: string; // relative POSIX
  absolute_path: string;
  size_bytes: number;
}

/** Event payload pushed from main to renderer over the download SSE channel. */
export type DownloadEvent =
  | { type: 'status'; status: 'downloading' | 'done' | 'cancelled' }
  | { type: 'progress'; total_tracks: number; completed_tracks: number; percent: number; log?: string }
  | { type: 'track_done'; title: string; completed_tracks: number; total_tracks: number; percent: number; new_tracks?: RawScannedTrack[]; playlist_id?: string }
  | { type: 'track_failed'; message: string }
  | { type: 'log'; message: string }
  | { type: 'done'; tracks: RawScannedTrack[]; total_tracks?: number; completed_tracks?: number; cancelled?: boolean; playlist_id?: string }
  | { type: 'error'; message: string };

export interface DownloadPreview {
  title: string;
  artist: string;
  thumbnail_url: string;
  embed_type: 'track' | 'album' | 'playlist';
}
