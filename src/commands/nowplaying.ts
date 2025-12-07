import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show what radio station is currently playing');

export async function execute(interaction: any) {
  const client = interaction.client;
  const guildId = interaction.guildId;

  const currentStation = client.musicPlayer.getCurrentStation(guildId);

  if (!currentStation) {
    return interaction.reply({
      content: '❌ Nothing is currently playing!',
      flags: 64,
    });
  }

  const isPlaying = client.musicPlayer.isPlaying(guildId);
  const playerEmbed = client.musicPlayer.createPlayerEmbed(currentStation, isPlaying);

  await interaction.reply({
    embeds: [playerEmbed],
    flags: 64,
  });
}
