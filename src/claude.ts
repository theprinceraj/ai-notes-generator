import { readFileSync } from 'node:fs';
import { config } from './config.ts';
import { run } from './exec.ts';

/** Raised when the Claude subscription's usage limit is hit; the run can resume later. */
export class UsageLimitError extends Error {}

/** A text block, or a JPEG image to read from disk. */
export type PromptPart = string | { image: string };

interface ResultEvent {
  type: 'result';
  is_error?: boolean;
  result?: string;
}

/**
 * One request to Claude through the `claude` CLI in print mode, so it runs on the
 * user's Claude subscription. No tools, settings, hooks or MCP servers are loaded:
 * every call is a single, self-contained prompt → answer.
 */
export async function ask(system: string, parts: PromptPart[]): Promise<string> {
  const content = parts.map((p) =>
    typeof p === 'string'
      ? { type: 'text', text: p }
      : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: readFileSync(p.image).toString('base64') } });
  const message = JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n';

  const { stdout } = await run(config.bin.claude, [
    '-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--model', config.model,
    '--tools', '',
    '--setting-sources', '',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--system-prompt', system,
  ], { input: message, timeoutMs: 30 * 60 * 1000 });

  const events = stdout.trim().split('\n').flatMap((line) => {
    try {
      return [JSON.parse(line) as { type?: string }];
    } catch {
      return [];
    }
  });
  const result = events.find((e): e is ResultEvent => e.type === 'result');
  if (!result) throw new Error('claude returned no result');
  const text = String(result.result ?? '');
  if (result.is_error) {
    if (/limit|quota|rate/i.test(text)) throw new UsageLimitError(text);
    throw new Error(`claude error: ${text.slice(0, 500)}`);
  }
  return text;
}
