
import * as child_process from 'node:child_process';

import { Runner } from './runner';
import path from 'node:path';


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

export class CliRunner implements Runner {

    private args: string[] = [];

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
    ): Promise<{ [key: string]: Uint8Array }> {

        let args = [...this.args];
        if (data) {
            args.push('-d', data);
        }
        args.push(input);
        args.push(output);

        let res = child_process.spawnSync(args[0], args.slice(1), { stdio: 'inherit' });
        if (res.error) {
            throw res.error;
        } else if (res.status) {
            throw new Error(`Process exit code ${res.status}`);
        }

        return {};
    }
}

