import { ipcMain } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../db/database';
import type { Album, Playlist, Track } from '../../src/types';
import { getSettings } from './settings.ipc';

let MUSIC_DIR = '';

/** Row shape straight from SQLite; booleans get coerced below. */
interface TrackRow {
  id: string;
  spotify_id: string | null;
  title: string;
  artist: string;
  album: string | null;
  album_artist: string | null;
  year: string | null;
  genre: string | null;
  track_number: number | null;
  duration: number;
  file_path: string;
  size_bytes: number | null;
  cover_art_url: string | null;
  added_at: number;
  play_count: number;
  last_played_at: number | null;
  is_liked: number;
}

interface AlbumRow {
  id: string;
  name: string;
  artist: string;
  year: string | null;
  cover_art_url: string | null;
  track_count: number;
}

interface PlaylistRow {
  id: string;
  name: string;
  description: string;
  cover_art: string | null;
  created_at: number;
  updated_at: number;
}

function coerceTrack(r: TrackRow): Track {
  return {
    id: r.id,
    spotify_id: r.spotify_id ?? undefined,
    title: r.title,
    artist: r.artist,
    album: r.album ?? undefined,
    album_artist: r.album_artist ?? undefined,
    year: r.year ?? undefined,
    genre: r.genre ?? undefined,
    track_number: r.track_number ?? undefined,
    duration: r.duration,
    file_path: r.file_path,
    size_bytes: r.size_bytes ?? undefined,
    cover_art_url: r.cover_art_url ?? undefined,
    added_at: r.added_at,
    play_count: r.play_count,
    last_played_at: r.last_played_at ?? undefined,
    is_liked: r.is_liked === 1,
  };
}

function coerceAlbum(r: AlbumRow): Album {
  return {
    id: r.id,
    name: r.name,
    artist: r.artist,
    year: r.year ?? undefined,
    cover_art_url: r.cover_art_url ?? undefined,
    track_count: r.track_count,
  };
}

function getPlaylistCovers(db: any, playlistId: string): string[] {
  const rows = db
    .prepare(
      `SELECT t.cover_art_url FROM tracks t
       JOIN playlist_tracks pt ON pt.track_id = t.id
       WHERE pt.playlist_id = ? AND t.cover_art_url IS NOT NULL AND t.cover_art_url != ''
       ORDER BY pt.position ASC
       LIMIT 4`
    )
    .all(playlistId) as { cover_art_url: string }[];
  return rows.map((r) => r.cover_art_url);
}

function coercePlaylist(r: PlaylistRow, trackCount?: number, covers?: string[]): Playlist {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    cover_art: r.cover_art ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
    track_count: trackCount,
    cover_art_grid: covers ?? [],
  };
}

function uuid(): string {
  return crypto.randomUUID();
}

function albumIdFor(name: string, artist: string): string {
  return crypto
    .createHash('sha1')
    .update(`${(artist || 'Unknown').toLowerCase()}|${(name || 'Unknown').toLowerCase()}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Create a new playlist and bulk-add an ordered list of track IDs atomically.
 * Returns the new playlist ID.
 */
export function createPlaylistWithTracks(name: string, trackIds: string[]): string {
  const db = openDb();
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO playlists (id, name, description, cover_art, created_at, updated_at)
     VALUES (?, ?, '', NULL, ?, ?)`
  ).run(id, name || 'Downloaded Playlist', now, now);

  const insertPt = db.prepare(
    'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction((ids: string[]) => {
    ids.forEach((trackId, i) => insertPt.run(id, trackId, i, now));
  });
  tx(trackIds);

  return id;
}

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
  file_path: string;
  absolute_path: string;
  size_bytes: number;
}

/**
 * Insert a track returned by the backend scan, upsert its album, and
 * optionally symlink it into the Spotify local files folder.
 */
export function insertScannedTrack(raw: RawScannedTrack, musicDir: string): Track {
  const db = openDb();
  const id = uuid();
  const spotifyId = raw.spotify_id || null;
  const now = Date.now();

  // De-dupe by spotify_id: if a row already exists, reuse it and refresh its path
  if (spotifyId) {
    const existing = db
      .prepare('SELECT id FROM tracks WHERE spotify_id = ?')
      .get(spotifyId) as { id: string } | undefined;
    if (existing) {
      db.prepare('UPDATE tracks SET file_path = ? WHERE id = ?').run(raw.file_path, existing.id);
      return getTrackById(existing.id)!;
    }
  }

  // De-dupe by file_path
  const byPath = db
    .prepare('SELECT id FROM tracks WHERE file_path = ?')
    .get(raw.file_path) as { id: string } | undefined;
  if (byPath) {
    return getTrackById(byPath.id)!;
  }

  db.prepare(
    `INSERT INTO tracks
      (id, spotify_id, title, artist, album, album_artist, year, genre,
       track_number, duration, file_path, size_bytes, cover_art_url, added_at,
       play_count, is_liked)
     VALUES (@id, @spotify_id, @title, @artist, @album, @album_artist, @year, @genre,
       @track_number, @duration, @file_path, @size_bytes, @cover_art_url, @added_at,
       0, 0)`
  ).run({
    id,
    spotify_id: spotifyId,
    title: raw.title || 'Unknown Title',
    artist: raw.artist || 'Unknown Artist',
    album: raw.album || 'Unknown Album',
    album_artist: raw.album_artist || raw.artist || 'Unknown Artist',
    year: raw.year || null,
    genre: raw.genre || null,
    track_number: raw.track_number || null,
    duration: raw.duration || 0,
    file_path: raw.file_path,
    size_bytes: raw.size_bytes || 0,
    cover_art_url: raw.cover_art_url || null,
    added_at: now,
  });

  upsertAlbum(raw.album || 'Unknown Album', raw.album_artist || raw.artist || 'Unknown Artist', raw.year, raw.cover_art_url);

  // Spotify Local Files sync (if enabled)
  try {
    const settings = getSettings();
    if (settings.syncToSpotify) {
      syncTrackToSpotify(raw.absolute_path, settings.spotifyLocalFilesPath);
    }
  } catch (err) {
    console.error('[library] spotify sync failed:', err);
  }

  return getTrackById(id)!;
}

function upsertAlbum(
  name: string,
  artist: string,
  year: string | null,
  coverArtUrl: string | null
): void {
  const db = openDb();
  const id = albumIdFor(name, artist);
  const existing = db
    .prepare('SELECT id, track_count FROM albums WHERE id = ?')
    .get(id) as { id: string; track_count: number } | undefined;
  const existingTrackCount = existing?.track_count ?? 0;

  if (existing) {
    db.prepare(
      'UPDATE albums SET track_count = ?, cover_art_url = COALESCE(cover_art_url, ?), year = COALESCE(year, ?) WHERE id = ?'
    ).run(existingTrackCount + 1, coverArtUrl, year, id);
  } else {
    db.prepare(
      `INSERT INTO albums (id, name, artist, year, cover_art_url, track_count)
       VALUES (?, ?, ?, ?, ?, 1)`
    ).run(id, name, artist, year, coverArtUrl);
  }
}

function getTrackById(id: string): Track | undefined {
  const db = openDb();
  const row = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as TrackRow | undefined;
  return row ? coerceTrack(row) : undefined;
}

/** Ensure album track_count columns match reality (called after deletes). */
function refreshAlbumCounts(): void {
  const db = openDb();
  db.exec(`
    UPDATE albums SET track_count = (
      SELECT COUNT(*) FROM tracks
      WHERE album = albums.name AND COALESCE(album_artist, artist) = albums.artist
    )
  `);
  db.prepare('DELETE FROM albums WHERE track_count = 0').run();
}

/** Recompute a playlist's updated_at after an edit. */
function touchPlaylist(db: ReturnType<typeof openDb>, playlistId: string): void {
  db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(Date.now(), playlistId);
}

/** Copy/symlink a single track into the Spotify Local Files folder. */
export function syncTrackToSpotify(absoluteSrc: string, spotifyDir: string): void {
  if (!absoluteSrc || !spotifyDir) return;
  fs.mkdirSync(spotifyDir, { recursive: true });
  const dest = path.join(spotifyDir, path.basename(absoluteSrc));
  try {
    if (fs.existsSync(dest)) return;
    if (process.platform === 'win32') {
      // Symlinks need admin on Windows; fall back to copy.
      fs.copyFileSync(absoluteSrc, dest);
    } else {
      try {
        fs.symlinkSync(absoluteSrc, dest);
      } catch {
        fs.copyFileSync(absoluteSrc, dest);
      }
    }
  } catch (err) {
    console.error('[spotify-sync] failed for', dest, err);
  }
}

/** Walk the music dir and sync every track to the Spotify folder. */
export function syncAllTracksToSpotify(): number {
  const db = openDb();
  const rows = db.prepare('SELECT file_path FROM tracks').all() as { file_path: string }[];
  const settings = getSettings();
  if (!settings.syncToSpotify || !settings.spotifyLocalFilesPath) return 0;
  let count = 0;
  for (const { file_path } of rows) {
    const abs = path.join(MUSIC_DIR, file_path);
    if (fs.existsSync(abs)) {
      syncTrackToSpotify(abs, settings.spotifyLocalFilesPath);
      count++;
    }
  }
  return count;
}

export function registerLibraryIpc(musicDir: string): void {
  MUSIC_DIR = musicDir;

  ipcMain.handle('library:getTracks', () => {
    const db = openDb();
    const rows = db.prepare('SELECT * FROM tracks ORDER BY added_at DESC').all() as TrackRow[];
    return rows.map(coerceTrack);
  });

  ipcMain.handle('library:getTrack', (_evt, id: string) => getTrackById(id));

  ipcMain.handle('library:getAlbums', () => {
    const db = openDb();
    const rows = db.prepare('SELECT * FROM albums ORDER BY name COLLATE NOCASE').all() as AlbumRow[];
    return rows.map(coerceAlbum);
  });

  ipcMain.handle('library:getPlaylists', () => {
    const db = openDb();
    const rows = db
      .prepare('SELECT * FROM playlists ORDER BY updated_at DESC')
      .all() as PlaylistRow[];
    return rows.map((r) => {
      const c = db
        .prepare('SELECT COUNT(*) AS n FROM playlist_tracks WHERE playlist_id = ?')
        .get(r.id) as { n: number };
      return coercePlaylist(r, c.n, getPlaylistCovers(db, r.id));
    });
  });

  ipcMain.handle('library:getPlaylistTracks', (_evt, id: string) => {
    const db = openDb();
    const rows = db
      .prepare(
        `SELECT t.* FROM tracks t
         JOIN playlist_tracks pt ON pt.track_id = t.id
         WHERE pt.playlist_id = ?
         ORDER BY pt.position ASC`
      )
      .all(id) as TrackRow[];
    return rows.map(coerceTrack);
  });

  ipcMain.handle('library:search', (_evt, q: string) => {
    const db = openDb();
    const like = `%${(q || '').trim()}%`;
    if (!like || like === '%%') return [];
    const rows = db
      .prepare(
        `SELECT * FROM tracks
         WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
         ORDER BY added_at DESC LIMIT 200`
      )
      .all(like, like, like) as TrackRow[];
    return rows.map(coerceTrack);
  });

  ipcMain.handle('library:deleteTrack', (_evt, id: string) => {
    const db = openDb();
    const row = db
      .prepare('SELECT file_path FROM tracks WHERE id = ?')
      .get(id) as { file_path: string } | undefined;
    if (row) {
      const abs = path.join(MUSIC_DIR, row.file_path);
      try {
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch (err) {
        console.error('[library] could not delete file', abs, err);
      }

      // Prune empty ancestor directories up to (but not including) the music root
      try {
        let dir = path.dirname(abs);
        const musicRoot = path.resolve(MUSIC_DIR);
        while (path.resolve(dir) !== musicRoot) {
          const entries = fs.readdirSync(dir);
          const filteredEntries = entries.filter((e) => e !== '.DS_Store' && e !== 'Thumbs.db');
          if (filteredEntries.length === 0) {
            // Delete remaining system/hidden files
            for (const entry of entries) {
              try {
                fs.unlinkSync(path.join(dir, entry));
              } catch (e) {
                // Ignore failure to delete single metadata file
              }
            }
            fs.rmdirSync(dir);
            dir = path.dirname(dir);
          } else {
            break; // directory still has other files — stop
          }
        }
      } catch (err) {
        console.error('[library] could not prune empty dirs', err);
      }
    }
    db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
    refreshAlbumCounts();
    return true;
  });

  ipcMain.handle('library:likeTrack', (_evt, id: string, liked: boolean) => {
    const db = openDb();
    db.prepare('UPDATE tracks SET is_liked = ? WHERE id = ?').run(liked ? 1 : 0, id);
    return getTrackById(id);
  });

  ipcMain.handle('library:updateTrack', (_evt, id: string, patch: Partial<Track>) => {
    const db = openDb();
    const allowed: Array<keyof Track> = ['title', 'artist', 'album', 'album_artist', 'year', 'genre'];
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (key in patch) {
        sets.push(`${key} = ?`);
        values.push((patch as Record<string, unknown>)[key]);
      }
    }
    if (sets.length === 0) return getTrackById(id);
    values.push(id);
    db.prepare(`UPDATE tracks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return getTrackById(id);
  });

  ipcMain.handle('library:incrementPlayCount', (_evt, id: string) => {
    const db = openDb();
    db.prepare('UPDATE tracks SET play_count = play_count + 1, last_played_at = ? WHERE id = ?').run(
      Date.now(),
      id
    );
    return getTrackById(id);
  });

  ipcMain.handle('library:createPlaylist', (_evt, name: string) => {
    const db = openDb();
    const id = uuid();
    const now = Date.now();
    db.prepare(
      `INSERT INTO playlists (id, name, description, cover_art, created_at, updated_at)
       VALUES (?, ?, '', NULL, ?, ?)`
    ).run(id, name || 'New Playlist', now, now);
    const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as PlaylistRow;
    return coercePlaylist(row, 0, []);
  });

  ipcMain.handle('library:deletePlaylist', (_evt, id: string) => {
    const db = openDb();
    // 1. Get all tracks belonging to this playlist
    const tracks = db
      .prepare(
        `SELECT t.id, t.file_path FROM tracks t
         JOIN playlist_tracks pt ON pt.track_id = t.id
         WHERE pt.playlist_id = ?`
      )
      .all(id) as { id: string; file_path: string }[];

    // 2. Delete each track from disk, pruning folders, if it's not referenced elsewhere
    for (const track of tracks) {
      // Check if track exists in other playlists or is liked
      const otherPlaylists = db
        .prepare('SELECT COUNT(*) AS count FROM playlist_tracks WHERE track_id = ? AND playlist_id != ?')
        .get(track.id, id) as { count: number };
      const isLikedRow = db
        .prepare('SELECT is_liked FROM tracks WHERE id = ?')
        .get(track.id) as { is_liked: number } | undefined;
      const isLiked = isLikedRow ? isLikedRow.is_liked === 1 : false;

      if (otherPlaylists.count === 0 && !isLiked) {
        const abs = path.join(MUSIC_DIR, track.file_path);
        try {
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        } catch (err) {
          console.error('[library] could not delete file during playlist deletion', abs, err);
        }

        // Prune empty ancestor directories
        try {
          let dir = path.dirname(abs);
          const musicRoot = path.resolve(MUSIC_DIR);
          while (path.resolve(dir) !== musicRoot) {
            const entries = fs.readdirSync(dir);
            const filteredEntries = entries.filter((e) => e !== '.DS_Store' && e !== 'Thumbs.db');
            if (filteredEntries.length === 0) {
              // Delete remaining system/hidden files
              for (const entry of entries) {
                try {
                  fs.unlinkSync(path.join(dir, entry));
                } catch (e) {
                  // Ignore
                }
              }
              fs.rmdirSync(dir);
              dir = path.dirname(dir);
            } else {
              break;
            }
          }
        } catch (err) {
          console.error('[library] could not prune empty dirs during playlist deletion', err);
        }

        // Delete track from database
        db.prepare('DELETE FROM tracks WHERE id = ?').run(track.id);
      }
    }

    // 3. Delete the playlist
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
    
    // 4. Refresh album track counts
    refreshAlbumCounts();
    return true;
  });

  ipcMain.handle('library:renamePlaylist', (_evt, id: string, name: string) => {
    const db = openDb();
    db.prepare('UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?').run(name, Date.now(), id);
    const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as PlaylistRow;
    const c = db
      .prepare('SELECT COUNT(*) AS n FROM playlist_tracks WHERE playlist_id = ?')
      .get(id) as { n: number };
    return coercePlaylist(row, c.n, getPlaylistCovers(db, id));
  });

  ipcMain.handle('library:addToPlaylist', (_evt, trackId: string, playlistId: string) => {
    const db = openDb();
    const next = (
      db
        .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM playlist_tracks WHERE playlist_id = ?')
        .get(playlistId) as { p: number }
    ).p;
    db.prepare(
      'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)'
    ).run(playlistId, trackId, next, Date.now());
    touchPlaylist(db, playlistId);
    return true;
  });

  ipcMain.handle('library:removeFromPlaylist', (_evt, trackId: string, playlistId: string) => {
    const db = openDb();
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(
      playlistId,
      trackId
    );
    // Re-number positions to stay gapless
    const rows = db
      .prepare(
        'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC'
      )
      .all(playlistId) as { track_id: string }[];
    const stmt = db.prepare(
      'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?'
    );
    const tx = db.transaction((items: { track_id: string }[]) => {
      items.forEach((item, i) => stmt.run(i, playlistId, item.track_id));
    });
    tx(rows);
    touchPlaylist(db, playlistId);
    return true;
  });

  ipcMain.handle(
    'library:reorderPlaylistTracks',
    (_evt, playlistId: string, startIndex: number, endIndex: number) => {
      const db = openDb();
      const rows = db
        .prepare(
          'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC'
        )
        .all(playlistId) as { track_id: string }[];

      if (startIndex < 0 || startIndex >= rows.length || endIndex < 0 || endIndex >= rows.length) {
        return false;
      }

      const [moved] = rows.splice(startIndex, 1);
      rows.splice(endIndex, 0, moved);

      const stmt = db.prepare(
        'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?'
      );
      const tx = db.transaction((items: { track_id: string }[]) => {
        items.forEach((item, i) => stmt.run(i, playlistId, item.track_id));
      });
      tx(rows);
      touchPlaylist(db, playlistId);
      return true;
    }
  );
}
