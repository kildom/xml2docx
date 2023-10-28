
export interface OS {
    error: string[];
    path: {
        resolve(...paths: string[]): string;
        dirname(path: string): string;
    },
    fs: {
        readFileSync(path: string, encoding?: 'utf-8'): string | Uint8Array;
        writeFileSync(path: string, data: Uint8Array | string): void;
    }
}

export let os: OS;

export function setInterface(newOs: OS) {
    os = newOs;
}
