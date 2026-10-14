
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

    public async addFiles(_files: string[]): Promise<void> { }

    public run(input: string,
        data: string | undefined,
        output: string
    ): Promise<string[]> {

        return new Promise<string[]>((resolve, reject) => {

            let args = [...this.args];
            if (data) {
                args.push('-d', data);
            }
            args.push('--debug');
            args.push(input);
            args.push(output);

            let stderrData = '';

            let child = child_process.spawn(args[0], args.slice(1), { stdio: ['inherit', 'inherit', 'pipe'] });

            child.stderr.setEncoding('utf8');
            child.stderr.on('data', (chunk) => {
                stderrData += chunk;
            });

            child.on('error', (err) => {
                reject(err);
            });

            child.on('close', () => {
                if (child.exitCode !== 0) {
                    if (stderrData) {
                        reject(stderrData);
                    } else {
                        throw new Error(`Process exit code ${child.exitCode}`);
                    }
                } else {
                    resolve([]);
                }
            });
        });
    }
}

