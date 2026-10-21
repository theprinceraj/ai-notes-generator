import { createReadStream, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Groq from 'groq-sdk';
import { config } from './config.js';
import { run } from './exec.js';
import { log } from './log.js';

// A transcript is a list of { minute, text }, rendered as "[mm:00] text" lines for Claude.

/** Collapses YouTube's rolling auto-captions into de-duplicated text per minute. */
export function fromVtt(vtt) {
  const seen = new Set();
  const byMinute = new Map();
  for (const block of vtt.split(/\r?\n\r?\n/)) {
    const m = block.match(/(\d+):(\d+):([\d.]+) -->/);
    if (!m) continue;
    const minute = Number(m[1]) * 60 + Number(m[2]);
    for (const raw of block.split(/\r?\n/).slice(1)) {
      const line = raw.replace(/<[^>]*>/g, '').trim();
      if (!line || seen.has(line)) continue;
      seen.add(line);
      if (!byMinute.has(minute)) byMinute.set(minute, []);
      byMinute.get(minute).push(line);
    }
  }
  return [...byMinute].map(([minute, lines]) => ({ minute, text: lines.join(' ') }));
}

const CHUNK_SECONDS = 25; // short chunks made Whisper drop far less speech in testing
const GROQ_GAP_MS = 3100; // free tier allows 20 requests per minute

/** Transcribes Hindi audio with Groq Whisper, chunk by chunk. */
export async function fromGroq(audioPath, dir) {
  const chunkDir = join(dir, 'chunks');
  mkdirSync(chunkDir, { recursive: true });
  await run(config.bin.ffmpeg, [
    '-loglevel', 'error', '-y', '-i', audioPath, '-ac', '1', '-ar', '16000', '-b:a', '48k',
    '-f', 'segment', '-segment_time', String(CHUNK_SECONDS), join(chunkDir, 'c%04d.mp3'),
  ]);

  const groq = new Groq();
  const chunks = readdirSync(chunkDir).filter((f) => f.endsWith('.mp3')).sort();
  const byMinute = new Map();
  for (const [i, file] of chunks.entries()) {
    const text = (await groq.audio.transcriptions.create({
      file: createReadStream(join(chunkDir, file)),
      model: 'whisper-large-v3',
      language: 'hi',
      response_format: 'text',
      temperature: 0,
    })).toString().trim();
    const minute = Math.floor((i * CHUNK_SECONDS) / 60);
    if (text) byMinute.set(minute, [...(byMinute.get(minute) ?? []), text]);
    if ((i + 1) % 20 === 0) log(`groq: ${i + 1}/${chunks.length} chunks`);
    await new Promise((r) => setTimeout(r, GROQ_GAP_MS));
  }
  return [...byMinute].map(([minute, parts]) => ({ minute, text: parts.join(' ') }));
}

export const formatMinute = (minute) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export const toText = (transcript) =>
  transcript.map(({ minute, text }) => `[${formatMinute(minute)}:00] ${text}`).join('\n');
