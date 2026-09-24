import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('./require-env.mjs', import.meta.url));

function run(env: Record<string, string>) {
  return spawnSync(process.execPath, [script, 'NAIDENKO_REQUIRED'], {
    // A clean environment on purpose: only PATH plus what the test sets.
    env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test', ...env },
    encoding: 'utf8',
  });
}

describe('require-env', () => {
  it('fails and names the missing variable', () => {
    const result = run({});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NAIDENKO_REQUIRED');
  });

  it('passes when the variable is set', () => {
    expect(run({ NAIDENKO_REQUIRED: 'site-key' }).status).toBe(0);
  });
});
