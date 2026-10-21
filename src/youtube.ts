import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.ts';
import { run } from './exec.ts';
import type { VideoInfo } from './types.ts';

// yt-dlp needs a JavaScript runtime for YouTube; hand it the one running this program (Bun or Node).
const runtime = process.versions.bun ? 'bun' : 'node';
const BASE = ['--js-runtimes', `${runtime}:${process.execPath}`, '--no-warnings', '--no-progress'];

const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Latest entries of the channel's Live tab. */
export async function listRecentStreams(count = 15): Promise<VideoInfo[]> {
  const { stdout } = await run(config.bin.ytdlp, [
    ...BASE, '--flat-playlist', '--playlist-end', String(count), '-J', `${config.channelUrl}/streams`,
  ]);
  return JSON.parse(stdout).entries ?? [];
}

/** Full metadata of one video. Fails for live events that have not started yet. */
export async function videoInfo(id: string): Promise<VideoInfo> {
  const { stdout } = await run(config.bin.ytdlp, [...BASE, '-J', '--skip-download', watchUrl(id)]);
  return JSON.parse(stdout);
}

/** Downloads YouTube's original-language Hindi auto captions; returns the .vtt path or null. */
export async function downloadCaptions(id: string, dir: string): Promise<string | null> {
  await run(config.bin.ytdlp, [
    ...BASE, '--skip-download', '--write-auto-subs', '--sub-langs', 'hi-orig',
    '--sub-format', 'vtt', '-o', join(dir, 'captions.%(ext)s'), watchUrl(id),
  ]);
  const vtt = readdirSync(dir).find((f) => f.startsWith('captions') && f.endsWith('.vtt'));
  return vtt ? join(dir, vtt) : null;
}

/** Downloads the video stream only (no audio), at most 720p, for frame extraction. */
export async function downloadVideo(id: string, dir: string): Promise<string> {
  await run(config.bin.ytdlp, [
    ...BASE, '-f', 'bv*[height<=720][ext=mp4]/bv*[height<=720]', '-o', join(dir, 'video.%(ext)s'), watchUrl(id),
  ]);
  return downloaded(dir, 'video.');
}

/** Downloads the best audio stream, for transcription when captions are missing. */
export async function downloadAudio(id: string, dir: string): Promise<string> {
  await run(config.bin.ytdlp, [...BASE, '-f', 'bestaudio', '-o', join(dir, 'audio.%(ext)s'), watchUrl(id)]);
  return downloaded(dir, 'audio.');
}

function downloaded(dir: string, prefix: string): string {
  const file = readdirSync(dir).find((f) => f.startsWith(prefix) && !f.endsWith('.part'));
  if (!file) throw new Error(`yt-dlp finished but no ${prefix}* file is in ${dir}`);
  return join(dir, file);
}

/** Accepts a watch/live/shorts/youtu.be URL or a bare 11-character id. */
export function parseVideoId(input: string): string {
  if (/^[\w-]{11}$/.test(input)) return input;
  const m = input.match(/(?:v=|youtu\.be\/|\/live\/|\/shorts\/)([\w-]{11})/);
  if (!m) throw new Error(`not a YouTube video URL or id: ${input}`);
  return m[1];
}
