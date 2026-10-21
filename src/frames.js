import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { run } from './exec.js';

export const FRAMES_PER_SHEET = 4;

/**
 * Grabs one frame every few seconds and tiles them 2×2 into contact sheets, each frame
 * stamped with its video time. Sheets keep image count (and Claude usage) low while
 * still showing every slide and whiteboard state.
 */
export async function makeContactSheets(videoPath, dir) {
  mkdirSync(dir, { recursive: true });
  // ffmpeg filter syntax needs the drive colon in a Windows font path escaped.
  const font = config.frameFont.replace(/:/g, '\\:');
  const filter = [
    `fps=1/${config.frameEverySeconds}`,
    'scale=960:-1',
    `drawtext=fontfile='${font}':text='%{pts\\:hms}':x=8:y=8:fontsize=34:fontcolor=yellow:box=1:boxcolor=black@0.7`,
    'tile=2x2',
  ].join(',');
  await run(config.bin.ffmpeg, ['-loglevel', 'error', '-y', '-i', videoPath, '-vf', filter, '-q:v', '3', join(dir, 's%03d.jpg')]);
  return listSheets(dir);
}

/** Sheets in order, each with the video second its first frame was taken at. */
export function listSheets(dir) {
  const span = config.frameEverySeconds * FRAMES_PER_SHEET;
  return readdirSync(dir)
    .filter((f) => /^s\d+\.jpg$/.test(f))
    .sort()
    .map((f, i) => ({ path: join(dir, f), start: i * span, end: (i + 1) * span }));
}
