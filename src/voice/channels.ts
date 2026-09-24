import type { Guild, VoiceBasedChannel } from "discord.js";

export interface VoiceChannelInfo {
  id: string;
  name: string;
  memberCount: number;
  memberIds: string[];
}

export interface GuildVoiceInfo {
  id: string;
  name: string;
  channels: VoiceChannelInfo[];
}

export function listVoiceChannels(guild: Guild): VoiceChannelInfo[] {
  return guild.channels.cache
    .filter((channel): channel is VoiceBasedChannel => channel.isVoiceBased())
        .map((channel) => ({
      id: channel.id,
      name: channel.name,
      memberCount: channel.members.size,
      memberIds: [...channel.members.keys()],
    }))
    .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
}

export function listGuildVoiceInfo(guilds: Iterable<Guild>): GuildVoiceInfo[] {
  return [...guilds]
    .map((guild) => ({ id: guild.id, name: guild.name, channels: listVoiceChannels(guild) }))
    .filter((guild) => guild.channels.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function pickDefaultChannelId(channels: VoiceChannelInfo[], userId?: string): string | undefined {
  const userChannel = userId ? channels.find((channel) => channel.memberIds.includes(userId)) : undefined;
  if (userChannel) return userChannel.id;

  const populated = channels.reduce<VoiceChannelInfo | undefined>(
    (best, channel) => (channel.memberCount > (best?.memberCount ?? 0) ? channel : best),
    undefined,
  );
  return populated?.id ?? channels[0]?.id;
}

export function formatChannelLabel(channel: VoiceChannelInfo): string {
  if (channel.memberCount === 0) return channel.name;
  return `${channel.name} (${channel.memberCount} connecté${channel.memberCount > 1 ? "s" : ""})`;
}
