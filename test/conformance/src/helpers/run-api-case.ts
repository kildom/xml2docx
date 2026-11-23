import * as fs from 'node:fs';
import * as path from 'node:path';
import { generate, DebugFileType, Result } from '../../../../src/doctml';


async function main(): Promise<void> {
    const [inputFile, dataFile, outputFile] = process.argv.slice(2);
    if (!inputFile || !dataFile || !outputFile) {
        throw new Error('Expected input, data, and output file arguments.');
    }

    const suffixes: Record<DebugFileType, string> = {
        data: '.debug.json',
        rendered: '.debug.rendered.doctml',
        normalized: '.debug.normalized.doctml',
        processed: '.debug.processed.doctml',
    };
    const result = await generate({
        inputFile,
        dataFile,
        outputFile,
        debugFile(apiResult: Result, type: DebugFileType, content: string | Uint8Array) {
            const file = path.join(
                path.dirname(apiResult.outputFile),
                path.basename(apiResult.outputFile, path.extname(apiResult.outputFile)) + suffixes[type]
            );
            fs.writeFileSync(file, content);
        },
        readFile(_result: Result, file: string, binary: boolean): Uint8Array | string {
            return binary ? fs.readFileSync(file) : fs.readFileSync(file, 'utf8');
        },
        writeFile(apiResult: Result, content: Uint8Array) {
            if (apiResult.errors.length === 0) {
                fs.writeFileSync(outputFile, content);
            }
        },
    });

    for (const error of result.errors) {
        console.error(error.message);
    }
    if (result.errors.length > 0) {
        process.exitCode = 1;
    }
}

main().catch(error => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
});
