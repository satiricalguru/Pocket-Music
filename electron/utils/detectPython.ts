import { execa } from 'execa';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Find a Python 3 interpreter on the user's PATH and common install directories.
 * Prioritizes interpreters that have the backend dependencies already installed.
 */
export async function detectPython(): Promise<string> {
  const candidates: string[] = [];
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    candidates.push(
      'python',
      'python3',
      'py',
      path.join(localAppData, 'Programs/Python/Python313/python.exe'),
      path.join(localAppData, 'Programs/Python/Python312/python.exe'),
      path.join(localAppData, 'Programs/Python/Python311/python.exe'),
      path.join(localAppData, 'Programs/Python/Python314/python.exe'),
      path.join(localAppData, 'Programs/Python/Python310/python.exe'),
      'C:/Python313/python.exe',
      'C:/Python312/python.exe',
      'C:/Python311/python.exe'
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/opt/homebrew/bin/python3',
      '/usr/local/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/3.14/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/Current/bin/python3',
      '/opt/local/bin/python3',
      'python3',
      'python',
      '/usr/bin/python3'
    );
  } else {
    candidates.push('python3', 'python');
  }

  // Phase 1: Look for a Python 3 interpreter with all required modules
  for (const bin of candidates) {
    try {
      const result = await execa(bin, ['--version']);
      const out = `${result.stdout} ${result.stderr}`;
      if (/Python\s+3\./.test(out)) {
        // Test if the environment has our backend dependencies installed
        await execa(bin, ['-c', 'import fastapi, uvicorn, mutagen, yt_dlp, httpx, sse_starlette']);
        return bin;
      }
    } catch {
      // try next candidate
    }
  }

  // Phase 2: Fallback to any Python 3 interpreter
  for (const bin of candidates) {
    try {
      const result = await execa(bin, ['--version']);
      const out = `${result.stdout} ${result.stderr}`;
      if (/Python\s+3\./.test(out)) {
        return bin;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error('Python 3 was not found. Install Python 3.11+ from python.org.');
}

export interface PythonInfo {
  bin: string;
  version: string;
}

export async function getPythonInfo(): Promise<PythonInfo> {
  const bin = await detectPython();
  try {
    const result = await execa(bin, ['--version']);
    const out = `${result.stdout} ${result.stderr}`.trim();
    return { bin, version: out };
  } catch {
    return { bin, version: 'Python 3 (unknown)' };
  }
}
