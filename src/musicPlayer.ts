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
import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Get FFmpeg path - MUST use system ffmpeg on Railway to avoid SIGSEGV
function getFFmpegPath(): string {
  // Check for system FFmpeg in standard locations FIRST
  const systemPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/nix/store',  // Railway/Nixpacks installs here
  ];

  // Check standard system paths first
  for (const sysPath of systemPaths.slice(0, 2)) {
    if (fs.existsSync(sysPath)) {
      console.log(`✅ Using system ffmpeg: ${sysPath}`);
      return sysPath;
    }
  }

  // Check Nix store (Railway uses Nixpacks)
  try {
    const result = execSync('which ffmpeg 2>/dev/null', { encoding: 'utf-8' }).trim();
    // Only use if it's NOT from node_modules (ffmpeg-static causes SIGSEGV)
    if (result && !result.includes('node_modules')) {
      console.log(`✅ Using system ffmpeg: ${result}`);
      return result;
    }
  } catch (e) {
    // Ignore
  }

  // Try finding ffmpeg in nix store directly
  try {
    const nixResult = execSync('find /nix/store -name "ffmpeg" -type f -executable 2>/dev/null | head -1', { encoding: 'utf-8' }).trim();
    if (nixResult && fs.existsSync(nixResult)) {
      console.log(`✅ Using Nix ffmpeg: ${nixResult}`);
      return nixResult;
    }
  } catch (e) {
    // Ignore
  }

  // Environment variable override (useful for debugging)
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    console.log(`✅ Using FFMPEG_PATH env: ${process.env.FFMPEG_PATH}`);
    return process.env.FFMPEG_PATH;
  }

  // ONLY use ffmpeg-static for LOCAL development (Windows/Mac)
  // It causes SIGSEGV on Railway's Linux environment
  if (process.platform !== 'linux') {
    try {
      const staticPath = require('ffmpeg-static') as string;
      if (staticPath && fs.existsSync(staticPath)) {
        console.log(`⚠️ Using ffmpeg-static (local dev): ${staticPath}`);
        return staticPath;
      }
    } catch (e) {
      console.log('⚠️ ffmpeg-static not available');
    }
  } else {
    console.log('⚠️ Skipping ffmpeg-static on Linux (causes SIGSEGV)');
  }

  // Last resort - hope ffmpeg is in PATH
  console.log('⚠️ Using ffmpeg from PATH (last resort)');
  return 'ffmpeg';
}

const ffmpegPath = getFFmpegPath();

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

      // Create audio stream using direct URL
      const stream = await this.createStream(station.streamUrl);

      // Use OggOpus for HLS streams (FFmpeg outputs Opus), Arbitrary for regular streams
      const isHLS = this.isHLSStream(station.streamUrl);
      const resource = createAudioResource(stream, {
        inputType: isHLS ? StreamType.OggOpus : StreamType.Arbitrary,
        inlineVolume: !isHLS,  // Volume control not available for OggOpus
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
    // Check if this is an HLS stream
    if (this.isHLSStream(url)) {
      console.log(`🎬 Detected HLS stream, using FFmpeg: ${url.substring(0, 50)}...`);
      return this.createHLSStream(url);
    }

    // Use direct HTTP/HTTPS streaming for regular streams
    const https = require('https');
    const http = require('http');

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
        }
      }, (response: any) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`Following redirect to: ${redirectUrl}`);
          this.createStream(redirectUrl).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode === 200) {
          console.log(`✅ Stream connected: ${url.substring(0, 50)}...`);
          resolve(response);
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }
      });

      request.on('error', (error: any) => {
        console.error('Stream error:', error.message);
        reject(error);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  /**
   * Detect if URL is an HLS/m3u8 stream
   */
  private isHLSStream(url: string): boolean {
    const lowerUrl = url.toLowerCase();

    // Check for common HLS indicators
    if (lowerUrl.includes('.m3u8')) return true;
    if (lowerUrl.includes('/hls/')) return true;
    if (lowerUrl.includes('/playlist.m3u')) return true;
    if (lowerUrl.includes('manifest(format=m3u8')) return true;

    return false;
  }

  /**
   * Create an audio stream from HLS/m3u8 URL using FFmpeg
   * FFmpeg handles: HLS protocol, segment downloading, audio decoding
   * Output: Raw PCM audio stream for Discord to encode
   */
  private createHLSStream(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`🎬 Starting FFmpeg HLS decoder`);
      console.log(`📍 FFmpeg path: ${ffmpegPath}`);
      console.log(`🔗 URL: ${url}`);

      // FFmpeg arguments for HLS streaming - output OGG/Opus (Discord native format)
      const ffmpegArgs = [
        // Logging - use info level to see more details
        '-loglevel', 'info',
        '-hide_banner',

        // Input options for network streams
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',

        // Input
        '-i', url,

        // Audio processing - encode to Opus (Discord native)
        '-vn',                                // No video
        '-c:a', 'libopus',                    // Opus codec
        '-b:a', '128k',                       // 128kbps audio bitrate
        '-ar', '48000',                       // 48kHz sample rate (Discord requirement)
        '-ac', '2',                           // Stereo
        '-application', 'audio',              // Optimize for audio

        // Output format
        '-f', 'ogg',                          // OGG container
        'pipe:1'                              // Output to stdout
      ];

      console.log(`📝 FFmpeg args: ${ffmpegArgs.slice(0, 10).join(' ')}...`);

      const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let errorOutput = '';
      let hasData = false;
      let resolved = false;

      // Log process info
      console.log(`🔄 FFmpeg PID: ${ffmpeg.pid}`);

      // Capture all stderr output
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const message = data.toString();
        errorOutput += message;

        // Log everything for debugging
        console.log(`[FFmpeg] ${message.trim().substring(0, 200)}`);
      });

      // Check when we get actual audio data
      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        if (!hasData) {
          hasData = true;
          console.log(`✅ HLS stream connected - receiving audio data (${chunk.length} bytes)`);
          if (!resolved) {
            resolved = true;
            resolve(ffmpeg.stdout);
          }
        }
      });

      ffmpeg.on('spawn', () => {
        console.log(`✅ FFmpeg process spawned successfully`);
      });

      ffmpeg.on('error', (error) => {
        console.error('❌ FFmpeg spawn error:', error.message);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      ffmpeg.on('close', (code, signal) => {
        console.log(`FFmpeg closed: code=${code}, signal=${signal}`);
        if (!hasData && !resolved) {
          console.error(`❌ FFmpeg failed - no audio received`);
          console.error(`FFmpeg stderr:\n${errorOutput.slice(-1000)}`);
          resolved = true;
          reject(new Error(`FFmpeg exited: code=${code}, signal=${signal}`));
        }
      });

      // Timeout - if no data after 20 seconds, reject
      setTimeout(() => {
        if (!hasData && !resolved) {
          console.error('❌ FFmpeg timeout - no audio data received after 20s');
          console.error(`FFmpeg stderr:\n${errorOutput}`);
          ffmpeg.kill('SIGKILL');
          resolved = true;
          reject(new Error('HLS stream timeout - no audio data received'));
        }
      }, 20000);
    });
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
