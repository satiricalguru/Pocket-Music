import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: Database.Database | null = null;
let dbPath = '';

export function getDbPath(): string {
  if (dbPath) return dbPath;
  if (app.isPackaged) {
    dbPath = path.join(app.getPath('userData'), 'spotlocal.db');
  } else {
    dbPath = path.join(app.getAppPath(), 'spotlocal.db');
  }
  return dbPath;
}

/** Open (or reopen) the SQLite database and run migrations. */
export function openDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dbFile = getDbPath();
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  dbInstance = new Database(dbFile);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  migrate(dbInstance);
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tracks (
  id              TEXT PRIMARY KEY,
  spotify_id      TEXT UNIQUE,
  title           TEXT NOT NULL,
  artist          TEXT NOT NULL,
  album           TEXT,
  album_artist    TEXT,
  year            TEXT,
  genre           TEXT,
  track_number    INTEGER,
  duration        INTEGER NOT NULL DEFAULT 0,
  file_path       TEXT NOT NULL,
  size_bytes      INTEGER DEFAULT 0,
  cover_art_url   TEXT,
  added_at        INTEGER NOT NULL,
  play_count      INTEGER DEFAULT 0,
  last_played_at  INTEGER,
  is_liked        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS albums (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  artist          TEXT NOT NULL,
  year            TEXT,
  cover_art_url   TEXT,
  track_count     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS playlists (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_art   TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  added_at    INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist  ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_album   ON tracks(album);
CREATE INDEX IF NOT EXISTS idx_tracks_liked   ON tracks(is_liked) WHERE is_liked = 1;
CREATE INDEX IF NOT EXISTS idx_tracks_added   ON tracks(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_position    ON playlist_tracks(playlist_id, position);
`;

function migrate(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}
