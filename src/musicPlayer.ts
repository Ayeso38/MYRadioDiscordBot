import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  AudioPlayer,
  VoiceConnection,
  StreamType,
  generateDependencyReport
} from '@discordjs/voice';
import { VoiceBasedChannel, EmbedBuilder } from 'discord.js';
import { Station } from './types';
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';

// Log voice dependency report at startup
console.log('🔧 Voice Dependencies Report:');
console.log(generateDependencyReport());

// Get FFmpeg path - MUST use system ffmpeg on Railway to avoid SIGSEGV
function getFFmpegPath(): string {
  // Check for system FFmpeg in standard locations FIRST
  const systemPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ];

  // Check standard system paths first
  for (const sysPath of systemPaths) {
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

  // Last resort
  console.log('⚠️ Using ffmpeg from PATH (last resort)');
  return 'ffmpeg';
}

const ffmpegPath = getFFmpegPath();

interface PlayerState {
  connection: VoiceConnection;
  player: AudioPlayer;
  currentStation: Station | null;
  textChannelId: string;
  ffmpegProcess?: any;  // Track FFmpeg process for cleanup
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
        
        // Subscribe player to connection
        const subscription = connection.subscribe(player);
        console.log(`🔗 Player subscribed to connection: ${subscription ? 'YES' : 'NO'}`);

        // Wait for connection to be ready
        try {
          await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
          console.log(`✅ Voice connection is ready`);
        } catch (error) {
          console.error(`❌ Voice connection failed to become ready`);
          throw error;
        }
      } else {
        // Kill any existing FFmpeg process before starting new stream
        if (playerState.ffmpegProcess) {
          try {
            playerState.ffmpegProcess.kill('SIGKILL');
          } catch (e) {
            // Ignore
          }
          playerState.ffmpegProcess = undefined;
        }
      }

      // Check if this is an HLS stream
      const isHLS = this.isHLSStream(station.streamUrl);
      console.log(`📻 Stream type: ${isHLS ? 'HLS (m3u8)' : 'Direct (MP3/AAC)'}`);

      let resource;

      if (isHLS) {
        // HLS streams: Use FFmpeg with Raw PCM output
        console.log(`🎬 Using FFmpeg for HLS stream`);
        const { stream, ffmpegProcess } = await this.createHLSStream(station.streamUrl);
        playerState.ffmpegProcess = ffmpegProcess;
        
        resource = createAudioResource(stream, {
          inputType: StreamType.Raw,
          inlineVolume: true,
        });
      } else {
        // Direct streams: Pass through without FFmpeg (no lag!)
        console.log(`📡 Using direct stream (no FFmpeg)`);
        const stream = await this.createDirectStream(station.streamUrl);
        
        resource = createAudioResource(stream, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true,
        });
      }

      // Set volume to 50% to prevent distortion
      if (resource.volume) {
        resource.volume.setVolume(0.5);
      }

      // Update state
      playerState.currentStation = station;
      playerState.textChannelId = textChannelId;

      // Play the resource
      playerState.player.play(resource);

      // Handle player events (remove old listeners first to prevent duplicates)
      playerState.player.removeAllListeners();
      
      playerState.player.on(AudioPlayerStatus.Playing, () => {
        console.log(`🎵 Now playing: ${station.name}`);
      });

      playerState.player.on(AudioPlayerStatus.Buffering, () => {
        console.log(`⏳ Buffering...`);
      });

      playerState.player.on(AudioPlayerStatus.Idle, () => {
        console.log(`⏹️ Playback ended for: ${station.name}`);
      });

      playerState.player.on('error', (error) => {
        console.error(`❌ Audio player error:`, error.message);
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

    // Kill FFmpeg process if running
    if (playerState.ffmpegProcess) {
      try {
        playerState.ffmpegProcess.kill('SIGKILL');
      } catch (e) {
        // Ignore
      }
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

  /**
   * Detect if URL is an HLS/m3u8 stream
   */
  private isHLSStream(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.m3u8')) return true;
    if (lowerUrl.includes('/hls/')) return true;
    if (lowerUrl.includes('/playlist.m3u')) return true;
    if (lowerUrl.includes('manifest(format=m3u8')) return true;
    return false;
  }

  /**
   * Create a direct HTTP stream for non-HLS sources (MP3, AAC, etc.)
   * No FFmpeg = No lag!
   */
  private async createDirectStream(url: string): Promise<any> {
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
          console.log(`↪️ Following redirect to: ${redirectUrl.substring(0, 50)}...`);
          this.createDirectStream(redirectUrl).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode === 200) {
          console.log(`✅ Direct stream connected`);
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
   * Create an audio stream from HLS/m3u8 URL using FFmpeg
   * Output: Raw PCM s16le (required for HLS to work)
   */
  private createHLSStream(url: string): Promise<{ stream: any, ffmpegProcess: any }> {
    return new Promise((resolve, reject) => {
      console.log(`🎬 Starting FFmpeg HLS decoder`);
      console.log(`📍 FFmpeg path: ${ffmpegPath}`);

      // FFmpeg arguments for HLS streaming - output Raw PCM
      const ffmpegArgs = [
        '-loglevel', 'warning',
        '-hide_banner',

        // Input options for network streams
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',

        // Input
        '-i', url,

        // Audio processing - output raw PCM
        '-vn',                      // No video
        '-acodec', 'pcm_s16le',     // Raw PCM signed 16-bit little-endian
        '-ar', '48000',             // 48kHz sample rate
        '-ac', '2',                 // Stereo

        // Output format
        '-f', 's16le',              // Raw PCM format
        'pipe:1'                    // Output to stdout
      ];

      const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let errorOutput = '';
      let hasData = false;
      let resolved = false;

      console.log(`🔄 FFmpeg PID: ${ffmpeg.pid}`);

      ffmpeg.stderr.on('data', (data: Buffer) => {
        const message = data.toString();
        errorOutput += message;
        // Only log errors/warnings
        if (message.toLowerCase().includes('error') || message.toLowerCase().includes('warning')) {
          console.log(`[FFmpeg] ${message.trim().substring(0, 150)}`);
        }
      });

      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        if (!hasData) {
          hasData = true;
          console.log(`✅ HLS stream connected - receiving audio data`);
          if (!resolved) {
            resolved = true;
            resolve({ stream: ffmpeg.stdout, ffmpegProcess: ffmpeg });
          }
        }
      });

      ffmpeg.on('spawn', () => {
        console.log(`✅ FFmpeg process spawned`);
      });

      ffmpeg.on('error', (error) => {
        console.error('❌ FFmpeg spawn error:', error.message);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      ffmpeg.on('close', (code, signal) => {
        if (code !== 0 && code !== null) {
          console.log(`FFmpeg closed: code=${code}, signal=${signal}`);
        }
        if (!hasData && !resolved) {
          console.error(`❌ FFmpeg failed - no audio received`);
          resolved = true;
          reject(new Error(`FFmpeg exited: code=${code}, signal=${signal}`));
        }
      });

      // Timeout
      setTimeout(() => {
        if (!hasData && !resolved) {
          console.error('❌ FFmpeg timeout - no audio data received');
          ffmpeg.kill('SIGKILL');
          resolved = true;
          reject(new Error('HLS stream timeout'));
        }
      }, 20000);
    });
  }

  // Create player embed
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
