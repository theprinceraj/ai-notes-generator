#!/usr/bin/env bun
import { Command } from 'commander';
import { UsageLimitError } from './claude.ts';
import { runDaily } from './daily.ts';
import { log } from './log.ts';
import { NotReadyError, processVideo, rerender } from './pipeline.ts';
import { parseVideoId } from './youtube.ts';

const program = new Command()
  .name('notes')
  .description('Handwritten-style PDF notes from YouTube classes');

program
  .command('run')
  .description("make notes for today's class once its recording is ready (run by the scheduler)")
  .action(runDaily);

program
  .command('generate <video>')
  .description('make notes for one video, given its URL or id')
  .option('--no-groq', 'fail instead of using Groq when YouTube captions are missing')
  .action(async (video: string, opts: { groq: boolean }) => {
    const outDir = await processVideo(parseVideoId(video), { allowGroq: opts.groq });
    log(`notes saved in ${outDir}`);
  });

program
  .command('render <video>')
  .description('rebuild the PDFs from notes already written for a video (no AI used)')
  .action(async (video: string) => {
    const outDir = await rerender(parseVideoId(video));
    log(`PDFs saved in ${outDir}`);
  });

try {
  await program.parseAsync();
} catch (err) {
  if (err instanceof UsageLimitError) {
    log(`Claude usage limit reached: ${err.message}`);
    log('Progress is saved; the next run continues from here.');
    process.exitCode = 2;
  } else if (err instanceof NotReadyError) {
    log(err.message);
    process.exitCode = 3;
  } else {
    log(`error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
    process.exitCode = 1;
  }
}
