# Commands

MY.Radio Bot uses Discord slash commands for easy interaction.

## Available Commands

### `/stations`
Browse all Malaysian radio stations.

**Options:**
- `state` (optional) - Filter by Malaysian state

**Usage:**
1. Type `/stations` in any text channel
2. Optionally select a state to filter
3. A list of stations will appear
4. Use the dropdown to select a station
5. Click **Play** to start streaming

---

### `/nowplaying`
Show what's currently playing in your server.

**Usage:**
- Type `/nowplaying` to see the current station info
- Shows station name, frequency, state, and category

---

### `/stop`
Stop the radio and disconnect from voice channel.

**Usage:**
- Type `/stop` to stop playback
- Bot will leave the voice channel

---

## Interactive Controls

When playing a station, you get button controls:

| Button | Action |
|--------|--------|
| ⏸️ **Pause** | Pause the stream |
| ▶️ **Resume** | Resume playback |
| ⏹️ **Stop** | Stop and leave channel |

---

## Tips

- You must be in a voice channel to play radio
- The bot will auto-deafen (this is normal)
- Each server plays independently
