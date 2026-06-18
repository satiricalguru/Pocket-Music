import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BotStatus = 'offline' | 'connecting' | 'ready' | 'streaming' | 'error';

interface DiscordState {
  botToken: string;
  status: BotStatus;
  guildName?: string;
  channelName?: string;
  error?: string;
  isBotEnabled: boolean;

  setBotToken: (token: string) => void;
  setStatus: (s: Partial<Omit<DiscordState, 'setBotToken' | 'setStatus' | 'startBot' | 'stopBot' | 'disconnect'>>) => void;
  startBot: (overrideToken?: string) => Promise<void>;
  stopBot: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useDiscordStore = create<DiscordState>()(
  persist(
    (set, get) => ({
      botToken: '',
      status: 'offline',
      guildName: undefined,
      channelName: undefined,
      error: undefined,
      isBotEnabled: false,

      setBotToken: (token) => set({ botToken: token }),

      setStatus: (partial) => set((s) => ({ ...s, ...partial })),

      startBot: async (overrideToken?: string) => {
        const { botToken } = get();
        const token = (overrideToken ?? botToken).trim();
        if (!token) return;
        set({ status: 'connecting', error: undefined, isBotEnabled: true });
        const result = await window.spotlocal.discordStartBot(token) as { ok: boolean; error?: string };
        if (!result.ok) {
          set({ status: 'error', error: result.error ?? 'Unknown error', isBotEnabled: false });
        }
      },

      stopBot: async () => {
        await window.spotlocal.discordStopBot();
        set({ status: 'offline', guildName: undefined, channelName: undefined, isBotEnabled: false });
      },

      disconnect: async () => {
        await window.spotlocal.discordDisconnect();
        set({ guildName: undefined, channelName: undefined });
      },
    }),
    {
      name: 'spotlocal-discord',
      // Persist token and enabled flag across restarts
      partialize: (s) => ({ botToken: s.botToken, isBotEnabled: s.isBotEnabled }),
    }
  )
);
