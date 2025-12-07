# Installation Guide

## Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)

## Step 1: Download the Bot

```bash
git clone https://github.com/Ayeso38/MYRadioDiscordBot.git
cd MYRadioDiscordBot
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=your_test_server_id  # Optional: for faster command sync
```

### Getting Your Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and name it
3. Go to **Bot** section
4. Click **Reset Token** and copy it
5. Enable **Message Content Intent** under Privileged Gateway Intents

### Getting Your Client ID

1. In Developer Portal, go to **OAuth2** → **General**
2. Copy the **Client ID**

## Step 4: Build the Project

```bash
npm run build
```

## Step 5: Run the Bot

```bash
npm start
```

You should see:
```
🚀 Bot starting...
✅ Bot logged in as MY.Radio#1234
✅ Commands registered for guild (testing mode)
```

## Next Steps

- [Commands](Commands.md) - Learn how to use the bot
- [Hosting](Hosting.md) - Deploy for 24/7 uptime
