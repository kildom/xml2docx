import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createTestCases, TestCase } from './case-parser';
import { getRunnerDirectory } from './runners-common';


const runnerName = 'cli';
const dir = getRunnerDirectory(runnerName);
const cliPath = path.join('dist', 'deno-compile', getPlatform(), `doctml${getSuffix()}`);

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
    return process.platform.toLowerCase() === 'win32' ? '.exe' : '';
}

function runTestCase(testCase: TestCase) {
    const inputFile = path.join(testCase.dir, `${testCase.id}.doctml`);
    const templateDataFile = path.join(testCase.dir, `${testCase.id}-data.json`);
    const dataFile = fs.existsSync(templateDataFile)
        ? templateDataFile
        : path.join(testCase.dir, 'include/empty.json');
    const outputFile = testCase.getOutputFile('docx');
    const args = ['--debug', '-d', dataFile, inputFile, outputFile];

    fs.rmSync(outputFile, { force: true });
    const result = spawnSync(cliPath, args, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
    });
    if (result.error) {
        testCase.runStatus = false;
        testCase.errors.push({ message: result.error.message });
        return;
    }
    if (result.stderr) {
        testCase.errors.push({ message: result.stderr });
    }
    testCase.runStatus = result.status;
}

async function main() {
    if (!fs.existsSync(cliPath)) {
        console.error(
            'DocTML CLI binary file is missing. Run "npm run build-cli" before starting tests with CLI runner.'
        );
        process.exitCode = 10;
        return;
    }

    let testCases = createTestCases(dir);
    let i = 0;
    let total = Object.values(testCases).length;

    for (let testCase of Object.values(testCases)) {
        try {
            console.log(`Execute case ${i + 1} of ${total}: ${testCase.getOutputFile('docx')}`);
            runTestCase(testCase);
        } catch (ex) {
            console.log(`    Unexpected exception: ${ex}`);
            testCase.errors.push({ message: `Unexpected exception: ${ex}` });
        }
        i++;
    }

    finalizeRunner(runnerName, dir, testCases);
}

main();
