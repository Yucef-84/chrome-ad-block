import fs from 'node:fs/promises';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { resolve, readJSON, filesIn } from './common.mjs';

// ZIP32, UTF-8 names, a fixed timestamp, and sorted entries. No packaging dependency.
const crcTable = Uint32Array.from({length:256}, (_, n) => {
  let c=n; for(let i=0;i<8;i++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; return c>>>0;
});
function crc32(data) { let c=0xffffffff; for(const b of data)c=crcTable[(c^b)&255]^(c>>>8); return (c^0xffffffff)>>>0; }
async function zip(destination, entries) {
  const local=[],central=[];let offset=0;
  for(const [name,file] of entries.sort(([a],[b])=>a.localeCompare(b,'en'))) {
    const filename=Buffer.from(name.replaceAll('\\','/'));
    const data=await fs.readFile(file), compressed=deflateRawSync(data,{level:9});
    const crc=crc32(data), header=Buffer.alloc(30), directory=Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);
    header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
    directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(8,10);
    directory.writeUInt16LE(0x21,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42);
    local.push(header,filename,compressed);central.push(directory,filename);offset+=header.length+filename.length+compressed.length;
  }
  if(entries.length>65535||offset>0xffffffff)throw new Error('Archive exceeds ZIP32 limits');
  const size=central.reduce((n,b)=>n+b.length,0),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16);
  await fs.writeFile(destination,Buffer.concat([...local,...central,end]));
  console.log(`${path.basename(destination)}: ${entries.length} files, ${(offset/1024/1024).toFixed(1)} MiB`);
}

const manifest=await readJSON(resolve('dist/cleanweb/manifest.json'));
const report=await readJSON(resolve('dist/build-report.json'));
if(report.version!==manifest.version)throw new Error('Manifest and build report versions differ. Rebuild before packaging.');
for(const [name,hash] of Object.entries(report.files)) {
  const actual=createHash('sha256').update(await fs.readFile(resolve('dist/cleanweb',name))).digest('hex');
  if(actual!==hash)throw new Error(`Build output changed: ${name}. Rebuild before packaging.`);
}
const extension=resolve(`dist/cleanweb-${manifest.version}.zip`);
const source=resolve(`dist/cleanweb-${manifest.version}-source.zip`);
await zip(extension,(await filesIn(resolve('dist/cleanweb'))).map(file=>[path.relative(resolve('dist/cleanweb'),file),file]));
const entries=[];
for(const name of ['package.json','upstream.lock.json','.gitignore','PLAN.md','README.md','VALIDATION.md','LICENSE','PRIVACY.md','THIRD_PARTY_NOTICES.md']) entries.push([`cleanweb-source/${name}`,resolve(name)]);
// Public pinned Git metadata is included so offline builds can check commits.
// Browser profiles, caches, output captures and root Git configuration are excluded.
for(const dir of ['scripts','src','filters','tests','vendor'])for(const file of await filesIn(resolve(dir))) {
  const relative=path.relative(resolve(),file).replaceAll('\\','/');
  const parts=relative.split('/');
  // Reflogs can contain the local clone operator's identity; hooks are not build inputs.
  if(parts.includes('.git')&&(parts.includes('logs')||parts.includes('hooks')||['COMMIT_EDITMSG','FETCH_HEAD','ORIG_HEAD'].includes(parts.at(-1))))continue;
  entries.push([`cleanweb-source/${relative}`,file]);
}
await zip(source,entries);
const checksums=[];
for(const file of [extension,source])checksums.push(`${createHash('sha256').update(await fs.readFile(file)).digest('hex')}  ${path.basename(file)}`);
await fs.writeFile(resolve('dist/SHA256SUMS.txt'),checksums.join('\n')+'\n');
