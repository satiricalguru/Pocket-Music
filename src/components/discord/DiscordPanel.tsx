import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Loader,
  Music,
  LogOut,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { useDiscordStore, type BotStatus } from '../../store/useDiscordStore';

// Discord logo SVG component
const DiscordLogo: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

function StatusBadge({ status }: { status: BotStatus }) {
  const map: Record<BotStatus, { color: string; label: string; icon: React.ReactNode }> = {
    offline: { color: 'bg-zinc-600', label: 'Offline', icon: <WifiOff size={12} /> },
    connecting: { color: 'bg-yellow-500 animate-pulse', label: 'Connecting…', icon: <Loader size={12} className="animate-spin" /> },
    ready: { color: 'bg-green-500', label: 'Online', icon: <Wifi size={12} /> },
    streaming: { color: 'bg-green-400 animate-pulse', label: 'Streaming', icon: <Radio size={12} /> },
    error: { color: 'bg-red-500', label: 'Error', icon: <AlertCircle size={12} /> },
  };
  const { color, label, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${color}`}>
      {icon}
      {label}
    </span>
  );
}

export const DiscordPanel: React.FC = () => {
  const botToken = useDiscordStore((s) => s.botToken);
  const status = useDiscordStore((s) => s.status);
  const guildName = useDiscordStore((s) => s.guildName);
  const channelName = useDiscordStore((s) => s.channelName);
  const error = useDiscordStore((s) => s.error);
  const isBotEnabled = useDiscordStore((s) => s.isBotEnabled);
  const setBotToken = useDiscordStore((s) => s.setBotToken);
  const startBot = useDiscordStore((s) => s.startBot);
  const stopBot = useDiscordStore((s) => s.stopBot);
  const disconnect = useDiscordStore((s) => s.disconnect);

  const [tokenInput, setTokenInput] = useState(botToken);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // Listen for status pushes from main process
  useEffect(() => {
    const unsub = window.spotlocal.onDiscordStatusUpdate((raw: unknown) => {
      const state = raw as { status: BotStatus; guildName?: string; channelName?: string; error?: string };
      useDiscordStore.getState().setStatus(state);
    });
    // Sync initial status
    void window.spotlocal.discordGetStatus().then((s: unknown) => {
      useDiscordStore.getState().setStatus(s as { status: BotStatus });
    });
    return unsub;
  }, []);

  // Auto-start if was enabled before restart
  useEffect(() => {
    if (isBotEnabled && botToken && status === 'offline') {
      void startBot();
    }
  }, []); // eslint-disable-line

  const copyCommand = async () => {
    await navigator.clipboard.writeText('/join');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleStart = async () => {
    const token = tokenInput.trim();
    if (!token) return;
    setBotToken(token);
    // Reset any previous error then start
    useDiscordStore.getState().setStatus({ status: 'offline', error: undefined });
    await startBot(token);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6 max-w-[560px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #5865F2 0%, #7289DA 100%)' }}
          >
            <DiscordLogo size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text1">Discord Integration</h1>
            <p className="text-sm text-text2">Stream music to your friends in voice channels</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/5 p-4 space-y-3">
          <h2 className="text-sm font-bold text-text1">How it works</h2>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Create a Discord bot at discord.com/developers and copy the token' },
              { step: '2', text: 'Paste your bot token below and click Start Bot' },
              { step: '3', text: 'Invite the bot to your server using the OAuth2 URL' },
              { step: '4', text: 'Join a voice channel, then type /join — the bot streams your music!' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#5865F2]/20 text-[#7289DA] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <p className="text-sm text-text2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bot Token input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text1 block">Bot Token</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your bot token here…"
                className="w-full h-10 px-3 pr-10 rounded-lg bg-input border border-transparent
                  text-sm text-text1 placeholder:text-text3 font-mono
                  hover:border-text4 focus:border-[#5865F2] focus:outline-none focus:ring-1 focus:ring-[#5865F2]
                  transition-all"
                disabled={status === 'connecting' || status === 'ready' || status === 'streaming'}
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 text-xs"
              >
                {showToken ? 'hide' : 'show'}
              </button>
            </div>
          </div>
          <p className="text-xs text-text3">
            Your token is stored locally and never sent to any external server.
          </p>
        </div>

        {/* Error display */}
        {error && status === 'error' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {status === 'offline' || status === 'error' ? (
            <button
              onClick={handleStart}
              disabled={!tokenInput.trim()}
              className="flex-1 h-10 rounded-full bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-semibold text-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <DiscordLogo size={16} />
              Start Bot
            </button>
          ) : status === 'connecting' ? (
            <button disabled className="flex-1 h-10 rounded-full bg-[#5865F2]/50 text-white font-semibold text-sm flex items-center justify-center gap-2">
              <Loader size={16} className="animate-spin" />
              Connecting…
            </button>
          ) : (
            <button
              onClick={() => void stopBot()}
              className="flex-1 h-10 rounded-full bg-red-600/20 hover:bg-red-600/30 border border-red-600/30
                text-red-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Stop Bot
            </button>
          )}

          <button
            onClick={() => window.spotlocal.openExternal('https://discord.com/developers/applications')}
            className="h-10 px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10
              text-text2 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink size={14} />
            Dev Portal
          </button>
        </div>

        {/* Connected status card */}
        {(status === 'ready' || status === 'streaming') && (
          <div
            className="rounded-xl border p-4 space-y-4"
            style={{ background: 'rgba(88,101,242,0.08)', borderColor: 'rgba(88,101,242,0.3)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-bold text-text1">Bot is online</span>
            </div>

            {guildName && channelName ? (
              <div className="flex items-center gap-2 text-sm text-text2">
                <Music size={14} className="text-[#5865F2]" />
                <span>Streaming in <span className="font-semibold text-text1">#{channelName}</span> on <span className="font-semibold text-text1">{guildName}</span></span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-text2">Bot is ready! Go to a voice channel in Discord and type:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-black/30 rounded-lg px-3 py-2 text-[#5865F2] font-mono font-bold">
                    /join
                  </code>
                  <button
                    onClick={copyCommand}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text2 hover:text-text1"
                    title="Copy command"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            {guildName && (
              <button
                onClick={() => void disconnect()}
                className="text-xs text-text3 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <LogOut size={12} />
                Leave voice channel
              </button>
            )}
          </div>
        )}

        {/* Slash commands reference */}
        {status !== 'offline' && (
          <div className="rounded-xl bg-[#1a1a1a] border border-white/5 p-4 space-y-3">
            <h3 className="text-sm font-bold text-text1">Bot Commands</h3>
            <div className="space-y-2">
              {[
                { cmd: '/join', desc: 'Join your current voice channel and start streaming' },
                { cmd: '/leave', desc: 'Disconnect the bot from the voice channel' },
                { cmd: '/nowplaying', desc: 'Show the currently playing song in chat' },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-center gap-3">
                  <code className="text-xs bg-[#5865F2]/10 text-[#7289DA] px-2 py-1 rounded font-mono min-w-[90px]">
                    {cmd}
                  </code>
                  <span className="text-xs text-text2">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="text-xs text-text3 space-y-1.5 pb-4">
          <p>• The bot is only active while Pocket Music is running.</p>
          <p>• Audio sync has ~1-3s of natural Discord latency.</p>
          <p>• FFmpeg must be installed for audio streaming to work.</p>
          <p>• Bot requires the <span className="font-mono text-text2">bot</span> and <span className="font-mono text-text2">applications.commands</span> scopes in your OAuth2 URL.</p>
        </div>
      </div>
    </div>
  );
};
