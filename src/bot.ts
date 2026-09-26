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
import { disconnectGuild, getActiveChannelId, playFile, stopPlayback } from "./voice/player.js";

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
  .setDescription("Joue un fichier audio dans ton salon vocal")
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("fichier")
      .setDescription("Nom du fichier enregistré")
      .setRequired(true)
      .setAutocomplete(true),
  );

const stopCommand = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Arrête le son en cours (le bot reste dans le salon vocal)")
  .setContexts(InteractionContextType.Guild);

const disconnectCommand = new SlashCommandBuilder()
  .setName("disconnect")
  .setDescription("Arrête le son en cours et déconnecte le bot du salon vocal")
  .setContexts(InteractionContextType.Guild);

async function registerCommands(guild: Guild) {
  try {
    await guild.commands.set([playCommand.toJSON(), stopCommand.toJSON(), disconnectCommand.toJSON()]);
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
    }
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "play") {
    await handlePlayCommand(interaction);
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "stop") {
    await handleStopCommand(interaction);
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "disconnect") {
    await handleDisconnectCommand(interaction);
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

  // The sound always plays in the caller's own voice channel.
  const channel = interaction.member.voice.channel;
  if (!channel) {
    await interaction.reply({ content: "Rejoins un salon vocal pour jouer un son.", ephemeral: true });
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

/** Checks the caller shares the bot's voice channel (same rule as /play); replies and returns undefined otherwise. */
async function botChannelForCaller(
  interaction: ChatInputCommandInteraction,
  action: string,
): Promise<{ guildId: string; channelId: string } | undefined> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Cette commande doit être utilisée dans un serveur.", ephemeral: true });
    return undefined;
  }

  const botChannelId = getActiveChannelId(interaction.guild.id);
  if (!botChannelId) {
    await interaction.reply({ content: "Le bot n'est connecté à aucun salon vocal.", ephemeral: true });
    return undefined;
  }

  if (interaction.member.voice.channelId !== botChannelId) {
    await interaction.reply({
      content: `Tu dois être connecté à <#${botChannelId}> pour ${action}.`,
      ephemeral: true,
    });
    return undefined;
  }

  return { guildId: interaction.guild.id, channelId: botChannelId };
}

async function handleStopCommand(interaction: ChatInputCommandInteraction) {
  const target = await botChannelForCaller(interaction, "arrêter le son");
  if (!target) return;

  if (!stopPlayback(target.guildId)) {
    await interaction.reply({ content: "Aucun son en cours de lecture.", ephemeral: true });
    return;
  }
  await interaction.reply("Son arrêté.");
}

async function handleDisconnectCommand(interaction: ChatInputCommandInteraction) {
  const target = await botChannelForCaller(interaction, "déconnecter le bot");
  if (!target) return;

  disconnectGuild(target.guildId);
  await interaction.reply(`Le bot a quitté <#${target.channelId}>.`);
}

export function startBot() {
  return client.login(config.discordToken);
}
