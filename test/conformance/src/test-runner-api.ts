import * as fs from 'node:fs';
import * as path from 'node:path';
import { generate, DebugFileType, Result } from '../../../src/doctml';
import { createTestCases, TestCase } from './case-parser';
import { finalizeRunner, getRunnerDirectory } from './runners-common';


const runnerName = 'api';
const dir = getRunnerDirectory(runnerName);

async function runTestCase(testCase: TestCase): Promise<void> {
    const inputFile = path.join(testCase.dir, `${testCase.id}.doctml`);
    const templateDataFile = path.join(testCase.dir, `${testCase.id}-data.json`);
    const dataFile = fs.existsSync(templateDataFile)
        ? templateDataFile
        : path.join(testCase.dir, 'include/empty.json');
    const outputFile = testCase.getOutputFile('docx');

    fs.rmSync(outputFile, { force: true });
    const result = await generate({
        inputFile,
        dataFile,
        outputFile,
        debugFile(result: Result, type: DebugFileType, content: string | Uint8Array) {
            const suffixes: Record<DebugFileType, string> = {
                data: '.debug.json',
                rendered: '.debug.rendered.doctml',
                normalized: '.debug.normalized.doctml',
                processed: '.debug.processed.doctml',
            };
            const file = path.join(
                path.dirname(result.outputFile),
                path.basename(result.outputFile, path.extname(result.outputFile)) + suffixes[type]
            );
            fs.writeFileSync(file, content);
        },
        readFile(_result: Result, file: string, binary: boolean): Uint8Array | string {
            return binary
                ? fs.readFileSync(file)
                : fs.readFileSync(file, 'utf8');
        },
        writeFile(result: Result, content: Uint8Array) {
            if (result.errors.length === 0) {
                fs.writeFileSync(outputFile, content);
            }
        },
    });

    testCase.runStatus = result.errors.length === 0;
    testCase.errors.push(...result.errors.map(error => ({ message: error.message })));
}

async function main() {
    const testCases = createTestCases(dir);
    const cases = Object.values(testCases);

    for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        try {
            console.log(`Execute case ${i + 1} of ${cases.length}: ${testCase.getOutputFile('doctml')}`);
            await runTestCase(testCase);
        } catch (ex) {
            console.log(`    Unexpected exception: ${ex}`);
            testCase.errors.push({ message: `Unexpected exception: ${ex}` });
        }
    }

    await finalizeRunner(runnerName, dir, cases);
}

main();
