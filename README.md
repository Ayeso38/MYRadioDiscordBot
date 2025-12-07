# 🎙️ MY.Radio Discord Bot

> **Version 0.10** | Stream Malaysian radio stations directly in Discord voice channels!

A feature-rich Discord bot that lets users browse and stream 17+ Malaysian radio stations from 9 states — all within Discord.

![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 🎵 **Voice Streaming** — Stream radio directly to voice channels
- 📻 **17+ Radio Stations** — From 9 Malaysian states
- 🎛️ **Interactive Controls** — Play, pause, stop with buttons
- 📊 **Now Playing** — See current station info
- 🔍 **Filter by State** — Browse stations by region
- ⚡ **Slash Commands** — Modern Discord interactions

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))

### Installation

```bash
# Clone or download the project
cd MYRadioDiscordBot

# Install dependencies
npm install

# Build the project
npm run build

# Start the bot
npm start
```

### Environment Setup

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=your_test_server_id  # Optional: for faster command registration
```

---

## 📋 Commands

| Command | Description |
|---------|-------------|
| `/stations` | Browse all radio stations with optional state filter |
| `/nowplaying` | Show currently playing station info |
| `/stop` | Stop playback and leave voice channel |

---

## 🎧 Supported Radio Stations

### By State

| State | Stations |
|-------|----------|
| **Kuala Lumpur** | Hitz FM, Fly FM, BFM 89.9, Hot FM, ERA, SINAR |
| **Selangor** | Selangor FM, Best FM |
| **Penang** | Mutiara FM |
| **Johor** | Johor FM, Best 104 |
| **Sabah** | Sabah FM, KK FM |
| **Sarawak** | Sarawak FM, Cats FM |
| **Terengganu** | Manis FM, Terengganu FM |
| **Kedah** | Kedah FM |

---

## 📁 Project Structure

```
MYRadioDiscordBot/
├── src/
│   ├── bot.ts              # Main bot entry point
│   ├── musicPlayer.ts      # Voice streaming logic
│   ├── constants.ts        # Radio stations data
│   ├── types.ts            # TypeScript interfaces
│   └── commands/
│       ├── stations.ts     # /stations command
│       ├── nowplaying.ts   # /nowplaying command
│       └── stop.ts         # /stop command
├── dist/                   # Compiled JavaScript
├── .env                    # Environment variables
├── package.json
└── tsconfig.json
```

---

## ⚙️ Dependencies

### Runtime
| Package | Purpose |
|---------|---------|
| `discord.js` v14 | Discord bot framework |
| `@discordjs/voice` v0.19 | Voice connection handling |
| `@snazzah/davey` | Discord DAVE protocol (E2EE) |
| `sodium-native` | Voice encryption |
| `opusscript` | Audio encoding |
| `ffmpeg-static` | Audio processing |
| `dotenv` | Environment variables |

### Development
| Package | Purpose |
|---------|---------|
| `typescript` | Type-safe JavaScript |
| `ts-node` | Run TypeScript directly |
| `@types/node` | Node.js type definitions |

---

## 🤖 Bot Permissions

When inviting the bot, ensure these permissions:

### Required
- ✅ Send Messages
- ✅ Embed Links
- ✅ Use Slash Commands
- ✅ Connect (Voice)
- ✅ Speak (Voice)

### Bot Invite URL Format
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot%20applications.commands
```

---

## 🐛 Troubleshooting

### Commands not appearing?
- **Guild commands**: Appear instantly (use `GUILD_ID` in `.env`)
- **Global commands**: Take up to 1 hour to sync

### Bot won't join voice?
1. Ensure bot has **Connect** and **Speak** permissions
2. Check you're in a voice channel before using `/stations`

### Audio not playing?
1. Verify `ffmpeg-static` and `opusscript` are installed
2. Check stream URLs are accessible

### Encryption errors?
Make sure these packages are installed:
```bash
npm install sodium-native @snazzah/davey opusscript
```

---

## 🔄 Adding New Stations

1. Edit `src/constants.ts`
2. Add station to `STATIONS` array:
```typescript
{
  id: 'station-id',
  name: 'Station Name',
  frequency: '100.0 FM',
  state: 'State Name',
  category: 'Music',
  streamUrl: 'https://stream-url.com/stream',
  logoColor: 'bg-blue-500',
  logo: 'https://logo-url.com/logo.png' // optional
}
```
3. Rebuild: `npm run build`
4. Restart: `npm start`

---

## 📝 Scripts

```bash
npm run build   # Compile TypeScript to JavaScript
npm run start   # Run compiled bot
npm run dev     # Run with ts-node (development)
npm run watch   # Watch mode for TypeScript
```

---

## 📄 License

MIT License © 2024 Ayeso

---

<div align="center">

Made with ❤️ for Malaysian Radio Enthusiasts

**[Report Bug](https://github.com/your-repo/issues)** · **[Request Feature](https://github.com/your-repo/issues)**

</div>
