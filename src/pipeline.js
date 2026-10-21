import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { listSheets, makeContactSheets } from './frames.js';
import { log } from './log.js';
import { segments, translateNotes, writeHindiNotes } from './notes.js';
import { renderPdfs } from './render.js';
import { fromGroq, fromVtt } from './transcript.js';
import { downloadAudio, downloadCaptions, downloadVideo, videoInfo } from './youtube.js';

/** Captions are not on YouTube yet and Groq is not allowed for this run; try again later. */
export class NotReadyError extends Error {}

const TRANSLATIONS = ['english', 'hinglish'];

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 1));
const pad = (n) => String(n).padStart(2, '0');

export const workDir = (id) => join(config.dirs.work, id);
export const isDone = (id) => existsSync(join(workDir(id), 'done.json'));

/** Date (YYYY-MM-DD), episode and teacher of a class, from its title when it follows the channel's pattern. */
export function describe(info) {
  const m = info.title.match(config.titlePattern);
  const fromTitle = m && new Date(`${m[1]} ${m[2]} ${m[3]} 12:00 UTC`);
  const date = fromTitle && !Number.isNaN(fromTitle.getTime())
    ? fromTitle.toISOString().slice(0, 10)
    : `${info.upload_date.slice(0, 4)}-${info.upload_date.slice(4, 6)}-${info.upload_date.slice(6, 8)}`;
  const last = info.title.split('|').at(-1).trim();
  return {
    id: info.id,
    title: info.title,
    date,
    episode: m ? m[4] : null,
    teacher: /\b(sir|ma'?am)\b/i.test(last) ? last : null,
    startedAt: info.release_timestamp ?? info.timestamp ?? null,
    duration: info.duration ?? null,
  };
}

/**
 * Takes one video from YouTube to three PDFs. Every stage saves its result under
 * work/<id>/ and is skipped when that result already exists, so an interrupted run
 * (usage limit, sleep, network) resumes where it stopped.
 */
export async function processVideo(id, { allowGroq }) {
  const dir = workDir(id);
  mkdirSync(dir, { recursive: true });

  const metaFile = join(dir, 'meta.json');
  if (!existsSync(metaFile)) writeJson(metaFile, describe(await videoInfo(id)));
  const meta = readJson(metaFile);
  log(`${id}: ${meta.title}`);

  const transcript = await getTranscript(id, dir, allowGroq);
  const sheets = await getSheets(id, dir);

  const notesDir = join(dir, 'notes');
  mkdirSync(notesDir, { recursive: true });
  const parts = segments(transcript, sheets);
  const hindi = [];
  for (const [i, part] of parts.entries()) {
    const file = join(notesDir, `hindi-${pad(i + 1)}.html`);
    if (!existsSync(file)) {
      log(`${id}: writing Hindi notes, part ${i + 1}/${parts.length}`);
      writeFileSync(file, await writeHindiNotes(part, i, parts.length, hindi));
    }
    hindi.push(readFileSync(file, 'utf8'));
  }

  const fragments = { hindi: hindi.join('\n\n') };
  for (const language of TRANSLATIONS) {
    const translated = [];
    for (const [i, fragment] of hindi.entries()) {
      const file = join(notesDir, `${language}-${pad(i + 1)}.html`);
      if (!existsSync(file)) {
        log(`${id}: translating to ${language}, part ${i + 1}/${hindi.length}`);
        writeFileSync(file, await translateNotes(fragment, language));
      }
      translated.push(readFileSync(file, 'utf8'));
    }
    fragments[language] = translated.join('\n\n');
  }

  const outDir = await render(id, meta, fragments);
  writeJson(join(dir, 'done.json'), { finishedAt: new Date().toISOString(), outDir });
  return outDir;
}

/** Re-renders the PDFs from notes already written for a video, without using Claude. */
export async function rerender(id) {
  const dir = workDir(id);
  const notesDir = join(dir, 'notes');
  if (!existsSync(notesDir)) throw new Error(`no notes for ${id} yet; run "notes generate" first`);
  const meta = readJson(join(dir, 'meta.json'));
  const files = readdirSync(notesDir).sort();
  const fragments = {};
  for (const language of ['hindi', ...TRANSLATIONS]) {
    const own = files.filter((f) => f.startsWith(`${language}-`));
    if (own.length) fragments[language] = own.map((f) => readFileSync(join(notesDir, f), 'utf8')).join('\n\n');
  }
  return render(id, meta, fragments);
}

async function render(id, meta, fragments) {
  const outDir = join(config.dirs.output, `${meta.date}${meta.episode ? `_ep${meta.episode}` : `_${id}`}`);
  log(`${id}: rendering PDFs`);
  const files = await renderPdfs(meta, fragments, outDir);
  log(`${id}: done → ${files.join(', ')}`);
  return outDir;
}

async function getTranscript(id, dir, allowGroq) {
  const file = join(dir, 'transcript.json');
  if (existsSync(file)) return readJson(file);

  log(`${id}: fetching YouTube captions`);
  const vtt = await downloadCaptions(id, dir);
  let transcript;
  if (vtt) {
    transcript = fromVtt(readFileSync(vtt, 'utf8'));
  } else if (allowGroq) {
    log(`${id}: no captions, transcribing with Groq`);
    const audio = await downloadAudio(id, dir);
    transcript = await fromGroq(audio, dir);
    rmSync(audio);
    rmSync(join(dir, 'chunks'), { recursive: true });
  } else {
    throw new NotReadyError(`${id}: YouTube captions are not available yet`);
  }
  writeJson(file, transcript);
  return transcript;
}

async function getSheets(id, dir) {
  const sheetsDir = join(dir, 'sheets');
  if (existsSync(sheetsDir) && listSheets(sheetsDir).length) return listSheets(sheetsDir);

  log(`${id}: downloading video for frames`);
  const video = await downloadVideo(id, dir);
  log(`${id}: making contact sheets`);
  // Build in a temporary folder so an interrupted run never leaves a half-made set behind.
  const tmp = `${sheetsDir}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  await makeContactSheets(video, tmp);
  rmSync(sheetsDir, { recursive: true, force: true });
  renameSync(tmp, sheetsDir);
  rmSync(video);
  return listSheets(sheetsDir);
}
