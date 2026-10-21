import { createReadStream, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Groq from 'groq-sdk';
import { config } from './config.ts';
import { run } from './exec.ts';
import { log } from './log.ts';
import type { TranscriptLine } from './types.ts';

// A transcript is a list of { minute, text }, rendered as "[hh:mm:00] text" lines for Claude.

/** Collapses YouTube's rolling auto-captions into de-duplicated text per minute. */
export function fromVtt(vtt: string): TranscriptLine[] {
  const seen = new Set<string>();
  const byMinute = new Map<number, string[]>();
  for (const block of vtt.split(/\r?\n\r?\n/)) {
    const m = block.match(/(\d+):(\d+):([\d.]+) -->/);
    if (!m) continue;
    const minute = Number(m[1]) * 60 + Number(m[2]);
    for (const raw of block.split(/\r?\n/).slice(1)) {
      const line = raw.replace(/<[^>]*>/g, '').trim();
      if (!line || seen.has(line)) continue;
      seen.add(line);
      byMinute.set(minute, [...(byMinute.get(minute) ?? []), line]);
    }
  }
  return [...byMinute].map(([minute, lines]) => ({ minute, text: lines.join(' ') }));
}

const CHUNK_SECONDS = 25; // short chunks made Whisper drop far less speech in testing
const GROQ_GAP_MS = 3100; // free tier allows 20 requests per minute

/** Transcribes Hindi audio with Groq Whisper, chunk by chunk. */
export async function fromGroq(audioPath: string, dir: string): Promise<TranscriptLine[]> {
  const chunkDir = join(dir, 'chunks');
  mkdirSync(chunkDir, { recursive: true });
  await run(config.bin.ffmpeg, [
    '-loglevel', 'error', '-y', '-i', audioPath, '-ac', '1', '-ar', '16000', '-b:a', '48k',
    '-f', 'segment', '-segment_time', String(CHUNK_SECONDS), join(chunkDir, 'c%04d.mp3'),
  ]);

  const groq = new Groq();
  const chunks = readdirSync(chunkDir).filter((f) => f.endsWith('.mp3')).sort();
  const byMinute = new Map<number, string[]>();
  for (const [i, file] of chunks.entries()) {
    const reply = await groq.audio.transcriptions.create({
      file: createReadStream(join(chunkDir, file)),
      model: 'whisper-large-v3',
      language: 'hi',
      response_format: 'text',
      temperature: 0,
    });
    // With response_format "text" the SDK returns the plain transcript string.
    const text = String(reply).trim();
    const minute = Math.floor((i * CHUNK_SECONDS) / 60);
    if (text) byMinute.set(minute, [...(byMinute.get(minute) ?? []), text]);
    if ((i + 1) % 20 === 0) log(`groq: ${i + 1}/${chunks.length} chunks`);
    await new Promise((r) => setTimeout(r, GROQ_GAP_MS));
  }
  return [...byMinute].map(([minute, parts]) => ({ minute, text: parts.join(' ') }));
}

const two = (n: number) => String(n).padStart(2, '0');

/** Formats a minute offset as hh:mm. */
export const formatMinute = (minute: number) => `${two(Math.floor(minute / 60))}:${two(minute % 60)}`;

export const toText = (transcript: TranscriptLine[]) =>
  transcript.map(({ minute, text }) => `[${formatMinute(minute)}:00] ${text}`).join('\n');
