import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  VoiceChannel,
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  AudioPlayer,
  VoiceConnection,
  StreamType,
} from '@discordjs/voice';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { resolveTrackPath } from '../utils/spotifyLocalPath';
import { getSettings } from '../ipc/settings.ipc';

export type BotStatus =
  | 'offline'
  | 'connecting'
  | 'ready'
  | 'streaming'
  | 'error';

export interface DiscordState {
  status: BotStatus;
  guildName?: string;
  channelName?: string;
  error?: string;
}

type StatusCallback = (state: DiscordState) => void;

/**
 * Manages the lifecycle of a Discord bot that mirrors local playback
 * into a voice channel. Only active while the app is running.
 */
export class DiscordBotManager {
  private client: Client | null = null;
  private player: AudioPlayer | null = null;
  private connection: VoiceConnection | null = null;
  private statusCb: StatusCallback | null = null;
  private currentState: DiscordState = { status: 'offline' };
  private currentFilePath: string | null = null;
  private currentSeekSeconds = 0;
  private isLocalPlayerPlaying = false;

  onStatusChange(cb: StatusCallback) {
    this.statusCb = cb;
  }

  private setState(partial: Partial<DiscordState>) {
    this.currentState = { ...this.currentState, ...partial };
    this.statusCb?.(this.currentState);
  }

  getState(): DiscordState {
    return this.currentState;
  }

  async start(token: string): Promise<void> {
    if (this.client) {
      await this.stop();
    }

    this.setState({ status: 'connecting', error: undefined });

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        // Note: MessageContent + GuildMessages are privileged intents that need
        // manual enabling in the Discord Developer Portal. Since we use slash
        // commands exclusively, we don't need them at all.
      ],
    });

    this.player = createAudioPlayer();

    this.player.on('stateChange', (oldState, newState) => {
      console.log(`[discord-bot] Audio player transitioned from ${oldState.status} to ${newState.status}`);
    });

    this.player.on(AudioPlayerStatus.Playing, () => {
      this.setState({ status: 'streaming' });
      if (!this.isLocalPlayerPlaying) {
        const paused = this.player?.pause();
        console.log(`[discord-bot] Paused player on Playing event since local playback is paused. Success: ${paused}`);
      }
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.connection) {
        this.setState({ status: 'ready' });
      }
    });

    this.player.on('error', (err) => {
      console.error('[discord-bot] audio player error:', err);
      this.setState({ status: 'error', error: err.message });
    });

    this.client.once(Events.ClientReady, async (readyClient) => {
      console.log(`[discord-bot] Logged in as ${readyClient.user.tag}`);
      // Register per-guild so commands appear INSTANTLY (global takes up to 1hr)
      await this.registerCommandsAllGuilds(token, readyClient.user.id);
      this.setState({ status: 'ready' });
    });

    // Also register instantly when bot is added to a new server
    this.client.on(Events.GuildCreate, async (guild) => {
      const clientId = this.client?.user?.id;
      if (clientId) {
        await this.registerCommandsForGuild(token, clientId, guild.id);
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.handleSlashCommand(interaction);
    });

    this.client.on(Events.Error, (err) => {
      console.error('[discord-bot] client error:', err);
      this.setState({ status: 'error', error: err.message });
    });

    await this.client.login(token);
  }

  private getCommandDefinitions() {
    return [
      new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join your current voice channel and start streaming music')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Disconnect the bot from the voice channel')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song')
        .toJSON(),
    ];
  }

  /** Register slash commands for a specific guild — appears instantly */
  private async registerCommandsForGuild(token: string, clientId: string, guildId: string): Promise<void> {
    const rest = new REST({ version: '10' }).setToken(token);
    try {
      // First, fetch and delete any existing commands to prevent duplicates
      const existingCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId)) as Array<{ id: string }>;
      for (const cmd of existingCommands) {
        await rest.delete(Routes.applicationGuildCommand(clientId, guildId, cmd.id));
      }
      // Now register fresh commands
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: this.getCommandDefinitions(),
      });
      console.log(`[discord-bot] Commands registered instantly for guild ${guildId}`);
    } catch (err) {
      console.error(`[discord-bot] Failed to register for guild ${guildId}:`, err);
    }
  }

  /** Register slash commands for all guilds the bot is currently in */
  private async registerCommandsAllGuilds(token: string, clientId: string): Promise<void> {
    if (!this.client) return;
    const guildIds = [...this.client.guilds.cache.keys()];
    console.log(`[discord-bot] Registering commands for ${guildIds.length} guild(s)…`);
    await Promise.all(
      guildIds.map((guildId) => this.registerCommandsForGuild(token, clientId, guildId))
    );
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.commandName === 'join') {
      const member = interaction.guild?.members.cache.get(interaction.user.id);
      const voiceChannel = member?.voice.channel as VoiceChannel | null;

      if (!voiceChannel) {
        await interaction.reply({ content: '❌ You need to be in a voice channel first!', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        await this.joinChannel(voiceChannel);
        await interaction.editReply(`✅ Joined **${voiceChannel.name}**! Whatever is playing on Pocket Music will be streamed here.`);
      } catch (err) {
        await interaction.editReply(`❌ Failed to join: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (interaction.commandName === 'leave') {
      this.disconnect();
      await interaction.reply({ content: '👋 Disconnected from voice channel.', ephemeral: true });
    } else if (interaction.commandName === 'nowplaying') {
      if (this.currentFilePath) {
        const fileName = path.basename(this.currentFilePath, path.extname(this.currentFilePath));
        await interaction.reply({ content: `🎵 Now playing: **${fileName}**`, ephemeral: false });
      } else {
        await interaction.reply({ content: '⏸️ Nothing is currently playing.', ephemeral: true });
      }
    }
  }

  private async joinChannel(voiceChannel: VoiceChannel): Promise<void> {
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch { /* ignore */ }
      this.connection = null;
    }

    console.log(`[discord-bot] Attempting to join voice channel: ${voiceChannel.name} (${voiceChannel.id})`);

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    this.connection.subscribe(this.player!);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log('[discord-bot] Disconnected from voice channel');
      try {
        // Try to reconnect briefly
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        try {
          this.connection?.destroy();
        } catch { /* ignore */ }
        this.connection = null;
        this.setState({ status: 'ready', channelName: undefined, guildName: undefined });
      }
    });

    this.connection.on(VoiceConnectionStatus.Connecting, () => {
      console.log('[discord-bot] Connecting to voice...');
    });

    this.connection.on(VoiceConnectionStatus.Signalling, () => {
      console.log('[discord-bot] Signalling to voice server...');
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      console.log('[discord-bot] Successfully connected to voice channel');
    } catch (err) {
      console.error('[discord-bot] Failed to connect to voice:', err);
      try {
        this.connection?.destroy();
      } catch { /* ignore */ }
      this.connection = null;
      throw new Error('Failed to connect to voice channel. This usually means:\n• Your network is blocking UDP connections\n• A firewall is preventing the connection\n• Your ISP is blocking Discord voice traffic\n\nTry: Disable VPN, restart your router, or check firewall settings.');
    }

    this.setState({
      status: 'ready',
      guildName: voiceChannel.guild.name,
      channelName: voiceChannel.name,
    });

    // If a track is already playing, start streaming it
    if (this.currentFilePath) {
      console.log(`[discord-bot] Streaming current track: ${this.currentFilePath}`);
      this.streamFile(this.currentFilePath, this.currentSeekSeconds);
    }
  }

  /** Called when the user changes track or seeks in the app */
  notifyTrackChange(filePath: string, seekSeconds = 0, isPlaying = true): void {
    this.currentFilePath = filePath;
    this.currentSeekSeconds = seekSeconds;
    this.isLocalPlayerPlaying = isPlaying;
    if (this.connection) {
      this.streamFile(filePath, seekSeconds);
    }
  }

  notifySeek(seekSeconds: number, isPlaying = true): void {
    this.currentSeekSeconds = seekSeconds;
    this.isLocalPlayerPlaying = isPlaying;
    if (this.connection && this.currentFilePath) {
      this.streamFile(this.currentFilePath, seekSeconds);
    }
  }

  notifyPause(): void {
    this.isLocalPlayerPlaying = false;
    const paused = this.player?.pause();
    console.log(`[discord-bot] notifyPause called. Player pause success: ${paused}, current state: ${this.player?.state.status}`);
  }

  notifyResume(): void {
    this.isLocalPlayerPlaying = true;
    const unpaused = this.player?.unpause();
    console.log(`[discord-bot] notifyResume called. Player unpause success: ${unpaused}, current state: ${this.player?.state.status}`);
  }

  private streamFile(filePath: string, seekSeconds = 0): void {
    const musicDir = getSettings().musicDir;
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : resolveTrackPath(musicDir, filePath);

    if (!fs.existsSync(absolutePath)) {
      console.warn('[discord-bot] file not found:', absolutePath);
      return;
    }

    try {
      // Use ffmpeg to stream with optional seek offset
      const ffmpegArgs = ['-ss', String(seekSeconds), '-i', absolutePath, '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'];
      const resource = createAudioResource(
        spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'ignore'] }).stdout,
        { inputType: StreamType.Raw }
      );
      this.player?.play(resource);

      // If local playback is paused, immediately pause the bot's audio player
      if (!this.isLocalPlayerPlaying) {
        const paused = this.player?.pause();
        console.log(`[discord-bot] Auto-paused stream since local playback is paused. Success: ${paused}`);
      }
    } catch (err) {
      console.error('[discord-bot] streamFile error:', err);
    }
  }

  disconnect(): void {
    if (this.player) {
      this.player.stop(true);
    }
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch { /* ignore */ }
      this.connection = null;
    }
    this.currentFilePath = null;
    this.setState({ status: 'ready', channelName: undefined, guildName: undefined });
  }

  async stop(): Promise<void> {
    this.disconnect();
    if (this.client) {
      this.client.removeAllListeners();
      try {
        await this.client.destroy();
      } catch { /* ignore */ }
      this.client = null;
    }
    this.player = null;
    this.setState({ status: 'offline', guildName: undefined, channelName: undefined });
  }
}
