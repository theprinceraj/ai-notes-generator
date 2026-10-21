# AI Notes Generator

Turns the daily Utkarsh Classes current affairs live class into handwritten-style PDF notes in Hindi, English and Hinglish. See [SPEC.md](SPEC.md) for what the notes contain and why.

## Requirements

- [Bun](https://bun.sh) 1.2+ (Node.js 20+ also works: replace `bun` with `node`)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [ffmpeg](https://ffmpeg.org) on `PATH` (Windows: `winget install yt-dlp.yt-dlp Gyan.FFmpeg`)
- [Claude Code](https://claude.com/claude-code) (`claude`) logged in with a Claude subscription — the notes are written through it
- A [Groq](https://console.groq.com) API key, used only when YouTube captions are missing

```sh
bun install
bunx playwright install chromium
```

Put the Groq key in `.env`:

```
GROQ_API_KEY=gsk_...
```

Optional `.env` settings: `NOTES_MODEL` (default `sonnet`), and `YTDLP_PATH`, `FFMPEG_PATH`, `CLAUDE_PATH`, `FRAME_FONT` when those are not on the default paths.

## Usage

```sh
bun src/cli.js generate <youtube-url-or-id>   # notes for one video
bun src/cli.js run                            # today's class, if its recording is ready
bun src/cli.js render <youtube-url-or-id>     # rebuild PDFs from existing notes, no AI
```

PDFs (and their HTML) land in `output/<date>_ep<episode>/`. Intermediate files are in `work/<video-id>/`; a run that stops part-way (Claude usage limit, sleep, network) continues from there next time. Logs go to `logs/notes.log`.

Exit codes: `0` done or nothing to do, `1` error, `2` Claude usage limit reached, `3` captions not ready yet.

## Scheduling (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\schedule-windows.ps1
```

This runs `notes run` every 15 minutes from 08:00 to 11:30 IST. Each run exits immediately when the class is already done or not ready. YouTube captions are given 3 hours after the class ends; after that the audio is transcribed with Groq instead.

On a Linux VPS, use cron instead, with the server's timezone set to `Asia/Kolkata`:

```
*/15 8-11 * * * cd /path/to/ai-notes-generator && bun src/cli.js run
```
