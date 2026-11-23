import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTestCases, TestCase } from './case-parser';
import { finalizeRunner, getRunnerDirectory } from './runners-common';


const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const maxBuffer = 50 * 1024 * 1024;

function runCommand(command: string, args: string[], cwd: string) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        maxBuffer,
        shell: process.platform === 'win32',
    });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error([
            `Command failed: ${command} ${args.join(' ')}`,
            result.stdout,
            result.stderr,
        ].filter(Boolean).join('\n'));
    }
    return result;
}

function createPackageWorkspace(runnerName: string, moduleFormat: 'cjs' | 'esm'): string {
    const workspace = path.join(projectRoot, 'artifacts/temp', `test-runner-${runnerName}`);
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.mkdirSync(workspace, { recursive: true });
    fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({
        name: `doctml-conformance-${moduleFormat}`,
        private: true,
        type: moduleFormat === 'cjs' ? 'commonjs' : 'module',
    }, null, 4) + '\n', 'utf8');

    const helperName = moduleFormat === 'cjs' ? 'run-api.cjs' : 'run-api.mjs';
    fs.copyFileSync(
        path.join(projectRoot, 'test/conformance/src/helpers', helperName),
        path.join(workspace, helperName)
    );
    return workspace;
}

function buildAndPack(): string {
    runCommand('npm', ['run', 'build-api'], projectRoot);
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
        name: string;
        version: string;
    };
    const previousTarballs = new Set(fs.readdirSync(projectRoot).filter(file => file.endsWith('.tgz')));
    const result = runCommand('npm', ['pack', '--json', '--pack-destination', projectRoot], projectRoot);
    let filename: string | undefined;
    try {
        const output: unknown = JSON.parse(result.stdout);
        const entries = Array.isArray(output) ? output : [output];
        const packed = entries.find(entry =>
            entry !== null && typeof entry === 'object' &&
            'filename' in entry && typeof entry.filename === 'string'
        ) as { filename: string } | undefined;
        filename = packed?.filename;
    } catch {
        // Some npm versions write non-JSON notices alongside the pack result.
    }

    if (!filename) {
        const expectedName = `${packageJson.name.replace(/^@/, '').replace(/\//g, '-')}-${packageJson.version}.tgz`;
        const expectedPath = path.join(projectRoot, expectedName);
        const newTarballs = fs.readdirSync(projectRoot)
            .filter(file => file.endsWith('.tgz') && !previousTarballs.has(file));
        filename = fs.existsSync(expectedPath) ? expectedName : newTarballs.length === 1 ? newTarballs[0] : undefined;
    }
    if (!filename) {
        throw new Error(`npm pack did not report or create a package archive. Output: ${result.stdout}`);
    }
    const tarball = path.resolve(projectRoot, filename);
    if (!fs.existsSync(tarball)) {
        throw new Error(`npm pack did not create the package archive: ${tarball}`);
    }
    return tarball;
}

function installPackage(workspace: string, tarball: string): void {
    runCommand('npm', ['install', '--no-audit', '--no-fund', tarball], workspace);
}

function runTestCase(testCase: TestCase, workspace: string, moduleFormat: 'cjs' | 'esm'): void {
    const inputFile = path.resolve(testCase.dir, `${testCase.id}.doctml`);
    const templateDataFile = path.join(testCase.dir, `${testCase.id}-data.json`);
    const dataFile = fs.existsSync(templateDataFile)
        ? path.resolve(templateDataFile)
        : path.resolve(testCase.dir, 'include/empty.json');
    const outputFile = path.resolve(testCase.getOutputFile('docx'));
    const script = path.join(workspace, moduleFormat === 'cjs' ? 'run-api.cjs' : 'run-api.mjs');

    fs.rmSync(outputFile, { force: true });
    const result = spawnSync(process.execPath, [script, inputFile, dataFile, outputFile], {
        cwd: workspace,
        encoding: 'utf8',
        maxBuffer,
    });
    if (result.error) {
        testCase.runStatus = false;
        testCase.errors.push({ message: result.error.message });
        return;
    }
    if (result.stderr) {
        testCase.errors.push({ message: result.stderr });
    }
    testCase.runStatus = result.status ?? false;
}

export async function runPackageRunner(runnerName: 'cjs' | 'esm', moduleFormat: 'cjs' | 'esm'): Promise<void> {
    const dir = path.resolve(projectRoot, getRunnerDirectory(runnerName));
    let tarball: string | undefined;

    try {
        tarball = buildAndPack();
        const workspace = createPackageWorkspace(runnerName, moduleFormat);
        installPackage(workspace, tarball);

        const cases = Object.values(createTestCases(dir));
        for (let i = 0; i < cases.length; i++) {
            const testCase = cases[i];
            try {
                console.log(`Execute case ${i + 1} of ${cases.length}: ${testCase.getOutputFile('doctml')}`);
                runTestCase(testCase, workspace, moduleFormat);
            } catch (ex) {
                console.log(`    Unexpected exception: ${ex}`);
                testCase.errors.push({ message: `Unexpected exception: ${ex}` });
            }
        }
        await finalizeRunner(runnerName, dir, cases);
    } catch (ex) {
        console.error(`Unable to run ${runnerName.toUpperCase()} package conformance tests: ${ex}`);
        process.exitCode = 10;
    } finally {
        if (tarball) {
            fs.rmSync(tarball, { force: true });
        }
    }
}
