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

/** Stops playback and leaves the channel. Safe to call on a session that was already ended or replaced. */
function endSession(guildId: string, session: GuildSession) {
  // Unregister first: stopping the player emits Idle, which must not schedule a disconnect for this session.
  if (sessions.get(guildId) === session) sessions.delete(guildId);
  clearIdleTimer(session);
  session.player.stop(true);
  if (session.connection.state.status !== VoiceConnectionStatus.Destroyed) {
    session.connection.destroy();
  }
}

function scheduleIdleDisconnect(guildId: string, session: GuildSession) {
  clearIdleTimer(session);
  if (sessions.get(guildId) !== session) return;
  session.idleTimer = setTimeout(() => endSession(guildId, session), IDLE_DISCONNECT_MS);
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
    endSession(guildId, existing);
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

  connection.on(VoiceConnectionStatus.Disconnected, () => endSession(guildId, session));

  player.on(AudioPlayerStatus.Idle, () => {
    scheduleIdleDisconnect(guildId, session);
  });

  return session;
}

/** The voice channel the bot is (or is joining) in this guild, if any. */
export function getActiveChannelId(guildId: string): string | undefined {
  const session = sessions.get(guildId);
  return session?.connection.joinConfig.channelId ?? undefined;
}

/** Stops the current sound and leaves the voice channel. Returns false if the bot wasn't in one. */
export function stopGuild(guildId: string): boolean {
  const session = sessions.get(guildId);
  if (!session) return false;
  endSession(guildId, session);
  return true;
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
