import { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MusicPlayerManager } from './musicPlayer';

dotenv.config();

// Extend Client to store commands and music player
interface ExtendedClient extends Client {
  commands: Collection<string, any>;
  musicPlayer: MusicPlayerManager;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // Required for voice
  ],
}) as ExtendedClient;

client.commands = new Collection();
client.musicPlayer = new MusicPlayerManager();

// Load commands
async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');

  console.log(`📂 Looking for commands in: ${commandsPath}`);

  if (!fs.existsSync(commandsPath)) {
    console.warn('⚠️  Commands directory not found. Skipping command loading.');
    return;
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file =>
    (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts')
  );
  console.log(`📄 Found ${commandFiles.length} command file(s): ${commandFiles.join(', ')}`);

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);

      if (!command.data) {
        console.warn(`⚠️  ${file} - Missing 'data' export`);
        continue;
      }

      if (!command.execute) {
        console.warn(`⚠️  ${file} - Missing 'execute' export`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name} (from ${file})`);
    } catch (error: any) {
      console.error(`❌ Error loading command ${file}:`);
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error(`   ${error.stack.split('\n')[1]}`);
      }
    }
  }

  console.log(`\n📊 Total commands loaded: ${client.commands.size}`);
}

// Register commands with Discord
async function registerCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const commands: any[] = [];

  // Collect command data
  client.commands.forEach((command: any) => {
    if (command.data) {
      commands.push(command.data.toJSON());
    }
  });

  try {
    console.log(`📄 Registering ${commands.length} command(s)...`);

    if (guildId) {
      // Guild-specific commands (faster for testing)
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log('✅ Commands registered for guild (testing mode)');
    } else {
      // Global commands (takes ~1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log('✅ Commands registered globally');
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// Event: Bot is ready
client.once('ready', async () => {
  console.log(`\n✅ Bot logged in as ${client.user?.tag}`);
  client.user?.setActivity('Malaysian Radio Stations 🎙️', { type: ActivityType.Listening });

  await loadCommands();
  await registerCommands();
});

// Event: Interaction (commands, buttons, select menus)
client.on('interactionCreate', async (interaction) => {
  // Handle slash commands
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Command error:', error);
      const content = 'There was an error while executing this command!';
      if (interaction.replied) {
        await interaction.followUp({ content, ephemeral: true });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  }

  // Handle select menus
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'station_select') {
      const stationId = interaction.values[0];
      const { STATIONS } = require('./constants');
      const station = STATIONS.find((s: any) => s.id === stationId);

      if (!station) {
        return interaction.reply({
          content: 'Station not found!',
          ephemeral: true,
        });
      }

      const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎙️ ${station.name}`)
        .setDescription(station.category)
        .addFields(
          { name: 'Frequency', value: station.frequency, inline: true },
          { name: 'State', value: station.state, inline: true },
          { name: 'Category', value: station.category, inline: true }
        )
        .setThumbnail(station.logo || null)
        .setFooter({ text: 'Click Play to start streaming in your voice channel!' });

      // Create play button (not a link, so it can have customId)
      const playButton = new ButtonBuilder()
        .setCustomId(`play_${station.id}`)
        .setLabel('▶️ Play')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(playButton);

      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: 64, // MessageFlags.Ephemeral
      });
    }
  }

  // Handle buttons
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('play_')) {
      const stationId = interaction.customId.replace('play_', '');
      const { STATIONS } = require('./constants');
      const station = STATIONS.find((s: any) => s.id === stationId);

      if (!station) {
        return interaction.reply({
          content: '❌ Station not found!',
          ephemeral: true,
        });
      }

      // Check if user is in a voice channel
      const member = interaction.member as any;
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ You need to be in a voice channel to play radio!',
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      try {
        // Play the station
        await client.musicPlayer.play(voiceChannel, station, interaction.channelId);

        // Create player embed with controls
        const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
        const playerEmbed = client.musicPlayer.createPlayerEmbed(station, true);

        // Create control buttons
        const pauseButton = new ButtonBuilder()
          .setCustomId('pause')
          .setLabel('⏸️ Pause')
          .setStyle(ButtonStyle.Primary);

        const stopButton = new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('⏹️ Stop')
          .setStyle(ButtonStyle.Danger);

        const controlRow = new ActionRowBuilder().addComponents(pauseButton, stopButton);

        await interaction.editReply({
          content: `✅ Joined **${voiceChannel.name}**`,
          embeds: [playerEmbed],
          components: [controlRow],
        });

      } catch (error) {
        console.error('Error playing station:', error);
        await interaction.editReply({
          content: '❌ Failed to play the radio station. Please try again.',
        });
      }
    }

    // Pause button
    if (interaction.customId === 'pause') {
      const guildId = interaction.guildId!;
      const isPaused = client.musicPlayer.isPaused(guildId);

      if (isPaused) {
        // Resume
        client.musicPlayer.resume(guildId);
        const station = client.musicPlayer.getCurrentStation(guildId);

        if (station) {
          const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
          const playerEmbed = client.musicPlayer.createPlayerEmbed(station, true);

          const pauseButton = new ButtonBuilder()
            .setCustomId('pause')
            .setLabel('⏸️ Pause')
            .setStyle(ButtonStyle.Primary);

          const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('⏹️ Stop')
            .setStyle(ButtonStyle.Danger);

          const controlRow = new ActionRowBuilder().addComponents(pauseButton, stopButton);

          await interaction.update({
            embeds: [playerEmbed],
            components: [controlRow],
          });
        }
      } else {
        // Pause
        client.musicPlayer.pause(guildId);
        const station = client.musicPlayer.getCurrentStation(guildId);

        if (station) {
          const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
          const playerEmbed = client.musicPlayer.createPlayerEmbed(station, false);

          const resumeButton = new ButtonBuilder()
            .setCustomId('pause')
            .setLabel('▶️ Resume')
            .setStyle(ButtonStyle.Success);

          const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('⏹️ Stop')
            .setStyle(ButtonStyle.Danger);

          const controlRow = new ActionRowBuilder().addComponents(resumeButton, stopButton);

          await interaction.update({
            embeds: [playerEmbed],
            components: [controlRow],
          });
        }
      }
    }

    // Stop button
    if (interaction.customId === 'stop') {
      const guildId = interaction.guildId!;
      const stopped = await client.musicPlayer.stop(guildId);

      if (stopped) {
        await interaction.update({
          content: '⏹️ Stopped playing and left the voice channel.',
          embeds: [],
          components: [],
        });
      } else {
        await interaction.reply({
          content: '❌ Nothing is currently playing!',
          ephemeral: true,
        });
      }
    }
  }
});

// Login
client.login(process.env.DISCORD_TOKEN);

console.log('🚀 Bot starting...');
