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
    const errors = testCase.errors;

    fs.rmSync(outputFile, { force: true });
    const result = spawnSync(cliPath, args, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
    });
    if (result.error) {
        errors.push({ message: result.error.message });
        return;
    }
    if (result.stderr) errors.push({ message: result.stderr });

    if (result.status === 0 && testCase.expectedErrors.length > 0) {
        errors.push({ message: 'DocTML CLI exit code is zero, but error was expected in this test case' });
    } else if (result.status !== 0 && testCase.expectedErrors.length === 0) {
        errors.push({
            message: `DocTML CLI exit code is ${result.status}, but not errors were expected in this test case`,
        });
    }

    if (result.status === 0) {
        if (!fs.existsSync(outputFile)) {
            errors.push({ message: `DocTML CLI did not create output DOCX file: ${outputFile}` });
        } else if (fs.statSync(outputFile).size === 0) {
            errors.push({ message: `DocTML CLI created an empty output DOCX file: ${outputFile}` });
        }
    } else if (fs.existsSync(outputFile)) {
        errors.push({
            message: `DocTML CLI created output DOCX file despite exit code ${result.status}: ${outputFile}`,
        });
    }
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
