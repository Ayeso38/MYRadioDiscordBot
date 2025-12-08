import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  AudioPlayer,
  VoiceConnection,
  StreamType
} from '@discordjs/voice';
import { VoiceBasedChannel, EmbedBuilder } from 'discord.js';
import { Station } from './types';

interface PlayerState {
  connection: VoiceConnection;
  player: AudioPlayer;
  currentStation: Station | null;
  textChannelId: string;
  voiceChannel: VoiceBasedChannel;
  isReconnecting: boolean;
}

export class MusicPlayerManager {
  private players: Map<string, PlayerState> = new Map();

  async play(voiceChannel: VoiceBasedChannel, station: Station, textChannelId: string): Promise<void> {
    const guildId = voiceChannel.guild.id;

    try {
      // Get or create connection
      let playerState = this.players.get(guildId);

      if (!playerState) {
        // Create new voice connection
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
        });

        // Create audio player
        const player = createAudioPlayer();

        // Handle connection ready
        connection.on(VoiceConnectionStatus.Ready, () => {
          console.log(`✅ Connected to voice channel in ${voiceChannel.guild.name}`);
        });

        // Handle disconnection
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
              entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
          } catch (error) {
            connection.destroy();
            this.players.delete(guildId);
          }
        });

        playerState = {
          connection,
          player,
          currentStation: null,
          textChannelId,
          voiceChannel,
          isReconnecting: false,
        };

        this.players.set(guildId, playerState);
        connection.subscribe(player);

        // Set up auto-reconnect on Idle (stream ended)
        player.on(AudioPlayerStatus.Idle, () => {
          const state = this.players.get(guildId);
          if (state && state.currentStation && !state.isReconnecting) {
            console.log(`🔄 Stream ended, auto-reconnecting to: ${state.currentStation.name}`);
            this.reconnectStream(guildId);
          }
        });

        // Set up error handling with auto-reconnect
        player.on('error', (error) => {
          console.error(`❌ Audio player error:`, error);
          const state = this.players.get(guildId);
          if (state && state.currentStation && !state.isReconnecting) {
            console.log(`🔄 Error occurred, attempting to reconnect...`);
            setTimeout(() => this.reconnectStream(guildId), 2000);
          }
        });
      }

      // Start playing the stream
      this.startStream(playerState, station, textChannelId);

    } catch (error) {
      console.error('Error in play function:', error);
      throw error;
    }
  }

  private startStream(playerState: PlayerState, station: Station, textChannelId: string): void {
    // Create audio stream using FFmpeg for M3U8/HLS support
    const stream = this.createStream(station.streamUrl);
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });

    // Set volume to 50% to prevent distortion
    if (resource.volume) {
      resource.volume.setVolume(0.5);
    }

    // Update state
    playerState.currentStation = station;
    playerState.textChannelId = textChannelId;
    playerState.isReconnecting = false;

    // Play the resource
    playerState.player.play(resource);
    console.log(`🎵 Now playing: ${station.name}`);
  }

  private async reconnectStream(guildId: string): Promise<void> {
    const playerState = this.players.get(guildId);
    if (!playerState || !playerState.currentStation) return;

    playerState.isReconnecting = true;
    console.log(`🔄 Reconnecting to: ${playerState.currentStation.name}`);

    try {
      // Small delay before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.startStream(playerState, playerState.currentStation, playerState.textChannelId);
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      playerState.isReconnecting = false;

      // Retry after 5 seconds
      setTimeout(() => this.reconnectStream(guildId), 5000);
    }
  }

  async stop(guildId: string): Promise<boolean> {
    const playerState = this.players.get(guildId);

    if (!playerState) {
      return false;
    }

    // Clear current station to prevent auto-reconnect
    playerState.currentStation = null;
    playerState.player.stop();
    playerState.connection.destroy();
    this.players.delete(guildId);

    return true;
  }

  pause(guildId: string): boolean {
    const playerState = this.players.get(guildId);
    if (!playerState) return false;

    return playerState.player.pause();
  }

  resume(guildId: string): boolean {
    const playerState = this.players.get(guildId);
    if (!playerState) return false;

    return playerState.player.unpause();
  }

  getCurrentStation(guildId: string): Station | null {
    const playerState = this.players.get(guildId);
    return playerState?.currentStation || null;
  }

  isPlaying(guildId: string): boolean {
    const playerState = this.players.get(guildId);
    if (!playerState) return false;

    return playerState.player.state.status === AudioPlayerStatus.Playing;
  }

  isPaused(guildId: string): boolean {
    const playerState = this.players.get(guildId);
    if (!playerState) return false;

    return playerState.player.state.status === AudioPlayerStatus.Paused;
  }

  private createStream(url: string): any {
    // Use prism-media FFmpeg for proper audio transcoding
    const prism = require('prism-media');

    console.log(`🎵 Creating FFmpeg stream for: ${url.substring(0, 60)}...`);

    // FFmpeg arguments for HLS/M3U8 stream transcoding
    const ffmpegArgs = [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', url,
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
    ];

    const transcoder = new prism.FFmpeg({
      args: ffmpegArgs,
    });

    transcoder.on('error', (error: any) => {
      console.error('❌ FFmpeg transcoder error:', error.message);
    });

    console.log('✅ FFmpeg stream started');
    return transcoder;
  }

  // Create a nice player embed
  createPlayerEmbed(station: Station, isPlaying: boolean = true): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(isPlaying ? '#00ff00' : '#ff0000')
      .setTitle(`${isPlaying ? '🎵' : '⏸️'} Now ${isPlaying ? 'Playing' : 'Paused'}`)
      .setDescription(`**${station.name}**`)
      .addFields(
        { name: '📻 Frequency', value: station.frequency, inline: true },
        { name: '📍 State', value: station.state, inline: true },
        { name: '🎭 Category', value: station.category, inline: true }
      )
      .setThumbnail(station.logo || 'https://cdn.discordapp.com/embed/avatars/0.png')
      .setTimestamp()
      .setFooter({ text: 'Malaysian Radio Bot 🎙️' });

    return embed;
  }
}
