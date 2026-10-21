import { spawn } from 'node:child_process';

/**
 * Runs a program without a shell and resolves with its output.
 * Rejects with the tail of stderr when it exits non-zero.
 */
export function run(cmd, args, { input, cwd, timeoutMs = 60 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, windowsHide: true });
    const out = [];
    const err = [];
    const timer = setTimeout(() => child.kill(), timeoutMs);

    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`could not start ${cmd}: ${e.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(out).toString('utf8');
      const stderr = Buffer.concat(err).toString('utf8');
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with ${code}: ${stderr.trim().slice(-800)}`));
    });

    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}
