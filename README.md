# AI Notes Generator

Turns a recorded YouTube class into detailed, handwritten-style study notes, delivered as PDFs in **Hindi**, **English** and **Hinglish**.

The notes are built from both the teacher's speech and what appears on screen: slides, tables and whiteboard writing. They look like a neat student notebook, with ruled pages, a red margin, a handwriting font, highlights, sticky-note exam tips, simple diagrams and the video timestamp of every topic in the margin.

Right now the tool is set up for the daily 6:30 AM current affairs class on [Utkarsh Classes](https://www.youtube.com/@UTKARSHCLASSES13). It can make notes for any YouTube video you give it.

## What you get

For each class, a folder in `output/` such as `output/2026-10-21_ep2209/`:

```
notes-hindi.pdf      notes-hindi.html
notes-english.pdf    notes-english.html
notes-hinglish.pdf   notes-hinglish.html
```

A 90-minute class usually becomes 12–16 A4 pages per language. The HTML files are the same notes as web pages.

The notes record exactly what the teacher says and shows. Figures are never corrected or "fixed". Promotions, greetings and repeated recaps are left out.

## Requirements

| Tool | Why | Install (Windows) |
|---|---|---|
| [Bun](https://bun.sh) 1.2+ | Runs the tool | `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Finds classes and downloads captions and video | `winget install yt-dlp.yt-dlp` |
| [ffmpeg](https://ffmpeg.org) | Extracts frames from the video | `winget install Gyan.FFmpeg` |
| [Claude Code](https://claude.com/claude-code) | Writes and translates the notes, using your Claude subscription | See its install guide, then run `claude` once and log in |
| [Groq](https://console.groq.com) API key (free) | Backup transcription when YouTube has no captions | Create a key in the Groq console |

Node.js 20+ also works in place of Bun: replace `bun` with `node` in the commands below.

## Setup

```sh
git clone <this-repo> ai-notes-generator
cd ai-notes-generator
bun install
bunx playwright install chromium
```

Create a file called `.env` in the project folder containing your Groq key:

```
GROQ_API_KEY=gsk_your_key_here
```

After installing yt-dlp or ffmpeg with winget, open a new terminal so they are on your `PATH`.

## Usage

**Notes for one video**, e.g. an older class:

```sh
bun src/cli.js generate https://www.youtube.com/watch?v=34Hek3ybp7A
```

**Notes for today's class.** This is what the daily schedule runs; it does nothing if the class isn't ready yet or is already done:

```sh
bun src/cli.js run
```

**Rebuild the PDFs** from notes already written, for example after changing the page design. No AI is used:

```sh
bun src/cli.js render 34Hek3ybp7A
```

A full class takes about 15 minutes. Progress is printed and also saved to `logs/notes.log`.

## Running it automatically every day

On Windows, register a scheduled task once:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\schedule-windows.ps1
```

**What the schedule does:**
- Checks every 15 minutes from 08:00 to 11:30 and makes the notes as soon as the class recording is ready.
- Waits up to 3 hours after the class ends for YouTube's captions, then transcribes with Groq instead.
- Needs your PC switched on and you logged in during that window.

To remove the task:

```powershell
Unregister-ScheduledTask -TaskName "AI Notes Generator" -Confirm:$false
```

On a Linux server, use cron instead, with the server's timezone set to `Asia/Kolkata`:

```
*/15 8-11 * * * cd /path/to/ai-notes-generator && bun src/cli.js run
```

## How it works

1. **Find the class:** today's episode is found on the channel's Live tab by its title, e.g. `21 October 2026 Current Affairs | Episode 2209`.
2. **Transcript:** YouTube's Hindi auto-captions are downloaded. If they're missing, the audio is transcribed with Groq Whisper instead.
3. **Frames:** the video is downloaded at 720p. A frame is taken every 20 seconds and grouped into time-stamped sheets, and the video is then deleted.
4. **Hindi notes:** Claude writes them in 20-minute parts, each using its transcript and frames. The rules are in [`prompts/notes.md`](prompts/notes.md).
5. **Translations:** Claude translates the Hindi notes into English and Hinglish ([`prompts/translate.md`](prompts/translate.md)).
6. **PDFs:** the notebook-style pages are rendered with Chromium. The page design is in [`templates/`](templates/).

Each step saves its result in `work/<video-id>/`. If a run stops partway (usage limit reached, PC asleep, network drop), the next run continues from the last finished step instead of starting over. To redo a class completely, delete its `work/<video-id>/` folder.

## Costs and limits

- **Claude:** each class uses about 15 requests on your Claude subscription, through Claude Code. No API key is needed and there are no per-request charges, but the requests count toward your plan's usage limits. Avoid heavy Claude use while a class is being processed.
- **Groq:** the free tier covers about 8 hours of audio a day, and it is only used when captions are missing.
- **Everything else:** free and runs on your machine.

## Settings

Optional values for `.env`:

| Setting | Default | Purpose |
|---|---|---|
| `NOTES_MODEL` | `sonnet` | Claude model used for the notes |
| `YTDLP_PATH` | `yt-dlp` | Path to yt-dlp if it's not on `PATH` |
| `FFMPEG_PATH` | `ffmpeg` | Path to ffmpeg if it's not on `PATH` |
| `CLAUDE_PATH` | `claude` | Path to Claude Code if it's not on `PATH` |
| `FRAME_FONT` | Arial (Windows), DejaVu Sans (Linux) | Font for the timestamps on frame sheets |

The channel, the title pattern, the 3-hour caption wait and the part length are set in [`src/config.js`](src/config.js).

## Troubleshooting

| Message or problem | What to do |
|---|---|
| `YouTube captions are not available yet` | Normal shortly after a class. The schedule retries automatically and switches to Groq after 3 hours. To force it right away, use `generate`. |
| `Claude usage limit reached` | Progress is saved. Run the same command again after your limit resets. |
| `could not start yt-dlp` / `ffmpeg` / `claude` | The tool isn't on `PATH`. Open a new terminal, or set its path in `.env`. |
| `Executable doesn't exist` (Chromium) | Run `bunx playwright install chromium`. |
| A class was skipped | Check `logs/notes.log`. The title has to match the `Current Affairs \| Episode` pattern. |

Exit codes: `0` done or nothing to do · `1` error · `2` Claude usage limit reached · `3` captions not ready yet.

## Project layout

```
src/        the CLI and pipeline steps
prompts/    instructions Claude follows for writing and translating notes
templates/  notebook page design (CSS) and the page layout script
samples/    hand-made reference notes for episode 2209
scripts/    Windows scheduler setup
SPEC.md     what the notes must contain, and the decisions behind it
```
