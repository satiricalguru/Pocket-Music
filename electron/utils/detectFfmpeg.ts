import { execa } from 'execa';
import fs from 'node:fs';
import path from 'node:path';

function ensureWin32FfmpegPath(): void {
  if (process.platform !== 'win32') return;

  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData/Local');
  const wingetDir = path.join(localAppData, 'Microsoft/WinGet/Packages');
  if (!fs.existsSync(wingetDir)) return;

  try {
    const folders = fs.readdirSync(wingetDir);
    for (const folder of folders) {
      if (folder.toLowerCase().includes('ffmpeg')) {
        const fullFolder = path.join(wingetDir, folder);
        if (fs.statSync(fullFolder).isDirectory()) {
          const subfolders = fs.readdirSync(fullFolder);
          for (const sub of subfolders) {
            const binPath = path.join(fullFolder, sub, 'bin');
            if (fs.existsSync(path.join(binPath, 'ffmpeg.exe'))) {
              process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
              return;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[spotlocal] Error scanning winget packages for FFmpeg:', err);
  }
}

/**
 * Returns true if ffmpeg is installed and reachable on PATH.
 * Used to decide whether to show the FfmpegMissingModal on startup.
 */
export async function detectFfmpeg(): Promise<boolean> {
  ensureWin32FfmpegPath();
  try {
    await execa('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}
