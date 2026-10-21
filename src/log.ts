import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.ts';

mkdirSync(config.dirs.logs, { recursive: true });
const file = join(config.dirs.logs, 'notes.log');

/** Prints a line and appends it to logs/notes.log, so scheduled runs leave a trail. */
export function log(...parts: string[]): void {
  const line = `[${new Date().toISOString()}] ${parts.join(' ')}`;
  console.log(line);
  appendFileSync(file, line + '\n');
}
