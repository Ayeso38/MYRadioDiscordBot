import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { STATIONS, STATES } from '../constants';

export const data = new SlashCommandBuilder()
  .setName('stations')
  .setDescription('List all Malaysian radio stations')
  .addStringOption((option) =>
    option
      .setName('state')
      .setDescription('Filter by state (optional)')
      .setRequired(false)
      .addChoices(
        { name: 'All', value: 'All' },
        ...STATES.filter(s => s !== 'All').map((state) => ({
          name: state,
          value: state,
        }))
      )
  );

export async function execute(interaction: any) {
  await interaction.deferReply();

  const selectedState = interaction.options.getString('state') || 'All';

  const filteredStations =
    selectedState === 'All'
      ? STATIONS
      : STATIONS.filter((s) => s.state === selectedState);

  if (filteredStations.length === 0) {
    return interaction.editReply('❌ No stations found for that state.');
  }

  // Create embed showing stations
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`🎙️ Malaysian Radio Stations - ${selectedState}`)
    .setDescription(
      filteredStations
        .map(
          (s, i) =>
            `**${i + 1}. ${s.name}** (${s.frequency})\n📍 ${s.state} • 📻 ${s.category}`
        )
        .join('\n\n')
    )
    .setFooter({ text: `Total: ${filteredStations.length} stations` })
    .setTimestamp();

  // Create dropdown to select a station
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('station_select')
    .setPlaceholder('Select a station to get more info')
    .addOptions(
      ...filteredStations.map((station) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(station.name)
          .setDescription(`${station.frequency} • ${station.state}`)
          .setValue(station.id)
          .setEmoji('🎙️')
      )
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );

  await interaction.editReply({
    embeds: [embed],
    components: [row],
  });
}
