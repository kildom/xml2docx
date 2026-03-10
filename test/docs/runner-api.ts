import fs from 'node:fs';
import { generate } from '../../dist/esm/doctml.js';

import { Runner } from './runner';
import path from 'node:path';


export class ApiRunner implements Runner {

    public name = 'api';

    public constructor() {
    }

    public async start(): Promise<boolean> {
        return false;
    }

    public async stop(): Promise<void> { }

    public async addFiles(_files: { [key: string]: Uint8Array }): Promise<void> { }

    public async run(input: string,
        data: string | undefined,
        output: string
    ): Promise<{ [key: string]: Uint8Array } & { error?: string }> {

        let result = await generate({
            inputFile: input,
            dataFile: data,
            outputFile: output,

            debugFile(result, type, content) {
                const suffixes = {
                    data: '.debug.json',
                    rendered: '.debug.rendered.doctml',
                    normalized: '.debug.normalized.doctml',
                    processed: '.debug.processed.doctml',
                };
                fs.writeFileSync(path.join(path.dirname(output), path.basename(output, path.extname(output)) + suffixes[type]), content);
            },

            readFile(result, file, binary) {
                if (binary) {
                    return fs.readFileSync(file);
                } else {
                    return fs.readFileSync(file, 'utf-8');
                }
            },

            writeFile(result, content) {
                fs.writeFileSync(output, content);
            },
        });

        let error = result.errors.map(e => e.message).join('\n').trim();

        return { error: error } as any;
    }
}

