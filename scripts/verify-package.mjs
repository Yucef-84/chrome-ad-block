import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,readJSON,filesIn,cleanGenerated} from './common.mjs';

if(process.platform!=='win32')throw new Error('This interoperability check uses the Windows .NET ZIP library.');
const {version}=await readJSON(resolve('package.json'));
const target=resolve('.cache/archive-check');
await cleanGenerated(target);
const quote=value=>`'${value.replaceAll("'","''")}'`;
for(const [kind,name] of [['install',`cleanweb-${version}.zip`],['source',`cleanweb-${version}-source.zip`]]) {
  const command=`[void][System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem')\n[System.IO.Compression.ZipFile]::ExtractToDirectory(${quote(resolve('dist',name))}, ${quote(path.join(target,kind))})`;
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{stdio:'inherit'});
}
const original=await readJSON(resolve('dist/build-report.json'));
const installed=path.join(target,'install');
assert.equal((await readJSON(path.join(installed,'manifest.json'))).version,version);
assert.equal((await filesIn(installed)).length,Object.keys(original.files).length);
for(const [name,expected] of Object.entries(original.files)) {
  const hash=createHash('sha256').update(await fs.readFile(path.join(installed,name))).digest('hex');
  assert.equal(hash,expected,`Extracted file differs: ${name}`);
}
const source=path.join(target,'source/cleanweb-source');
for(const file of await filesIn(source)) {
  const parts=path.relative(source,file).split(path.sep);
  assert(!parts.includes('output')&&!parts.includes('.cache'),'Development profile/captures included');
  assert(!(parts.includes('.git')&&parts.includes('logs')),'Local Git reflog included');
}
// Prove the actual distributed source can build offline after standard ZIP extraction.
execFileSync(process.execPath,[path.join(source,'scripts/build.mjs')],{cwd:source,stdio:'inherit'});
const rebuilt=await readJSON(path.join(source,'dist/build-report.json'));
assert.deepEqual(rebuilt.files,original.files,'Distributed source rebuild differs from install package');
console.log(`Windows ZIP extraction, ${Object.keys(original.files).length} file hashes, and offline source rebuild: PASS`);
