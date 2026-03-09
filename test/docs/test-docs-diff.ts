
import fs from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { cloneTest, dataFileContent, diffHtmlFileName, diffPngFileName, doctmlFileContent, getArgs, htmlFileContent, htmlFileName, infoFileContent, listTestsGrouped, mkdirFor, pngFileName, removeTest } from './common';
import { generateDiffReport } from './report';

const buildCommands = [
    'npm run build-cli',
    //'npm run build-api', // TODO: Limit build commands if runners are filtered to speed up the process
];


async function runTestDocs() {

    let { args, files, runners } = getArgs();

    // Pass filters to test-docs command
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
}


async function main() {

    await runTestDocs();

    /* STAGE 5:
     * - For those two works, use test cases from before division by runners:
     *   - Group test cases from different versions by id.
     *   - Match test cases where id has changed but input is the same and put them in the same bundle.
     * - If some bundle has test cases divided by runners, clone test cases in all versions of this
     *   bundle and create bundle for each runner.
     */

    let bundles = collectTests();

    /* STAGE 6:
     * For each bundle:
     * - If at least one test case is failing, entire bundle is failing - no more processing needed.
     * - Compare generated PNG and HTML files and categorize bundle.
     * All possible categories:
     *   error in any => ERROR: tests are failing - check why
     *   OO == NO == NN => SILENT: test passed
     *   OO != NO == NN => ERROR: compatibility broken
     *   OO == NO != NN => WARNING: test modified - check if modification as expected
     *   NN == OO != NO => ERROR: compatibility broken and test modified
     *   NN != OO != NO => ERROR: compatibility broken and test modified
     *   OO == NO, NN missing => WARNING: test removed - check if removal as expected
     *   OO != NO, NN missing => ERROR: compatibility broken and test removed
     *   test removed => ERROR: test removed - check why
     *   test added => WARNING: test added - check if results as expected
     * Where:
     *   OO - old code, old tests
     *   NO - new code, old tests
     *   NN - new code, new tests
     */

    for (let bundle of bundles) {
        if (bundle.oldId && bundle.mixId) {
            bundle.diffOldMix = !compareTests(bundle.oldId, 'old', bundle.mixId, 'mix');
        }
        if (bundle.mixId && bundle.curId) {
            bundle.diffMixCur = !compareTests(bundle.mixId, 'mix', bundle.curId, 'cur');
        }
        if (bundle.curId && bundle.oldId) {
            bundle.diffCurOld = !compareTests(bundle.curId, 'cur', bundle.oldId, 'old');
        }
    }

    /* STAGE 7:
     * - Write a HTML report with all groups
     * - Write a HTML report with failing groups
     * - Write a summary of the results in Markdown format to be used in PR comments
     */
    generateDiffReport(bundles);

}

function compareTests(aId: string, aRoot: string, bId: string, bRoot: string): boolean {
    if (aId === bId) {
        console.log(`Comparing ${aRoot} with ${bRoot} for ${aId}...`);
    } else {
        console.log(`Comparing ${aRoot} (${aId}) with ${bRoot} (${bId})...`);
    }
    let aHtml = fs.existsSync(htmlFileName(aId, aRoot)) ? htmlFileContent(aId, aRoot) : '';
    let bHtml = fs.existsSync(htmlFileName(bId, bRoot)) ? htmlFileContent(bId, bRoot) : '';
    let aFile = `test/outputs/_tmp/html-compare-${aRoot}-${aId}.html`;
    let bFile = `test/outputs/_tmp/html-compare-${bRoot}-${bId}.html`;
    fs.mkdirSync('test/outputs/_tmp', { recursive: true });
    fs.writeFileSync(aFile, aHtml);
    fs.writeFileSync(bFile, bHtml);

    let res = spawnSync('git', ['diff', '--exit-code', '--no-index', '--color=never', aFile, bFile],
        { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    let diffHtml = res.stdout ?? '';
    if (res.error) {
        diffHtml += `\nError executing git diff: ${res.error}`;
    } else if ((res.status ?? 128) > 1) {
        diffHtml += `\nProcess exit code ${res.status}`;
    } else if (res.status === 1 && !diffHtml.trim()) {
        diffHtml += 'Files differ but no diff output';
    } else if (res.status === 0) {
        diffHtml = '';
    }
    diffHtml = diffHtml.trim();

    let diffHtmlFile = diffHtmlFileName(aId, aRoot);
    if (diffHtml) {
        fs.writeFileSync(diffHtmlFile, diffHtml);
    } else {
        fs.rmSync(diffHtmlFile, { force: true });
    }

    let aPng = pngFileName(aId, aRoot);
    let bPng = pngFileName(bId, bRoot);
    let diffPng = diffPngFileName(aId, aRoot);
    fs.rmSync(diffPng, { force: true });
    if (!fs.existsSync(aPng)) {
        aPng = 'test/docs/data/include/images/white.png';
    }
    if (!fs.existsSync(bPng)) {
        bPng = 'test/docs/data/include/images/white.png';
    }

    res = spawnSync('magick', ['compare', '-metric', 'PAE', '-highlight-color', '#DD0044', aPng, bPng, diffPng],
        { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    if (res.error) {
        res = spawnSync('compare', ['-metric', 'PAE', '-highlight-color', '#DD0044', aPng, bPng, diffPng],
            { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    }

    let theSame;
    if (res.error) {
        console.error(`Error executing compare: ${res.error}`);
        theSame = false;
    } else if ((res.status ?? 128) > 1) {
        console.error(`Process exit code ${res.status}`);
        theSame = false;
    } else if (res.status === 1) {
        theSame = false;
    } else {
        theSame = true;
    }
    let exists = fs.existsSync(diffPng);
    if (theSame && exists) {
        fs.rmSync(diffPng);
    } else if (!theSame && !exists) {
        fs.copyFileSync('test/docs/data/include/images/red.png', diffPng);
    }

    console.log(`    HTML: ${diffHtml ? 'different' : 'same'}, PNG: ${theSame ? 'same' : 'different'}`);
    
    return theSame && !diffHtml;
}


function showHeader(text: string) {
    console.log('\n\x1b[33m' + '='.repeat(80) + '\x1b[0m');
    console.log(' '.repeat((80 - text.length) >> 1) + text);
    console.log('\x1b[33m' + '='.repeat(80) + '\x1b[0m\n');
}

export interface TestBundle {
    curId?: string;
    oldId?: string;
    mixId?: string;
    diffOldMix?: boolean;
    diffMixCur?: boolean;
    diffCurOld?: boolean;
}

function collectTests(): TestBundle[] {
    interface TestGroup {
        groupId: string;
        ids: string[];
    }

    interface TestGroupBundle {
        cur?: TestGroup;
        old?: TestGroup;
        mix?: TestGroup;
    }

    function runnerFromId(id?: string) {
        return id ? id.match(/.[a-z0-9]{16}-([a-z0-9]+)?$/)?.[1] : undefined;
    }

    function collectRunners(group?: TestGroup) {
        let runners = new Set<string>();
        if (!group) return runners;
        for (let id of group.ids) {
            let runner = runnerFromId(id);
            if (runner) {
                runners.add(runner);
            }
        }
        return runners;
    }

    function addToPartialBundles(partialBundles: { [contentKey: string]: Set<TestGroupBundle> }, bundle: TestGroupBundle, group: TestGroup, root: string) {
        let test = infoFileContent(group.ids[0], root);
        let contentKey = test.expectedErrors.join('|||');
        contentKey += '|||' + doctmlFileContent(group.ids[0], root);
        try {
            contentKey += '|||' + JSON.stringify(JSON.parse(dataFileContent(group.ids[0], root)));
        } catch {
            // If JSON is invalid, do not try to bundle this test case with others.
            return;
        }
        partialBundles[contentKey] = partialBundles[contentKey] ?? new Set();
        partialBundles[contentKey].add(bundle);
    }


    // Get tests from all versions
    let testsCur = listTestsGrouped('cur');
    let testsOld = listTestsGrouped('old');
    let testsMix = listTestsGrouped('mix');
    // Put tests with the same baseId in the same bundle
    let bundlesById: { [groupId: string]: TestGroupBundle } = {};
    for (let [groupId, ids] of Object.entries(testsCur)) {
        bundlesById[groupId] = bundlesById[groupId] ?? {};
        bundlesById[groupId].cur = { groupId, ids };
    }
    for (let [groupId, ids] of Object.entries(testsOld)) {
        bundlesById[groupId] = bundlesById[groupId] ?? {};
        bundlesById[groupId].old = { groupId, ids };
    }
    for (let [groupId, ids] of Object.entries(testsMix)) {
        bundlesById[groupId] = bundlesById[groupId] ?? {};
        bundlesById[groupId].mix = { groupId, ids };
    }
    // Map partial bundles with their content
    let bundles = new Set<TestGroupBundle>(Object.values(bundlesById));
    let partialBundles: { [contentKey: string]: Set<TestGroupBundle> } = {};
    for (let bundle of bundles) {
        if (bundle.cur && bundle.old && bundle.mix) {
            continue;
        }
        if (bundle.cur) {
            addToPartialBundles(partialBundles, bundle, bundle.cur, 'cur');
        }
        if (bundle.old) {
            addToPartialBundles(partialBundles, bundle, bundle.old, 'old');
        }
        if (bundle.mix) {
            addToPartialBundles(partialBundles, bundle, bundle.mix, 'mix');
        }
    }
    // Bundle test with different ids but the same content together, starting with those that have matching 3 versions, then 2 versions.
    for (let matches of [3, 2]) {
        for (let bundleSet of Object.values(partialBundles)) {
            let curCount = 0;
            let oldCount = 0;
            let mixCount = 0;
            let unused = [...bundleSet].filter(b => bundles.has(b));
            for (let bundle of unused) {
                if (bundle.cur) curCount++;
                if (bundle.old) oldCount++;
                if (bundle.mix) mixCount++;
            }
            if ((curCount + oldCount + mixCount) == matches && curCount <= 1 && oldCount <= 1 && mixCount <= 1) {
                let newBundle: TestGroupBundle = {};
                for (let bundle of unused) {
                    if (bundle.cur) newBundle.cur = bundle.cur;
                    if (bundle.old) newBundle.old = bundle.old;
                    if (bundle.mix) newBundle.mix = bundle.mix;
                    bundles.delete(bundle);
                }
                bundles.add(newBundle);
            }
        }
    }
    // If in one group bundle there are test cases with and without separation by runners, force separation to all.
    for (let bundle of bundles) {
        let curRunners = collectRunners(bundle.cur);
        let oldRunners = collectRunners(bundle.old);
        let mixRunners = collectRunners(bundle.mix);
        let allRunners = new Set<string>([...curRunners, ...oldRunners, ...mixRunners]);
        if (allRunners.size === 0) continue;
        for (let [group, runners, root] of [[bundle.cur, curRunners, 'cur'], [bundle.old, oldRunners, 'old'], [bundle.mix, mixRunners, 'mix']] as [TestGroup | undefined, Set<string>, string][]) {
            if (!group || runners.size > 0 || group.ids.length !== 1) continue;
            for (let runner of allRunners) {
                cloneTest(group.ids[0], `${group.ids[0]}-${runner}`, root); // TODO: Regenerate test-docs reports if at least one test is cloned
            }
            removeTest(group.ids[0], root);
            group.ids = [...allRunners].map(runner => `${group.ids[0]}-${runner}`);
        }
        console.log({ groupId: bundle.cur?.groupId, runners: [...allRunners] });
    }
    // Create final bundles with single test case for each version.
    let result: TestBundle[] = [];
    for (let bundle of bundles) {
        let bundleByRunner: { [runner: string]: TestBundle } = {};
        for (let id of bundle.cur?.ids || []) {
            let runner = runnerFromId(id) ?? '';
            bundleByRunner[runner] = { curId: id };
        }
        for (let id of bundle.old?.ids || []) {
            let runner = runnerFromId(id) ?? '';
            bundleByRunner[runner] = bundleByRunner[runner] ?? {};
            bundleByRunner[runner].oldId = id;
        }
        for (let id of bundle.mix?.ids || []) {
            let runner = runnerFromId(id) ?? '';
            bundleByRunner[runner] = bundleByRunner[runner] ?? {};
            bundleByRunner[runner].mixId = id;
        }
        result.push(...Object.values(bundleByRunner));
    }
    return result;
}

main();
