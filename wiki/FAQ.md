# Frequently Asked Questions

## General

### How do I invite the bot to my server?
Use the invite link with proper permissions:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot%20applications.commands
```

### Does the bot work on multiple servers?
Yes! The bot can be in unlimited servers and works independently in each one.

### Is the bot free?
Yes, MY.Radio Bot is completely free and open source under the MIT License.

---

## Commands

### Why don't I see the commands?
- If using `GUILD_ID`: Commands appear instantly in that server only
- Without `GUILD_ID`: Global commands take up to 1 hour to sync

### Why does `/stations` show no stations?
Make sure you're in a server where the bot has been invited and commands are registered.

---

## Voice & Audio

### Why is the bot deafened?
This is normal! Bots that only play audio don't need to receive audio, so Discord deafens them to save bandwidth.

### Why is there no sound?
1. Make sure you're in a voice channel
2. Check bot has **Connect** and **Speak** permissions
3. Check if the stream URL is working

### Can I play radio in multiple voice channels?
One voice channel per server. Each server can play different stations independently.

---

## Hosting

### Can I use Vercel?
No. Vercel is for serverless functions, not long-running bots.

### What's the best free hosting?
Railway.app - 500 free hours per month, easy GitHub deployment.

### Will the bot stay online if I close my computer?
Only if hosted on a cloud platform like Railway. Running locally requires your PC to stay on.

---

## Troubleshooting

### "No compatible encryption modes" error
Update `@discordjs/voice` to latest:
```bash
npm install @discordjs/voice@latest @snazzah/davey sodium-native
```

### "Cannot find module opusscript" error
Install Opus encoder:
```bash
npm install opusscript
```

### Bot crashes when joining voice
Make sure all voice dependencies are installed:
```bash
npm install @discordjs/voice @snazzah/davey sodium-native opusscript ffmpeg-static
```

---

## Still have questions?

Open an issue on [GitHub](https://github.com/Ayeso38/MYRadioDiscordBot/issues)!
