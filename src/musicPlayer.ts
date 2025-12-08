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
        };

        this.players.set(guildId, playerState);
        connection.subscribe(player);
      }

      // Create audio stream using FFmpeg for M3U8/HLS support
      const stream = await this.createStream(station.streamUrl);
      const resource = createAudioResource(stream, {
        inputType: StreamType.Raw, // Changed to Raw for FFmpeg PCM output
        inlineVolume: true,
      });

      // Set volume to 50% to prevent distortion
      if (resource.volume) {
        resource.volume.setVolume(0.5);
      }

      // Update state
      playerState.currentStation = station;
      playerState.textChannelId = textChannelId;

      // Play the resource
      playerState.player.play(resource);

      // Handle player events
      playerState.player.on(AudioPlayerStatus.Playing, () => {
        console.log(`🎵 Now playing: ${station.name}`);
      });

      playerState.player.on(AudioPlayerStatus.Idle, () => {
        console.log(`⏸️  Playback ended for: ${station.name}`);
      });

      playerState.player.on('error', (error) => {
        console.error(`❌ Audio player error:`, error);
      });

    } catch (error) {
      console.error('Error in play function:', error);
      throw error;
    }
  }

  async stop(guildId: string): Promise<boolean> {
    const playerState = this.players.get(guildId);

    if (!playerState) {
      return false;
    }

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

  private async createStream(url: string): Promise<any> {
    // Use FFmpeg to transcode M3U8/HLS streams to raw PCM audio for Discord
    const ffmpeg = require('ffmpeg-static');
    const { spawn } = require('child_process');

    console.log(`🎵 Creating FFmpeg stream for: ${url.substring(0, 60)}...`);

    // FFmpeg arguments for HLS/M3U8 stream transcoding
    const ffmpegArgs = [
      '-reconnect', '1',              // Enable reconnection
      '-reconnect_streamed', '1',     // Reconnect for streamed protocols
      '-reconnect_delay_max', '5',    // Max delay between reconnection attempts
      '-i', url,                       // Input URL
      '-analyzeduration', '0',         // Don't analyze stream (faster start)
      '-loglevel', '0',                // Suppress FFmpeg logs
      '-f', 's16le',                   // Output format: signed 16-bit little-endian PCM
      '-ar', '48000',                  // Audio sample rate: 48kHz (Discord standard)
      '-ac', '2',                      // Audio channels: 2 (stereo)
      'pipe:1'                         // Output to stdout
    ];

    const ffmpegProcess = spawn(ffmpeg, ffmpegArgs, {
      windowsHide: true,
    });

    // Handle FFmpeg errors
    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      // Only log critical errors, not warnings
      const message = data.toString();
      if (message.includes('error') || message.includes('Error')) {
        console.error('FFmpeg error:', message);
      }
    });

    ffmpegProcess.on('error', (error: any) => {
      console.error('❌ FFmpeg process error:', error.message);
    });

    ffmpegProcess.on('close', (code: number) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ FFmpeg exited with code ${code}`);
      }
    });

    console.log('✅ FFmpeg stream started');
    return ffmpegProcess.stdout;
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
