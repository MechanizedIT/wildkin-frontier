import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep the previous playable file intact while Windows scanners/readers hold it.
export function writeGeneratedFile(destination, contents) {
  const target = path.resolve(destination instanceof URL ? fileURLToPath(destination) : destination);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, contents);
    for (let attempt = 0; ; attempt++) {
      try { fs.renameSync(temporary, target); break; }
      catch (error) {
        if (attempt === 4 || !['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(error.code)) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      }
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
