import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playing radio and leave voice channel');

export async function execute(interaction: any) {
  const client = interaction.client;
  const guildId = interaction.guildId;

  const stopped = await client.musicPlayer.stop(guildId);

  if (stopped) {
    await interaction.reply({
      content: '⏹️ Stopped playing and left the voice channel.',
      flags: 64,
    });
  } else {
    await interaction.reply({
      content: '❌ Nothing is currently playing!',
      flags: 64,
    });
  }
}
