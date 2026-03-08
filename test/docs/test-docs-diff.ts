
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const buildCommands = [
    'npm run build-cli',
    //'npm run build-api',
];


async function main() {

    let revision: string | undefined = process.argv[2];

    showHeader('Building current source code');
    for (let cmd of buildCommands) {
        execSync(cmd, { stdio: 'inherit' });
    }

    showHeader('Running tests for current source code');
    execSync('npm run test-docs', { stdio: 'inherit' });

    showHeader('Checkout and initialize previous version');
    fs.mkdirSync('test/outputs', { recursive: true });
    fs.rmSync('test/outputs/old-git', { recursive: true, force: true });
    execSync('git clone ../../ old-git', { stdio: 'inherit', cwd: 'test/outputs' });
    if (revision) {
        execSync(`git checkout "${revision}"`, { stdio: 'inherit', cwd: 'test/outputs/old-git' });
    }
    execSync('npm ci', { stdio: 'inherit', cwd: 'test/outputs/old-git' });

    showHeader('Building previous version');
    for (let cmd of buildCommands) {
        execSync(cmd, { stdio: 'inherit', cwd: 'test/outputs/old-git' });
    }

    showHeader('Running tests for previous version');
    execSync('npm run test-docs', { stdio: 'inherit', cwd: 'test/outputs/old-git' });

    showHeader('Moving test outputs from previous version to current workspace');
    fs.rmSync('test/outputs/old', { recursive: true, force: true });
    fs.mkdirSync('test/outputs/old', { recursive: true });
    fs.cpSync('test/outputs/old-git/test/outputs/cur', 'test/outputs/old', { recursive: true });

    showHeader('Running tests for current source code against previous tests');
    execSync('npm run test-docs mix test/outputs/old-git/test/docs', { stdio: 'inherit' });

    fs.rmSync('test/outputs/old-git', { recursive: true, force: true });
}


function showHeader(text: string) {
    console.log('\n\x1b[33m' + '='.repeat(80) + '\x1b[0m');
    console.log(' '.repeat((80 - text.length) >> 1) + text);
    console.log('\x1b[33m' + '='.repeat(80) + '\x1b[0m\n');
}

main();
