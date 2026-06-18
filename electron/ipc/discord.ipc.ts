import { ipcMain, BrowserWindow } from 'electron';
import { DiscordBotManager } from '../discord/DiscordBotManager';

let botManager: DiscordBotManager | null = null;

function getManager(): DiscordBotManager {
  if (!botManager) {
    botManager = new DiscordBotManager();
  }
  return botManager;
}

export function registerDiscordIpc(getMainWindow: () => BrowserWindow | null): void {
  // Push status updates to renderer
  getManager().onStatusChange((state) => {
    getMainWindow()?.webContents.send('discord:statusUpdate', state);
  });

  const channels = [
    'discord:getStatus', 'discord:startBot', 'discord:stopBot',
    'discord:notifyTrackChange', 'discord:notifySeek', 'discord:notifyPause',
    'discord:notifyResume', 'discord:disconnect',
  ];
  channels.forEach((ch) => { try { ipcMain.removeHandler(ch); } catch { /* ignore */ } });

  ipcMain.handle('discord:getStatus', () => {
    return botManager ? botManager.getState() : { status: 'offline' };
  });

  ipcMain.handle('discord:startBot', async (_event, token: string) => {
    try {
      await getManager().start(token);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('discord:stopBot', async () => {
    await getManager().stop();
    return { ok: true };
  });

  ipcMain.handle('discord:notifyTrackChange', (_event, filePath: string, seekSeconds: number, isPlaying: boolean) => {
    getManager().notifyTrackChange(filePath, seekSeconds, isPlaying);
    return { ok: true };
  });

  ipcMain.handle('discord:notifySeek', (_event, seekSeconds: number, isPlaying: boolean) => {
    getManager().notifySeek(seekSeconds, isPlaying);
    return { ok: true };
  });

  ipcMain.handle('discord:notifyPause', () => {
    getManager().notifyPause();
    return { ok: true };
  });

  ipcMain.handle('discord:notifyResume', () => {
    getManager().notifyResume();
    return { ok: true };
  });

  ipcMain.handle('discord:disconnect', () => {
    getManager().disconnect();
    return { ok: true };
  });
}

/** Called from main.ts on app quit to cleanly shut down the bot */
export async function stopDiscordBot(): Promise<void> {
  if (botManager) {
    await botManager.stop();
    botManager = null;
  }
}
