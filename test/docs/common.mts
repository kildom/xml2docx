import fs from 'node:fs';
import path from 'node:path';

export const CUR = 'test/outputs/cur';
export const REF = 'test/outputs/ref';

export function mkdirFor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
}
