import os from 'node:os';
import path from 'node:path';

/**
 * Return the Spotify Local Files source folder for the current platform.
 * Spotify scans this folder for local MP3s to add to its library.
 *
 * Both macOS and Windows default to the user's Music folder. The user can
 * override this path in Settings -> Spotify Integration.
 */
export function getSpotifyLocalFilesPath(): string {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Music');
  }
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'Music');
  }
  return path.join(os.homedir(), 'Music');
}

/**
 * Resolve a track's relative file_path (as stored in SQLite) into an
 * absolute filesystem path inside musicDir. No slash concatenation.
 */
export function resolveTrackPath(musicDir: string, relativePath: string): string {
  return path.join(musicDir, relativePath);
}

/**
 * Convert an absolute filesystem path under musicDir into a relative,
 * forward-slash POSIX path safe to store in SQLite across platforms.
 */
export function toRelativePosix(musicDir: string, absolutePath: string): string {
  const rel = path.relative(musicDir, absolutePath);
  return rel.split(path.sep).join('/');
}

/**
 * Build a URL to stream an audio file from the backend. Each path segment
 * is independently percent-encoded so slashes survive intact.
 */
export function buildAudioUrl(baseUrl: string, relativePosixPath: string): string {
  const encoded = relativePosixPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${baseUrl.replace(/\/$/, '')}/files/${encoded}`;
}
