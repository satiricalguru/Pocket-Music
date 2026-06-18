import { ipcMain, BrowserWindow } from 'electron';
import http from 'node:http';
import crypto from 'node:crypto';
import { openDb } from '../db/database';
import { insertScannedTrack, createPlaylistWithTracks } from './library.ipc';
import type { DownloadEvent, RawScannedTrack } from '../../src/types';

type MainWindowGetter = () => BrowserWindow | null;

let MAIN_WINDOW: MainWindowGetter = () => null;
let BASE_URL = '';

// Map jobId -> { url, playlistName, type, playlistId } for playlist jobs
const jobMeta = new Map<string, { url: string; playlistName: string; type: string; playlistId?: string }>();

function broadcast(event: DownloadEvent & { jobId?: string }): void {
  const win = MAIN_WINDOW();
  if (win && !win.isDestroyed()) {
    win.webContents.send('download:event', event);
  }
}

export function registerDownloaderIpc(
  getMainWindow: MainWindowGetter,
  _musicDir: string,
  baseUrl: string
): void {
  MAIN_WINDOW = getMainWindow;
  BASE_URL = baseUrl;

  ipcMain.handle('download:preview', async (_evt, url: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `preview failed (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      console.error('[downloader] preview failed:', err);
      throw err;
    }
  });

  ipcMain.handle('download:start', async (_evt, url: string, playlistName?: string) => {
    const res = await fetch(`${BASE_URL}/api/download/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `start failed (${res.status})`);
    }
    const data = (await res.json()) as { job_id: string; type: string };
    
    let playlistId: string | undefined;
    if (data.type === 'playlist' || data.type === 'album') {
      const name = playlistName || (data.type === 'album' ? 'Downloaded Album' : 'Downloaded Playlist');
      try {
        playlistId = createPlaylistWithTracks(name, []);
        console.log(`[downloader] Immediately created empty playlist '${name}' (id=${playlistId})`);
      } catch (err) {
        console.error('[downloader] failed to immediately create playlist:', err);
      }
      jobMeta.set(data.job_id, { url, playlistName: name, type: data.type, playlistId });
    }
    
    return {
      ...data,
      playlist_id: playlistId,
    };
  });

  ipcMain.handle('download:observe', async (_evt, jobId: string) => {
    void consumeSse(jobId);
    return true;
  });

  ipcMain.handle('download:cancel', async (_evt, jobId: string) => {
    await fetch(`${BASE_URL}/api/download/cancel/${jobId}`, { method: 'POST' });
    return true;
  });
}

/** Connect to the backend's SSE endpoint for a job and persist completed tracks. */
async function consumeSse(jobId: string): Promise<void> {
  const url = `${BASE_URL}/api/download/progress/${jobId}`;
  
  http.get(url, (res) => {
    if (res.statusCode !== 200) {
      broadcast({ type: 'error', message: `Could not open download stream (${res.statusCode})`, jobId });
      return;
    }

    res.setEncoding('utf8');
    let buffer = '';

    res.on('data', (chunk: string) => {
      console.log(`[consumeSse:${jobId}] Raw chunk received:`, JSON.stringify(chunk));
      buffer += chunk;
      
      // Normalize CRLF line endings to LF so that \r\n\r\n splits correctly on \n\n
      const normalized = buffer.replace(/\r\n/g, '\n');
      const parts = normalized.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        console.log(`[consumeSse:${jobId}] Part:`, JSON.stringify(part));
        const dataLines = part
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim());
        if (dataLines.length === 0) {
          console.log(`[consumeSse:${jobId}] No data: prefix found in lines:`, part.split('\n'));
          continue;
        }
        const raw = dataLines.join('\n');
        let event: DownloadEvent;
        try {
          event = JSON.parse(raw) as DownloadEvent;
          console.log(`[consumeSse:${jobId}] Parsed Event:`, event);
        } catch (err) {
          console.error(`[consumeSse:${jobId}] Failed to parse JSON:`, raw, err);
          continue;
        }

        const eventWithId = { ...event, jobId };

        // Live-import tracks as they finish downloading
        if (event.type === 'track_done') {
          const rawTracks = event.new_tracks || [];
          const insertedTrackIds: string[] = [];
          for (const rawTrack of rawTracks) {
            try {
              const normalized: RawScannedTrack = {
                title: rawTrack.title,
                artist: rawTrack.artist,
                album: rawTrack.album,
                album_artist: rawTrack.album_artist,
                year: rawTrack.year,
                genre: rawTrack.genre,
                track_number: rawTrack.track_number,
                duration: rawTrack.duration,
                cover_art_url: rawTrack.cover_art_url,
                spotify_id: rawTrack.spotify_id,
                file_path: rawTrack.file_path.split('\\').join('/'), // normalize Windows
                absolute_path: rawTrack.absolute_path,
                size_bytes: rawTrack.size_bytes,
              };
              const inserted = insertScannedTrack(normalized, '');
              if (inserted?.id) insertedTrackIds.push(inserted.id);
            } catch (err) {
              console.error('[downloader] failed to persist track live:', err);
            }
          }

          const meta = jobMeta.get(jobId);
          if (meta?.playlistId && insertedTrackIds.length > 0) {
            const db = openDb();
            const posRow = db
              .prepare('SELECT COALESCE(MAX(position), -1) AS max_pos FROM playlist_tracks WHERE playlist_id = ?')
              .get(meta.playlistId) as { max_pos: number };
            let currentPos = posRow.max_pos + 1;

            const insertPt = db.prepare(
              'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)'
            );
            const now = Date.now();
            const tx = db.transaction((ids: string[]) => {
              ids.forEach((trackId) => {
                insertPt.run(meta.playlistId, trackId, currentPos++, now);
              });
            });
            try {
              tx(insertedTrackIds);
              console.log(`[downloader] Added ${insertedTrackIds.length} tracks to playlist ${meta.playlistId} live`);
            } catch (err) {
              console.error('[downloader] failed to add tracks live:', err);
            }
          }

          broadcast({
            ...eventWithId,
            playlist_id: meta?.playlistId,
          } as any);
          continue;
        }

        // When the job finishes, persist any remaining scanned tracks
        if (event.type === 'done' && !event.cancelled) {
          const tracks = event.tracks ?? [];
          console.log(`[consumeSse:${jobId}] Done event received, persisting final ${tracks.length} tracks`);

          const insertedTrackIds: string[] = [];
          for (const rawTrack of tracks) {
            try {
              const normalized: RawScannedTrack = {
                title: rawTrack.title,
                artist: rawTrack.artist,
                album: rawTrack.album,
                album_artist: rawTrack.album_artist,
                year: rawTrack.year,
                genre: rawTrack.genre,
                track_number: rawTrack.track_number,
                duration: rawTrack.duration,
                cover_art_url: rawTrack.cover_art_url,
                spotify_id: rawTrack.spotify_id,
                file_path: rawTrack.file_path.split('\\').join('/'), // normalize Windows
                absolute_path: rawTrack.absolute_path,
                size_bytes: rawTrack.size_bytes,
              };
              const inserted = insertScannedTrack(normalized, '');
              if (inserted?.id) insertedTrackIds.push(inserted.id);
            } catch (err) {
              console.error('[downloader] failed to persist track on done:', err);
            }
          }

          // If there's an associated playlist, add any remaining tracks that were not added yet
          const meta = jobMeta.get(jobId);
          if (meta?.playlistId && insertedTrackIds.length > 0) {
            const db = openDb();
            const existingTrackIds = new Set(
              (db.prepare('SELECT track_id FROM playlist_tracks WHERE playlist_id = ?').all(meta.playlistId) as { track_id: string }[]).map(t => t.track_id)
            );
            const newTrackIds = insertedTrackIds.filter(id => !existingTrackIds.has(id));
            if (newTrackIds.length > 0) {
              const posRow = db.prepare('SELECT COALESCE(MAX(position), -1) AS max_pos FROM playlist_tracks WHERE playlist_id = ?').get(meta.playlistId) as { max_pos: number };
              let currentPos = posRow.max_pos + 1;
              const insertPt = db.prepare(
                'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)'
              );
              const now = Date.now();
              const tx = db.transaction((ids: string[]) => {
                ids.forEach((trackId) => {
                  insertPt.run(meta.playlistId, trackId, currentPos++, now);
                });
              });
              try {
                tx(newTrackIds);
                console.log(`[downloader] Added remaining ${newTrackIds.length} tracks to playlist ${meta.playlistId}`);
              } catch (err) {
                console.error('[downloader] failed to add remaining tracks:', err);
              }
            }
            jobMeta.delete(jobId);
          }

          broadcast({
            type: 'done',
            tracks: [],
            jobId,
            total_tracks: event.total_tracks,
            completed_tracks: event.completed_tracks,
            cancelled: event.cancelled,
            playlist_id: meta?.playlistId,
          });
          return;
        }

        broadcast(eventWithId);
      }
    });

    res.on('error', (err) => {
      console.error(`[consumeSse:${jobId}] res error:`, err);
      broadcast({ type: 'error', message: `Download stream error: ${err.message}`, jobId });
    });
  }).on('error', (err) => {
    console.error(`[consumeSse:${jobId}] request error:`, err);
    broadcast({ type: 'error', message: `Download stream request error: ${err.message}`, jobId });
  });
}
