
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { getArgs } from './common';

const buildCommands = [
    'npm run build-cli',
    //'npm run build-api', // TODO: Limit build commands if runners are filtered to speed up the process
];


async function main() {

    let { args, files, runners } = getArgs();

    let filesArg = '';
    if (files.length > 0 || runners.length > 0) {
        filesArg = ' -- ';
        if (runners.length > 0) {
            filesArg += runners.map(r => `-r "${r}"`).join(' ');
        }
        if (files.length > 0) {
            filesArg += ' ' + files.map(f => `-f "${f}"`).join(' ');
        }
    }

    let revision: string | undefined = args[0];

    showHeader('Cleaning up old outputs');
    fs.mkdirSync('test/outputs', { recursive: true });
    fs.rmSync('test/outputs/prev-workspace', { recursive: true, force: true });
    fs.rmSync('test/outputs/cur', { recursive: true, force: true });
    fs.rmSync('test/outputs/old', { recursive: true, force: true });
    fs.rmSync('test/outputs/mix', { recursive: true, force: true });
    for (let file of fs.readdirSync('test/outputs', { encoding: 'utf-8' })) {
        if (file.startsWith('cur-') || file.startsWith('old-') || file.startsWith('mix-')) {
            fs.rmSync(`test/outputs/${file}`, { recursive: true, force: true });
        }
    }

    showHeader('Building current source code');
    for (let cmd of buildCommands) {
        execSync(cmd, { stdio: 'inherit' });
    }

    showHeader('Running tests for current source code');
    execSync(`npm run test-docs ${filesArg}`, { stdio: 'inherit' });

    showHeader('Checkout and initialize previous version');
    fs.mkdirSync('test/outputs', { recursive: true });
    execSync('git clone ../../ prev-workspace', { stdio: 'inherit', cwd: 'test/outputs' });
    if (revision) {
        execSync(`git checkout "${revision}"`, { stdio: 'inherit', cwd: 'test/outputs/prev-workspace' });
    }
    execSync('npm ci', { stdio: 'inherit', cwd: 'test/outputs/prev-workspace' });

    showHeader('Building previous version');
    for (let cmd of buildCommands) {
        execSync(cmd, { stdio: 'inherit', cwd: 'test/outputs/prev-workspace' });
    }

    showHeader('Running tests for previous version');
    execSync(`npm run test-docs ${filesArg} ../../../test/outputs/old`, { stdio: 'inherit', cwd: 'test/outputs/prev-workspace' });

    showHeader('Running tests for current source code against previous tests');
    execSync(`npm run test-docs ${filesArg} test/outputs/mix test/outputs/prev-workspace/test/docs/data${filesArg}`, { stdio: 'inherit' });

    fs.rmSync('test/outputs/prev-workspace', { recursive: true, force: true });
    
    /* STAGE 5:
     * - For those two works, use test cases from before division by runners:
     *   - Group test cases from different versions by id.
     *   - Match test cases where id has changed but input is the same and put them in the same group.
     * - If some group has test cases divided by runners, clone test cases in all versions of this
     *   group and create group for each runner.
     */

    /* STAGE 6:
     * For each group:
     * - If at least one test case is failing, entire group is failing - no more processing needed.
     * - Compare generated PNG and HTML files and categorize group.
     * All possible categories:
     *   error in any => ERROR: tests are failing - check why
     *   OO == NO == NN => SILENT: test passed
     *   OO != NO == NN => ERROR: compatibility broken
     *   OO == NO != NN => WARNING: test modified - check if modification as expected
     *   NN == OO != NO => ERROR: compatibility broken and test modified
     *   NN != OO != NO => ERROR: compatibility broken and test modified
     *   test removed => ERROR: test removed - check why
     *   test added => WARNING: test added - check if results as expected
     * Where:
     *   OO - old code, old tests
     *   NO - new code, old tests
     *   NN - new code, new tests
     */

    /* STAGE 7:
     * - Write a HTML report with all groups
     * - Write a HTML report with failing groups
     * - Write a summary of the results in Markdown format to be used in PR comments
     */

}


function showHeader(text: string) {
    console.log('\n\x1b[33m' + '='.repeat(80) + '\x1b[0m');
    console.log(' '.repeat((80 - text.length) >> 1) + text);
    console.log('\x1b[33m' + '='.repeat(80) + '\x1b[0m\n');
}

main();
