import fs from 'node:fs';
import path from 'node:path';
import { generate } from 'doctml';

async function main() {
    const [inputFile, dataFile, outputFile] = globalThis.process.argv.slice(2);
    if (!inputFile || !dataFile || !outputFile) {
        throw new Error('Expected input, data, and output file arguments.');
    }

    const suffixes = {
        data: '.debug.json',
        rendered: '.debug.rendered.doctml',
        normalized: '.debug.normalized.doctml',
        processed: '.debug.processed.doctml',
    };
    const result = await generate({
        inputFile,
        dataFile,
        outputFile,
        debugFile(_result, type, content) {
            const file = path.join(
                path.dirname(outputFile),
                path.basename(outputFile, path.extname(outputFile)) + suffixes[type]
            );
            fs.writeFileSync(file, content);
        },
        readFile(_result, file, binary) {
            return binary ? fs.readFileSync(file) : fs.readFileSync(file, 'utf8');
        },
        writeFile(result, content) {
            if (result.errors.length === 0) {
                fs.writeFileSync(outputFile, content);
            }
        },
    });

    for (const error of result.errors) {
        console.error(error.message);
    }
    if (result.errors.length > 0) {
        globalThis.process.exitCode = 1;
    }
}

main().catch(error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    globalThis.process.exitCode = 1;
});
