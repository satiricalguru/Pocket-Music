import { ChildProcessByStdio, spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface BackendStatus {
  running: boolean;
  port: number;
  baseUrl: string;
  pid?: number;
}

export class BackendManager {
  private proc: ChildProcessByStdio<null, Readable, Readable> | null = null;
  readonly port = 7842;
  readonly baseUrl = `http://127.0.0.1:7842`;

  /** Resolve the path to backend/main.py whether packaged or in dev. */
  private resolveBackendPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'backend', 'main.py');
    }
    // In dev, __dirname is dist-electron/, backend is a sibling of electron/
    return path.resolve(app.getAppPath(), 'backend', 'main.py');
  }

  /** Spawn the Python backend with the given music dir. */
  async start(pythonBin: string, musicDir: string): Promise<void> {
    if (this.proc) {
      return;
    }

    const backendPath = this.resolveBackendPath();
    if (!fs.existsSync(backendPath)) {
      throw new Error(`Backend entry not found: ${backendPath}`);
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      SPOTLOCAL_MUSIC_DIR: musicDir,
      SPOTLOCAL_PORT: String(this.port),
      PYTHONUNBUFFERED: '1',
    };

    const args = [backendPath];
    // On Windows, `py` needs `-3` to select Python 3.
    if (process.platform === 'win32' && /(^|[/\\])py(\.exe)?$/.test(pythonBin)) {
      args.unshift('-3');
    }

    this.proc = spawn(pythonBin, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.proc.stdout?.on('data', (d: Buffer) => {
      console.log('[backend]', d.toString().trimEnd());
    });
    this.proc.stderr?.on('data', (d: Buffer) => {
      console.error('[backend:err]', d.toString().trimEnd());
    });
    this.proc.on('exit', (code, signal) => {
      console.log(`[backend] exited code=${code} signal=${signal}`);
      this.proc = null;
    });
    this.proc.on('error', (err) => {
      console.error('[backend] spawn error:', err);
      this.proc = null;
    });

    await this.waitReady(20_000);
  }

  /** Poll /api/status until the backend responds or timeout. */
  private async waitReady(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!this.proc) {
        throw new Error('Backend process exited before becoming ready');
      }
      try {
        const res = await fetch(`${this.baseUrl}/api/status`);
        if (res.ok) {
          return;
        }
      } catch {
        // backend not up yet
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('Backend failed to start within 20 seconds');
  }

  stop(): void {
    if (!this.proc) return;
    try {
      this.proc.kill('SIGTERM');
      // Hard kill after 3s if still alive
      const proc = this.proc;
      setTimeout(() => {
        if (proc && proc.exitCode === null && proc.pid) {
          try {
            proc.kill('SIGKILL');
          } catch {
            /* ignore */
          }
        }
      }, 3000);
    } catch (err) {
      console.error('[backend] stop error:', err);
    } finally {
      this.proc = null;
    }
  }

  isRunning(): boolean {
    return this.proc !== null && this.proc.exitCode === null;
  }
}
