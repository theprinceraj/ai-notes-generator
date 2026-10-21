import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import type { Language } from './types.ts';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

// The scheduler may start us from any directory, so load .env from the project root.
dotenv.config({ path: join(ROOT, '.env'), quiet: true });

const defaultFont = process.platform === 'win32'
  ? 'C:/Windows/Fonts/arial.ttf'
  : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

export const config = {
  channelUrl: 'https://www.youtube.com/@UTKARSHCLASSES13',
  // e.g. "21 October 2026 Current Affairs | Episode 2209 | ... | Kumar Gaurav Sir"
  titlePattern: /^(\d{1,2}) ([A-Za-z]+) (\d{4}) Current Affairs \| Episode (\d+)/,
  timezone: 'Asia/Kolkata',
  // Wait this long after a class ends for YouTube captions before falling back to Groq.
  captionWaitHours: 3,

  model: process.env.NOTES_MODEL || 'sonnet',
  // Minutes of class sent to Claude per request.
  segmentMinutes: 20,
  // One video frame every N seconds, four frames per contact sheet.
  frameEverySeconds: 20,

  bin: {
    ytdlp: process.env.YTDLP_PATH || 'yt-dlp',
    ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
    claude: process.env.CLAUDE_PATH || 'claude',
  },
  frameFont: process.env.FRAME_FONT || defaultFont,

  dirs: {
    work: join(ROOT, 'work'),
    output: join(ROOT, 'output'),
    logs: join(ROOT, 'logs'),
    templates: join(ROOT, 'templates'),
    prompts: join(ROOT, 'prompts'),
  },
};

interface LanguageLabels {
  htmlLang: string;
  dateLabel: string;
  pageLabel: string;
  meta: string;
}

export const LANGUAGES: Record<Language, LanguageLabels> = {
  hindi: { htmlLang: 'hi', dateLabel: 'दिनांक', pageLabel: 'पेज', meta: 'करंट अफेयर्स · एपिसोड' },
  english: { htmlLang: 'en', dateLabel: 'Date', pageLabel: 'Page', meta: 'Current Affairs · Episode' },
  hinglish: { htmlLang: 'en', dateLabel: 'Date', pageLabel: 'Page', meta: 'Current Affairs · Episode' },
};
