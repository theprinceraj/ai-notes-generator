import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.ts';
import { log } from './log.ts';
import { describe, isDone, NotReadyError, processVideo } from './pipeline.ts';
import { listRecentStreams, videoInfo } from './youtube.ts';

const LOCK = join(config.dirs.work, 'run.lock');
const STALE_LOCK_MS = 4 * 60 * 60 * 1000;

/** Today's date in India as YYYY-MM-DD. */
const todayInIndia = () => new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone }).format(new Date());

/**
 * What the scheduler runs every 15 minutes: finds today's class on the channel and
 * makes its notes once the recording (and normally its captions) is available.
 * Exits quietly when there is nothing to do yet.
 */
export async function runDaily(): Promise<void> {
  if (!acquireLock()) {
    log('run: another run is still in progress; skipping');
    return;
  }
  try {
    const today = todayInIndia();
    const entries = await listRecentStreams();
    const episode = entries.find((e) => config.titlePattern.test(e.title ?? '') && describe(e).date === today);
    if (!episode) return log(`run: no class for ${today} on the channel yet`);
    if (isDone(episode.id)) return log(`run: ${today} is already done (${episode.id})`);
    if (episode.live_status && episode.live_status !== 'was_live' && episode.live_status !== 'not_live') {
      return log(`run: ${episode.id} is ${episode.live_status}; waiting for the recording`);
    }

    const info = await videoInfo(episode.id);
    const endedAt = (info.release_timestamp ?? info.timestamp ?? 0) + (info.duration ?? 0);
    const hoursSinceEnd = (Date.now() / 1000 - endedAt) / 3600;
    const allowGroq = hoursSinceEnd >= config.captionWaitHours;

    try {
      const outDir = await processVideo(episode.id, { allowGroq });
      log(`run: notes for ${today} saved in ${outDir}`);
    } catch (err) {
      if (!(err instanceof NotReadyError)) throw err;
      log(`run: ${err.message}; ${hoursSinceEnd.toFixed(1)} h since the class ended, Groq after ${config.captionWaitHours} h`);
    }
  } finally {
    releaseLock();
  }
}

// One run at a time: a run can take longer than the 15-minute schedule interval.
function acquireLock(): boolean {
  mkdirSync(config.dirs.work, { recursive: true });
  if (existsSync(LOCK)) {
    const pid = Number(readFileSync(LOCK, 'utf8'));
    const age = Date.now() - statSync(LOCK).mtimeMs;
    if (age < STALE_LOCK_MS && isRunning(pid)) return false;
  }
  writeFileSync(LOCK, String(process.pid));
  return true;
}

function releaseLock(): void {
  rmSync(LOCK, { force: true });
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
