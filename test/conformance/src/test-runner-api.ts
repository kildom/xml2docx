import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTestCases, TestCase } from './case-parser';
import { finalizeRunner, getRunnerDirectory } from './runners-common';


const runnerName = 'api';
const dir = getRunnerDirectory(runnerName);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const helperFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helpers/run-api-case.ts');

function runTestCase(testCase: TestCase): void {
    const inputFile = path.resolve(testCase.dir, `${testCase.id}.doctml`);
    const templateDataFile = path.join(testCase.dir, `${testCase.id}-data.json`);
    const dataFile = fs.existsSync(templateDataFile)
        ? path.resolve(templateDataFile)
        : path.resolve(testCase.dir, 'include/empty.json');
    const outputFile = path.resolve(testCase.getOutputFile('docx'));

    fs.rmSync(outputFile, { force: true });
    const result = spawnSync('npx', ['--quiet', 'tsx', helperFile, inputFile, dataFile, outputFile], {
        cwd: projectRoot,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        shell: process.platform === 'win32',
    });
    if (result.error) {
        testCase.runStatus = false;
        testCase.errors.push({ message: result.error.message });
        return;
    }
    if (result.stderr) {
        testCase.errors.push({ message: result.stderr });
    }
    if (result.status === null) {
        testCase.errors.push({ message: `API helper was terminated by signal ${result.signal ?? 'unknown'}.` });
    }
    testCase.runStatus = result.status === 0;
}

async function main(): Promise<void> {
    const testCases = createTestCases(dir);
    const cases = Object.values(testCases);

    for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        try {
            console.log(`Execute case ${i + 1} of ${cases.length}: ${testCase.getOutputFile('doctml')}`);
            runTestCase(testCase);
        } catch (error) {
            console.log(`    Unexpected exception: ${error}`);
            testCase.errors.push({ message: `Unexpected exception: ${error}` });
        }
    }

    await finalizeRunner(runnerName, dir, cases);
}

main().catch(error => {
    console.error(`Unable to run API conformance tests: ${error instanceof Error ? error.stack ?? error.message : error}`);
    process.exitCode = 10;
});
