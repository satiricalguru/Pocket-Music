import { execa } from 'execa';

/**
 * Find a Python 3 interpreter on the user's PATH.
 * - Windows: tries `python`, `python3`, then `py`
 * - macOS / Linux: tries `python3`, then `python`
 */
export async function detectPython(): Promise<string> {
  const candidates = process.platform === 'win32'
    ? ['python', 'python3', 'py']
    : ['python3', 'python'];

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
  throw new Error('Python 3 was not found on PATH. Install Python 3.11+ from python.org.');
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
