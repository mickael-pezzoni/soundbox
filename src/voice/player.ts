import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  type AudioPlayer,
  type DiscordGatewayAdapterCreator,
  type VoiceConnection,
} from "@discordjs/voice";

const IDLE_DISCONNECT_MS = 5 * 60 * 1000;

interface GuildSession {
  connection: VoiceConnection;
  player: AudioPlayer;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

const sessions = new Map<string, GuildSession>();

export interface PlayOptions {
  guildId: string;
  channelId: string;
  adapterCreator: DiscordGatewayAdapterCreator;
  filePath: string;
}

function clearIdleTimer(session: GuildSession) {
  if (session.idleTimer) {
    clearTimeout(session.idleTimer);
    session.idleTimer = null;
  }
}

function scheduleIdleDisconnect(guildId: string, session: GuildSession) {
  clearIdleTimer(session);
  session.idleTimer = setTimeout(() => {
    session.connection.destroy();
    sessions.delete(guildId);
  }, IDLE_DISCONNECT_MS);
}

function getOrCreateSession(
  guildId: string,
  channelId: string,
  adapterCreator: DiscordGatewayAdapterCreator,
): GuildSession {
  const existing = sessions.get(guildId);

  if (existing && existing.connection.state.status !== VoiceConnectionStatus.Destroyed) {
    if (existing.connection.joinConfig.channelId === channelId) {
      return existing;
    }
    existing.connection.destroy();
    sessions.delete(guildId);
  }

  const connection = joinVoiceChannel({
    guildId,
    channelId,
    adapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  const session: GuildSession = { connection, player, idleTimer: null };
  sessions.set(guildId, session);

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    connection.destroy();
    sessions.delete(guildId);
  });

  player.on(AudioPlayerStatus.Idle, () => {
    scheduleIdleDisconnect(guildId, session);
  });

  return session;
}

export async function playFile(options: PlayOptions): Promise<void> {
  const session = getOrCreateSession(options.guildId, options.channelId, options.adapterCreator);
  clearIdleTimer(session);

  await entersState(session.connection, VoiceConnectionStatus.Ready, 10_000);

  const resource = createAudioResource(options.filePath, {
    inputType: StreamType.Arbitrary,
  });

  session.player.play(resource);
  await entersState(session.player, AudioPlayerStatus.Playing, 10_000);
}
