# AI Notes Generator — Project Spec (draft)

Generates detailed, handwritten-style PDF notes from YouTube videos.

## Phase 1 scope

- **Source:** one channel, https://www.youtube.com/@UTKARSHCLASSES13
- **Video in scope:** only the daily morning current affairs live class, which starts at 6:30 AM IST and runs Monday to Saturday.
  - Titles follow `DD Month YYYY Current Affairs | Episode NNNN | … | Kumar Gaurav Sir`.
  - Each class is 80–100 minutes and is listed on the channel's `/streams` tab.
- **Out of scope:** every other upload, including revision episodes (e.g. "1–17 October Current Affairs Revision"), other live classes, Shorts, promos and test discussions.
- **Run window:** about 8:00–10:00 AM IST, after the class ends.
- **Trigger:** that class's recording becoming available after the live stream ends.
- **Backlog:** existing videos only on manual request (pass a URL).
- **Turnaround:** within a few hours of the recording being available.
- **Publishing:** fully automatic, with no human review.

## Transcription

- **Primary:** YouTube's automatic Hindi captions (`hi-orig`).
- **Fallback:** Groq Whisper API (`whisper-large-v3`, free tier), used only if captions are still missing 2–3 hours after the recording becomes available.
- Groq is a fallback only because, in a test on 2026-10-21, it dropped content and changed facts compared with the captions.
- No local Whisper.

## Tech ecosystem

- **TypeScript run with Bun**, with no build step (Node.js 24+ can also run it), not Python.
  - Only type syntax that can simply be stripped out is used (`erasableSyntaxOnly`).
- The scheduler calls `bun.exe` directly, because the npm-installed `bun` command is a slow `.cmd` wrapper.
- yt-dlp is used as a standalone binary called from the CLI.
- Groq is called through its JavaScript SDK.
- PDFs are rendered with Playwright.

## Notes content

- Detailed: covers everything the teacher says, not a summary.
- Includes what's shown on screen (slides, PDFs, board writing) as well as speech.
- Visuals (tables, diagrams, mind maps, highlights) are used only where they add value. No padding or repetition.
- No extras: no MCQs, no one-liner lists, no PYQ sections.
- **Faithful to the teacher:** write exactly what the teacher says or shows.
  - Never correct, add or drop facts, even when a figure looks wrong.
  - The only things left out are channel chatter (likes, subscribe requests, greetings) and the teacher's spoken recaps of points already in the notes.

## Languages

- Each video gets three PDFs: **English**, **Hindi** (Devanagari) and **Hinglish**.

## Look and output

- Typed text in a handwriting-style font, on notebook-style pages (ruled lines, margin, highlights).
- The font must support both Devanagari and Latin script.
- Pages fill automatically from one content flow:
  - long lists split across pages;
  - a heading never sits alone at the bottom of a page;
  - the PDF has no trailing blank page.
- Each section heading has the class video timestamp in the left margin.
- Each class has two parts, and the notes follow them:
  1. a static-GK segment called "Gayatri Mantra";
  2. daily current affairs: numbered questions, "Lallantop Baatein" quick facts, and a closing revision of earlier questions.
- Left out of the notes:
  - promos and motivational lines;
  - the opening headline read-out, because every headline is covered in detail later.
- Reference samples, built from episode 2209 (21 Oct 2026), are in `samples/`.
- Format: PDF, three per video.
- Destination: a local folder for now, later a public website.

## Constraints

- **Budget:** ₹500/month at most, and ideally ₹0 until the notes earn money.
- **AI usage:** the user's **Claude Pro** subscription, used instead of paid APIs wherever possible. Each day's run must fit inside Pro usage limits alongside the user's normal Claude use.
- **Runtime:** the user's Windows PC for now, a cloud VPS later.

## Future phases

1. More classes and channels.
2. A public website for the notes.
3. On-demand notes for any YouTube URL.

The trigger and pipeline should stay source-agnostic so these are easy to add.
