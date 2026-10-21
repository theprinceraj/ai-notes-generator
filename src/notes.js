import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ask } from './claude.js';
import { config } from './config.js';
import { toText } from './transcript.js';

const SYSTEM = 'You are a meticulous note-maker for Indian competitive-exam students. Follow the instructions in the user message exactly.';

const prompt = (name) => readFileSync(join(config.dirs.prompts, name), 'utf8');

const mmss = (minute) => `${minute}:00`;

/** Splits the class into parts of `config.segmentMinutes`, each with its transcript lines and contact sheets. */
export function segments(transcript, sheets) {
  const size = config.segmentMinutes;
  const lastMinute = Math.max(transcript.at(-1)?.minute ?? 0, Math.ceil((sheets.at(-1)?.end ?? 0) / 60));
  const parts = [];
  for (let start = 0; start <= lastMinute; start += size) {
    const end = start + size;
    const lines = transcript.filter((t) => t.minute >= start && t.minute < end);
    const images = sheets.filter((s) => s.start < end * 60 && s.end > start * 60);
    if (lines.length || images.length) parts.push({ start, end, lines, images });
  }
  return parts;
}

/** Headings (h1/h2 text, without side notes) of fragments written so far. */
export function headingsOf(fragments) {
  return fragments.flatMap((html) =>
    [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/g)].map((m) =>
      m[1].replace(/<span class="side">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim()));
}

/** Writes the Hindi notes for one part of the class. */
export async function writeHindiNotes(part, index, count, earlierFragments) {
  const covered = headingsOf(earlierFragments);
  const context = [
    `## This part\nPart ${index + 1} of ${count}: video time ${mmss(part.start)} to ${mmss(part.end)} (minutes:seconds).`,
    covered.length
      ? `## Already covered in earlier parts\n${covered.map((h) => `- ${h}`).join('\n')}\n\n` +
        'If this part starts in the middle of the last topic above, continue it with points only, without repeating its heading.'
      : 'This is the start of the class.',
  ].join('\n\n');

  const reply = await ask(SYSTEM, [
    prompt('notes.md'),
    context,
    `## Transcript\n${toText(part.lines) || '(no speech in this part)'}`,
    `## Contact sheets (${part.images.length}), in time order`,
    ...part.images.map((s) => ({ image: s.path })),
  ]);
  return clean(reply);
}

const LANGUAGE_RULES = {
  english: 'Write clear, simple English suited to exam notes.',
  hinglish: "Write Hinglish: Hindi written in Roman (Latin) script, mixed with the English words Indian students commonly use, e.g. \"Sabse zyada density wala rajya → Bihar\". Use no Devanagari at all.",
};

/** Translates one Hindi notes fragment into English or Hinglish, keeping its HTML intact. */
export async function translateNotes(hindiFragment, language) {
  const instructions = prompt('translate.md')
    .replaceAll('{{LANGUAGE}}', language === 'english' ? 'English' : 'Hinglish')
    .replace('{{LANGUAGE_RULES}}', LANGUAGE_RULES[language]);
  return clean(await ask(SYSTEM, [instructions, `## Notes to translate\n${hindiFragment}`]));
}

/** Strips code fences and anything outside the allowed fragment, such as scripts or event handlers. */
export function clean(html) {
  return html
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    // A ★ written beside the side note instead of inside it.
    .replace(/\s*★\s*(<span class="side">[^<★]*?)(<\/span>)/g, ' $1 ★$2')
    .trim();
}
