import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, readJSON, gitCommit } from './common.mjs';

const lock = await readJSON(resolve('upstream.lock.json'));
for (const [name, spec] of Object.entries(lock)) {
  const dir = resolve('vendor', name);
  await fs.mkdir(resolve('vendor'), { recursive: true });
  const args = ['-c', `safe.directory=${dir.replaceAll('\\', '/')}`, '-C', dir];
  let created=false;
  try { await fs.access(dir + '/.git'); }
  catch { execFileSync('git', ['clone', '--no-checkout', spec.url, dir], { stdio: 'inherit' }); created=true; }
  if (created || gitCommit(dir) !== spec.commit) {
    execFileSync('git', [...args, 'fetch', '--depth', '1', 'origin', spec.commit], { stdio: 'inherit' });
    execFileSync('git', [...args, 'checkout', '--detach', spec.commit], { stdio: 'inherit' });
  }
  if (name === 'ubol') execFileSync('git', [...args, 'submodule', 'update', '--init', '--recursive', '--depth', '1'], { stdio: 'inherit' });
  console.log(`${name}: ${gitCommit(dir)}`);
}
