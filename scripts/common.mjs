import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const resolve = (...parts) => path.join(root, ...parts);
export const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export const writeJSON = async (file, data) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
};
export function gitCommit(dir) {
  return execFileSync('git', ['-c', `safe.directory=${dir.replaceAll('\\', '/')}`, '-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}
export async function cleanGenerated(file) {
  const absolute = path.resolve(file);
  const allowed = [resolve('dist'), resolve('.cache')];
  if (!allowed.some(parent => absolute.startsWith(parent + path.sep))) {
    throw new Error(`Refusing to remove path outside generated directories: ${absolute}`);
  }
  await fs.rm(absolute, { recursive: true, force: true });
  await fs.mkdir(absolute, { recursive: true });
}
export async function filesIn(dir) {
  const out = [];
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...await filesIn(file));
    else if (item.isFile()) out.push(file);
  }
  return out;
}
