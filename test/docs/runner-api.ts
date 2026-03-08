
import * as child_process from 'node:child_process';

import { Runner } from './runner';
import path, { dirname } from 'node:path';
import * as fs from 'node:fs';


function getPlatform(): string {
    switch (process.platform.toLowerCase()) {
    case 'win32':
        return `${process.arch}-win`;
    case 'darwin':
        return `${process.arch}-macos`;
    default:
        return `${process.arch}-linux`;
    }
}

function getSuffix(): string {
    return (process.platform.toLowerCase() === 'win32') ? '.exe' : '';
}

export class NodeRunner implements Runner {

    private args: string[] = [];

    public name = 'node';

    public constructor() {
        this.args = [
            path.join('dist', 'deno-compile', getPlatform(), `doctml${getSuffix()}`),
        ];
    }

    public async start(): Promise<boolean> {
        return false;
    }

    public async stop(): Promise<void> { }

    public async addFiles(_files: { [key: string]: Uint8Array }): Promise<void> { }

    public async run(input: string,
        data: string | undefined,
        output: string
    ): Promise< { [key: string]: Uint8Array } & { error?: string }> {

        // if (Math.random() < 0.1) {
        //     return { error: 'Simulated random failure for testing retry logic.' } as any;
        // }

        let cnt = fs.readFileSync(input, 'utf-8');
        if (Math.random() < 0.15) {
            let i = Math.floor(Math.random() * cnt.length);
            cnt = cnt.substring(0, i) + String.fromCharCode('a'.charCodeAt(0) + Math.floor(Math.random() * 26)) + cnt.substring(i);
        }
        fs.writeFileSync(`${input}.tmp`, cnt);

        let args = [...this.args];
        if (data) {
            args.push('-d', data);
        }
        args.push('--debug');
        args.push(`${input}.tmp`);
        args.push(output);

        let res = child_process.spawnSync(args[0], args.slice(1), { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf-8' });
        fs.rmSync(`${input}.tmp`, { force: true });
        if (res.error) {
            return { error: `${res.error}` } as any;
        } else if (res.stderr.trim().length > 0) {
            return { error: res.stderr } as any;
        } else if (res.status) {
            return { error: `Process exit code ${res.status}` } as any;
        }

        return {};
    }
}

