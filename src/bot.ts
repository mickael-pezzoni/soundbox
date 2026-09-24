import {
  Client,
  Events,
  GatewayIntentBits,
  InteractionContextType,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Guild,
} from "discord.js";
import { config } from "./config.js";
import { filePathFor, getFileById, searchFiles } from "./routes/files.js";
import { formatChannelLabel, listVoiceChannels, pickDefaultChannelId } from "./voice/channels.js";
import { playFile } from "./voice/player.js";

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
});

/** Asks Discord directly (force: skip the member cache, which is not kept in sync without the GuildMembers intent). */
export async function isGuildMember(guild: Guild, userId: string): Promise<boolean> {
  return guild.members.fetch({ user: userId, force: true }).then(
    () => true,
    () => false,
  );
}

export async function guildsSharedWith(userId: string): Promise<Guild[]> {
  const guilds = [...client.guilds.cache.values()];
  const membership = await Promise.all(guilds.map((guild) => isGuildMember(guild, userId)));
  return guilds.filter((_, index) => membership[index]);
}

const playCommand = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Joue un fichier audio dans un salon vocal")
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("fichier")
      .setDescription("Nom du fichier enregistré")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addStringOption((option) =>
    option
      .setName("salon")
      .setDescription("Salon vocal (par défaut : celui où il y a déjà des utilisateurs)")
      .setRequired(false)
      .setAutocomplete(true),
  );

async function registerCommands(guild: Guild) {
  try {
    await guild.commands.set([playCommand.toJSON()]);
  } catch (error) {
    console.error(`Failed to register commands on ${guild.name}:`, error);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot logged in as ${readyClient.user.tag}`);

  await readyClient.application.commands.set([]);
  await Promise.all(readyClient.guilds.cache.map(registerCommands));
});

client.on(Events.GuildCreate, registerCommands);

client.on(Events.MessageCreate, (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete() && interaction.commandName === "play") {
    const focused = interaction.options.getFocused(true);

    if (focused.name === "fichier") {
      const matches = searchFiles(focused.value, 25);
      await interaction.respond(
        matches.map((file) => ({ name: file.displayName.slice(0, 100), value: file.id })),
      );
      return;
    }

    if (focused.name === "salon") {
      const query = focused.value.toLowerCase();
      const channels = interaction.inCachedGuild() ? listVoiceChannels(interaction.guild) : [];
      await interaction.respond(
        channels
          .filter((channel) => channel.name.toLowerCase().includes(query))
          .slice(0, 25)
          .map((channel) => ({ name: formatChannelLabel(channel).slice(0, 100), value: channel.id })),
      );
    }
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "play") {
    await handlePlayCommand(interaction);
  }
});

async function handlePlayCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    const content = interaction.inGuild()
      ? "Le bot n'est pas membre de ce serveur. Réinvite-le avec les scopes `bot` et `applications.commands`."
      : "Cette commande doit être utilisée dans un serveur.";
    await interaction.reply({ content, ephemeral: true });
    return;
  }

  const fileId = interaction.options.getString("fichier", true);
  const file = getFileById(fileId);

  if (!file) {
    await interaction.reply({ content: "Fichier introuvable.", ephemeral: true });
    return;
  }

  const requestedChannelId = interaction.options.getString("salon");
  const voiceChannelId = requestedChannelId ?? pickDefaultChannelId(listVoiceChannels(interaction.guild), interaction.user.id);

  if (!voiceChannelId) {
    await interaction.reply({ content: "Aucun salon vocal disponible.", ephemeral: true });
    return;
  }

  const channel = interaction.guild.channels.cache.get(voiceChannelId);
  if (!channel || !channel.isVoiceBased()) {
    await interaction.reply({
      content: "Salon vocal invalide. Choisis-en un dans la liste proposée.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    await playFile({
      guildId: interaction.guild.id,
      channelId: channel.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      filePath: filePathFor(file.id, file.filename),
    });
    await interaction.editReply(`Lecture de « ${file.displayName} » en cours dans <#${channel.id}>.`);
  } catch (error) {
    await interaction.editReply(
      `Échec de la lecture : ${error instanceof Error ? error.message : "erreur inconnue"}`,
    );
  }
}

export function startBot() {
  return client.login(config.discordToken);
}
