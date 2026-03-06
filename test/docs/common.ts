import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CUR = 'test/outputs/cur';
export const REF = 'test/outputs/ref';

declare global {
    const __RUN_SELF_TEST__: boolean | undefined;
}

export function isDirectExecution(metaUrl: string): boolean {
    const nodeArgvEntry = process.argv[1];
    if (!nodeArgvEntry) {
        return false;
    }
    const entryUrl = pathToFileURL(path.resolve(nodeArgvEntry)).href;
    return metaUrl === entryUrl;
}

export function mkdir(path: string) {
    fs.mkdirSync(path, { recursive: true });
}

export function mkdirFor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
}
