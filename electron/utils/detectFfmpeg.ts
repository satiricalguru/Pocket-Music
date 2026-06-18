import { execa } from 'execa';

/**
 * Returns true if ffmpeg is installed and reachable on PATH.
 * Used to decide whether to show the FfmpegMissingModal on startup.
 */
export async function detectFfmpeg(): Promise<boolean> {
  try {
    await execa('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}
