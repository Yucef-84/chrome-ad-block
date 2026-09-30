import fs from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const crc32 = data => {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
};
export async function writeIcons(dir) {
  await fs.mkdir(dir, { recursive: true });
  for (const size of [16, 32, 64, 128]) {
    const raw = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x + .5) / size, v = (y + .5) / size;
      const inside = u > .08 && u < .92 && v > .06 && v < .94 && (v < .7 || Math.abs(u-.5) < (.94-v)*1.75);
      const check = (u > .25 && u < .47 && Math.abs(v - (u + .12)) < .055) || (u >= .43 && u < .77 && Math.abs(v - (.98-u)) < .055);
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      raw.set(inside ? (check ? [255,255,255,255] : [16,126,91,255]) : [0,0,0,0], offset);
    }
    const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8]=8; header[9]=6;
    await fs.writeFile(path.join(dir, `icon_${size}.png`), Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
  }
}
