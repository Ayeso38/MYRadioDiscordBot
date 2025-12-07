# Hosting Guide

Deploy MY.Radio Bot for 24/7 uptime.

## Recommended: Railway (Free)

### Step 1: Push to GitHub

Make sure your code is on GitHub (public or private).

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Select your repository

### Step 3: Add Environment Variables

In Railway dashboard, go to **Variables** and add:

| Variable | Value |
|----------|-------|
| `DISCORD_TOKEN` | Your bot token |
| `DISCORD_CLIENT_ID` | Your client ID |

### Step 4: Deploy

Click **Deploy** and wait 2-3 minutes. Your bot is now online 24/7!

---

## Alternative Platforms

### Render (Free)
- [render.com](https://render.com)
- Free tier sleeps after 15min idle

### Fly.io (Free)
- [fly.io](https://fly.io)
- 3 free VMs

### DigitalOcean ($4-6/month)
- Full VPS control
- Use PM2 for process management:
```bash
npm install -g pm2
pm2 start dist/bot.js --name "myradio"
pm2 save
pm2 startup
```

---

## Important Notes

- ❌ **Vercel does NOT work** (serverless, not for bots)
- ❌ **GitHub Pages does NOT work** (static sites only)
- ✅ Use platforms that support **long-running processes**
