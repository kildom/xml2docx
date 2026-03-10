
import * as child_process from 'node:child_process';

import { Runner } from './runner';


export class TsxRunner implements Runner {

    private args: string[] = [];

    public name = 'tsx';

    public constructor() {
        this.args = [
            'npx',
            'tsx',
            'src/cli.ts',
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

        let args = [...this.args];
        if (data) {
            args.push('-d', data);
        }
        args.push('--debug');
        args.push(input);
        args.push(output);

        let res = child_process.spawnSync(args[0], args.slice(1), { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf-8' });
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

